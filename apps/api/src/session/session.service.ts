import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateSessionDto, JoinSessionDto } from './session.dto';
import { LlmService } from '../llm/llm.service';
import { CodeGeneratorService } from './code-generator.service';
import { normalizeRoomCode } from './code-normalizer';
import {
  Category,
  CreateSessionResponse,
  JoinSessionErrorCode,
  JoinSessionResponse,
  MySessionsResponse,
  PlayerRole,
  QUESTION_TYPES,
  QuestionType,
  RegenerateCodeResponse,
  Result,
  SESSION_STATUSES,
  SessionStateResponse,
} from '@youandi/shared';
import {
  JoinRateLimitService,
  JoinRateLimitException,
} from './join-rate-limit.service';
import { JoinSessionException } from './join-session.exception';

const CODE_TTL_MS = 10 * 60 * 1000;
const RECENT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isLegacySessionIdJoinEnabled(): boolean {
  return process.env.ALLOW_LEGACY_SESSION_ID_JOIN_BODY !== 'false';
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly rateLimit: JoinRateLimitService,
  ) {}

  async create(
    dto: CreateSessionDto,
    deviceId: string,
  ): Promise<CreateSessionResponse> {
    const player1Id = uuidv4();
    const now = new Date();
    const codeExpiresAt = new Date(now.getTime() + CODE_TTL_MS);

    const session = await this.prisma.session.create({
      data: {
        category: dto.category,
        questionCount: dto.questionCount,
        status: SESSION_STATUSES.WAITING,
        codeExpiresAt,
        lastActivityAt: now,
        players: {
          create: {
            playerId: player1Id,
            role: 'player1',
            deviceId,
            joinedAt: now,
          },
        },
      },
    });

    const code = await this.codeGenerator.generateAndAssign(session.id);

    const questions = await this.generateQuestions(
      session.id,
      dto.category,
      dto.questionCount,
    );

    return {
      sessionId: session.id,
      playerId: player1Id,
      code,
      questionIds: questions.map((q) => q.id),
    };
  }

  private async generateQuestions(
    sessionId: string,
    category: Category,
    count: number,
  ) {
    const categoryLabels: Record<string, string> = {
      love: 'romantic love & relationships',
      friendship: 'friendship & platonic bonds',
      deep_talk: 'deep conversations & philosophy',
      fun: 'fun, lighthearted & pop culture',
      spicy: 'bold, daring & spicy topics',
    };

    const categoryLabel = categoryLabels[category] || category;

    const prompt = `You are a quiz designer for a viral compatibility app called "you&i".

Generate exactly ${count} compatibility quiz questions for the category: "${categoryLabel}".

Guidelines:
- Context: Keep the vibe modern, universal, and Gen Z. You can sprinkle in a very light, subtle hint of Indian context occasionally if it fits naturally, but do not force it or make it purely cultural.
- Goal: Make the questions explorative to help two people know each other on a deeper level. Ask about values, conflict resolution, lifestyle, and quirks.
- Each question tests compatibility between two people.
- Make them fun, engaging, and lighthearted.
- Use emojis in the answer options.
- Most questions should be MCQ (multiple choice with exactly 4 options).
- Include 1-2 open-ended text questions for deeper connection.
- Keep the tone playful and modern.

SECURITY & CONSTRAINTS:
- Do not include any offensive, hate speech, or politically sensitive content.
- Output MUST be strictly valid JSON and nothing else.
- Do not repeat the questions and make sure they arent just repharse from the category name.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
[
  {
    "text": "question text here?",
    "type": "mcq",
    "options": ["Option A 🎯", "Option B 💫", "Option C 🔥", "Option D ✨"]
  },
  {
    "text": "open ended question here?",
    "type": "text",
    "options": null
  }
]`;

    try {
      const text = await this.llmService.generateContent(prompt);

      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to parse question generation response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        text: string;
        type: QuestionType;
        options: string[] | null;
      }>;
      console.log('LLM OUTPUT: ', parsed);

      // Store questions in database linked to this session
      const createdQuestions = [];
      for (const q of parsed) {
        const question = await this.prisma.question.create({
          data: {
            sessionId,
            text: q.text,
            type: q.type || QUESTION_TYPES.MCQ,
            options: q.options ? JSON.stringify(q.options) : null,
          },
        });
        createdQuestions.push(question);
      }

      return createdQuestions;
    } catch (error) {
      console.error('Question generation error:', error);

      // Fallback: create basic questions if Gemini fails
      const fallbackQuestions = this.getFallbackQuestions(category, count);
      const createdQuestions = [];
      for (const q of fallbackQuestions) {
        const question = await this.prisma.question.create({
          data: {
            sessionId,
            text: q.text,
            type: q.type,
            options: q.options ? JSON.stringify(q.options) : null,
          },
        });
        createdQuestions.push(question);
      }
      return createdQuestions;
    }
  }

  private getFallbackQuestions(category: Category, count: number) {
    const defaults: Record<
      string,
      Array<{ text: string; type: QuestionType; options: string[] | null }>
    > = {
      love: [
        {
          text: 'Ideal weekend date in the city?',
          type: 'mcq',
          options: [
            'Late night drive & chai ☕',
            'Fancy cafe hopping 🍰',
            'Staying in & ordering Biryani 🍛',
            'Exploring historical monuments 🏰',
          ],
        },
        {
          text: 'How do you handle conflict in a relationship?',
          type: 'mcq',
          options: [
            'Need space to cool off 🚶',
            'Talk it out immediately 🗣️',
            'Passive aggressive silence 😶',
            'Write a long paragraph 📱',
          ],
        },
        {
          text: 'Thoughts on traditional big fat desi weddings?',
          type: 'mcq',
          options: [
            'Love the drama & dancing 💃',
            'Too exhausting, prefer intimate 🌿',
            'Only for the food 🥘',
            'Court marriage & honeymoon ticket ✈️',
          ],
        },
        {
          text: "What's a non-negotiable trait you need in a partner?",
          type: 'text',
          options: null,
        },
        {
          text: 'How do you express affection?',
          type: 'mcq',
          options: [
            'Roasting them 🙃',
            'Physical touch 🤗',
            'Random small gifts 🎁',
            'Words of affirmation 📝',
          ],
        },
      ],
      friendship: [
        {
          text: 'If we took a trip to Goa, what is your role?',
          type: 'mcq',
          options: [
            'The planner 📋',
            'The one who cancels 🤡',
            'The party animal 🎉',
            'The one finding aesthetic cafes 📸',
          ],
        },
        {
          text: 'How often do best friends need to talk?',
          type: 'mcq',
          options: [
            'Every single day 📞',
            'Once a week is fine 📆',
            'We can talk after months & vibe 🌊',
            'Only through reels 📱',
          ],
        },
        {
          text: 'What makes a friendship last forever?',
          type: 'mcq',
          options: [
            'Shared trauma 😂',
            'Brutal honesty 💯',
            'Unconditional support 🤝',
            'Similar sense of humor 🎭',
          ],
        },
        {
          text: 'You find out someone is talking trash about your friend. You:',
          type: 'mcq',
          options: [
            'Fight them instantly 🥊',
            'Tell the friend to handle it 🧘',
            'Gather screenshots & evidence 🕵️',
            'Ignore it, drama is toxic 🚫',
          ],
        },
        {
          text: "What's the best memory you have with a close friend?",
          type: 'text',
          options: null,
        },
      ],
      deep_talk: [
        {
          text: "What's your biggest fear about the future?",
          type: 'mcq',
          options: [
            'Not achieving my dreams 📉',
            'Ending up alone 🌑',
            'Losing my parents 👨‍👩‍👧',
            'Living a mediocre life ⏳',
          ],
        },
        {
          text: 'How much does your family influence your life choices?',
          type: 'mcq',
          options: [
            'They make the final call 👨‍⚖️',
            'I value their advice heavily 🤝',
            'I do my own thing mostly 🚶',
            'Complete rebel 🎸',
          ],
        },
        {
          text: 'Do you believe in the concept of "log kya kahenge" (what will people say)?',
          type: 'mcq',
          options: [
            'Sadly, yes it affects me 🫣',
            'Not anymore, broke that cycle 🦋',
            'Only for major life events 🎭',
            'Never cared 🖕',
          ],
        },
        {
          text: 'What brings you true peace?',
          type: 'mcq',
          options: [
            'Financial freedom 💰',
            'A loving family 🏡',
            'Traveling solo 🎒',
            'Creating art/passion 🎨',
          ],
        },
        {
          text: 'If you could change one thing about how you were raised, what would it be?',
          type: 'text',
          options: null,
        },
      ],
      fun: [
        {
          text: 'Your go-to street food order?',
          type: 'mcq',
          options: [
            'Spicy Momos 🥟',
            'Pani Puri / Golgappe 🥙',
            'Vada Pav 🍔',
            'Chole Bhature 🍛',
          ],
        },
        {
          text: 'Pick your Bollywood aesthetic:',
          type: 'mcq',
          options: [
            'YJHD trekking vibes 🏔️',
            'ZNMD road trip 🚗',
            'Geet from Jab We Met 🚂',
            'Main Hoon Na college drama 🎒',
          ],
        },
        {
          text: 'If you won 1 Crore in a lottery, first thing you do?',
          type: 'mcq',
          options: [
            'Invest it quietly 📈',
            'World tour ✈️',
            'Buy a house 🏡',
            'Buy useless luxury things 🛍️',
          ],
        },
        {
          text: "What's your most toxic habit?",
          type: 'mcq',
          options: [
            'Scrolling reels till 3 AM 📱',
            'Skipping meals 🚫',
            'Overthinking small texts 🌀',
            'Impulse shopping 💸',
          ],
        },
        {
          text: 'Describe your perfect lazy Sunday.',
          type: 'mcq',
          options: [
            'Sleeping till noon 😴',
            'Binge-watching a show 📺',
            'Deep cleaning the room 🧹',
            'Brunch with friends 🥞',
          ],
        },
      ],
      spicy: [
        {
          text: "What's the biggest red flag you've ignored?",
          type: 'mcq',
          options: [
            "Mama's boy/girl 🚩",
            'Still talks to their ex 📱',
            'Anger issues 😡',
            'Bad tipper 💸',
          ],
        },
        {
          text: "Thoughts on snooping through a partner's phone?",
          type: 'mcq',
          options: [
            'Absolute breach of trust 🚫',
            'Okay if I have suspicion 🕵️',
            "We should know each other's passcodes 🔓",
            "I'd rather not know 🙈",
          ],
        },
        {
          text: 'How soon is too soon to say "I love you"?',
          type: 'mcq',
          options: [
            'First week 🏃',
            'First month ⏱️',
            'After 6 months 🐢',
            'When it feels right ✨',
          ],
        },
        {
          text: "What's the most scandalous thing you'd forgive?",
          type: 'mcq',
          options: [
            'Emotional cheating 🎭',
            'Lying about finances 💰',
            'A drunken mistake 🍷',
            'None, I walk away 🚪',
          ],
        },
        {
          text: "What's a secret you've never told your family?",
          type: 'text',
          options: null,
        },
      ],
    };

    const categoryQuestions = defaults[category] || defaults['fun'];
    // Repeat questions if count exceeds available fallbacks
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(categoryQuestions[i % categoryQuestions.length]);
    }
    return result;
  }

  async join(
    dto: JoinSessionDto,
    deviceId: string,
    ip: string | undefined,
  ): Promise<JoinSessionResponse> {
    if (dto.sessionId) {
      if (!isLegacySessionIdJoinEnabled()) {
        throw new BadRequestException(
          'sessionId body is deprecated; send a room code',
        );
      }
      return this.joinBySessionId(
        dto.sessionId,
        dto.passAndPlay ?? false,
        deviceId,
        ip,
      );
    }

    return this.joinByCode(
      dto.code ?? '',
      dto.passAndPlay ?? false,
      deviceId,
      ip,
    );
  }

  private async joinByCode(
    rawCode: string,
    passAndPlay: boolean,
    deviceId: string,
    ip: string | undefined,
  ): Promise<JoinSessionResponse> {
    try {
      await this.rateLimit.assertNotRateLimited(deviceId, ip);
    } catch (error) {
      if (error instanceof JoinRateLimitException) {
        this.rateLimit.recordMetric('RATE_LIMITED');
        throw new JoinSessionException('RATE_LIMITED');
      }
      throw error;
    }

    const code = normalizeRoomCode(rawCode);
    if (code.length !== 6) {
      await this.rateLimit.recordFailure(deviceId, ip, 'CODE_NOT_FOUND');
      throw new JoinSessionException('CODE_NOT_FOUND');
    }

    const now = new Date();

    const session = await this.prisma.session.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!session) {
      await this.rateLimit.recordFailure(deviceId, ip, 'CODE_NOT_FOUND');
      throw new JoinSessionException('CODE_NOT_FOUND');
    }

    const existingPlayer = session.players.find((p) => p.deviceId === deviceId);
    if (existingPlayer) {
      if (existingPlayer.role === 'player1' && !passAndPlay) {
        await this.rateLimit.recordFailure(deviceId, ip, 'SELF_JOIN');
        throw new JoinSessionException('SELF_JOIN');
      }
      if (existingPlayer.role === 'player2') {
        await this.rateLimit.clearFailures(deviceId, ip);
        return this.buildJoinResponse(session, existingPlayer);
      }
    }

    const player1 = session.players.find((p) => p.role === 'player1');
    if (player1?.deviceId === deviceId && !passAndPlay) {
      await this.rateLimit.recordFailure(deviceId, ip, 'SELF_JOIN');
      throw new JoinSessionException('SELF_JOIN');
    }

    const preflightReason = this.classifyJoinFailure(
      session,
      deviceId,
      passAndPlay,
    );
    if (preflightReason) {
      await this.rateLimit.recordFailure(deviceId, ip, preflightReason);
      throw new JoinSessionException(preflightReason);
    }

    const player2Id = uuidv4();
    const [claimed] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        category: string;
        questionCount: number;
        playerId: string;
      }>
    >(
      Prisma.sql`
        WITH candidate AS (
          SELECT s.id
          FROM "Session" s
          WHERE s.code = ${code}
            AND s.status = ${SESSION_STATUSES.WAITING}
            AND s."codeExpiresAt" > ${now}
            AND NOT EXISTS (
              SELECT 1 FROM "SessionPlayer" p
              WHERE p."sessionId" = s.id AND p.role = 'player2'
            )
        ),
        new_player AS (
          INSERT INTO "SessionPlayer" (
            "id", "sessionId", "playerId", "role", "deviceId", "joinedAt"
          )
          SELECT gen_random_uuid(), c.id, ${player2Id}, 'player2', ${deviceId}, ${now}
          FROM candidate c
          ON CONFLICT ("sessionId", role) DO NOTHING
          RETURNING "sessionId", "playerId"
        ),
        updated_session AS (
          UPDATE "Session" s
          SET status = ${SESSION_STATUSES.ACTIVE},
              code = NULL,
              "codeExpiresAt" = NULL,
              "startedAt" = ${now},
              "lastActivityAt" = ${now}
          FROM new_player np
          WHERE s.id = np."sessionId"
          RETURNING s.id, s.category, s."questionCount", np."playerId"
        )
        SELECT * FROM updated_session
      `,
    );

    if (claimed) {
      await this.rateLimit.clearFailures(deviceId, ip);
      return {
        sessionId: claimed.id,
        playerId: claimed.playerId,
        role: 'player2',
        category: claimed.category as Category,
        questionCount: claimed.questionCount,
      };
    }

    // Lost the race or the state changed between the read and the claim.
    // Re-query by id so we can return a specific reason even if the code
    // was just nulled.
    const current = await this.prisma.session.findUnique({
      where: { id: session.id },
      include: { players: true },
    });

    if (!current) {
      await this.rateLimit.recordFailure(deviceId, ip, 'CODE_NOT_FOUND');
      throw new JoinSessionException('CODE_NOT_FOUND');
    }

    const racePlayer = current.players.find((p) => p.deviceId === deviceId);
    if (racePlayer) {
      await this.rateLimit.clearFailures(deviceId, ip);
      return this.buildJoinResponse(current, racePlayer);
    }

    const raceReason = this.classifyJoinFailure(current, deviceId, passAndPlay);
    const reason: JoinSessionErrorCode = raceReason ?? 'SESSION_FULL';
    await this.rateLimit.recordFailure(deviceId, ip, reason);
    throw new JoinSessionException(reason);
  }

  private async joinBySessionId(
    sessionId: string,
    passAndPlay: boolean,
    deviceId: string,
    ip: string | undefined,
  ): Promise<JoinSessionResponse> {
    try {
      await this.rateLimit.assertNotRateLimited(deviceId, ip);
    } catch (error) {
      if (error instanceof JoinRateLimitException) {
        this.rateLimit.recordMetric('RATE_LIMITED');
        throw new JoinSessionException('RATE_LIMITED');
      }
      throw error;
    }

    const now = new Date();

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });

    if (!session) {
      await this.rateLimit.recordFailure(deviceId, ip, 'CODE_NOT_FOUND');
      throw new NotFoundException('Session not found');
    }

    const existingPlayer = session.players.find((p) => p.deviceId === deviceId);
    if (existingPlayer) {
      if (existingPlayer.role === 'player1' && !passAndPlay) {
        await this.rateLimit.recordFailure(deviceId, ip, 'SELF_JOIN');
        throw new JoinSessionException('SELF_JOIN');
      }
      if (existingPlayer.role === 'player2') {
        await this.rateLimit.clearFailures(deviceId, ip);
        return this.buildJoinResponse(session, existingPlayer);
      }
      // pass-and-play: existing player1 is allowed to claim player2.
    }

    const preflightReason = this.classifyJoinFailure(
      session,
      deviceId,
      passAndPlay,
    );
    if (preflightReason) {
      await this.rateLimit.recordFailure(deviceId, ip, preflightReason);
      throw new JoinSessionException(preflightReason);
    }

    const player2Id = uuidv4();
    const [claimed] = await this.prisma.$queryRaw<
      Array<{
        id: string;
        category: string;
        questionCount: number;
        playerId: string;
      }>
    >(
      Prisma.sql`
        WITH candidate AS (
          SELECT s.id
          FROM "Session" s
          WHERE s.id = ${sessionId}
            AND s.status = ${SESSION_STATUSES.WAITING}
            AND NOT EXISTS (
              SELECT 1 FROM "SessionPlayer" p
              WHERE p."sessionId" = s.id AND p.role = 'player2'
            )
        ),
        new_player AS (
          INSERT INTO "SessionPlayer" (
            "id", "sessionId", "playerId", "role", "deviceId", "joinedAt"
          )
          SELECT gen_random_uuid(), c.id, ${player2Id}, 'player2', ${deviceId}, ${now}
          FROM candidate c
          ON CONFLICT ("sessionId", role) DO NOTHING
          RETURNING "sessionId", "playerId"
        ),
        updated_session AS (
          UPDATE "Session" s
          SET status = ${SESSION_STATUSES.ACTIVE},
              code = NULL,
              "codeExpiresAt" = NULL,
              "startedAt" = ${now},
              "lastActivityAt" = ${now}
          FROM new_player np
          WHERE s.id = np."sessionId"
          RETURNING s.id, s.category, s."questionCount", np."playerId"
        )
        SELECT * FROM updated_session
      `,
    );

    if (claimed) {
      await this.rateLimit.clearFailures(deviceId, ip);
      return {
        sessionId: claimed.id,
        playerId: claimed.playerId,
        role: 'player2',
        category: claimed.category as Category,
        questionCount: claimed.questionCount,
      };
    }

    const current = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });

    if (!current) {
      throw new NotFoundException('Session not found');
    }

    const racePlayer = current.players.find((p) => p.deviceId === deviceId);
    if (racePlayer) {
      await this.rateLimit.clearFailures(deviceId, ip);
      return this.buildJoinResponse(current, racePlayer);
    }

    const raceReason = this.classifyJoinFailure(current, deviceId, false);
    const reason: JoinSessionErrorCode = raceReason ?? 'SESSION_FULL';
    await this.rateLimit.recordFailure(deviceId, ip, reason);
    throw new JoinSessionException(reason);
  }

  private classifyJoinFailure(
    session: {
      status: string;
      codeExpiresAt: Date | null;
      players: { role: string; deviceId: string | null }[];
    },
    deviceId: string,
    passAndPlay: boolean,
  ): JoinSessionErrorCode | null {
    const now = new Date();

    if (session.status !== SESSION_STATUSES.WAITING) {
      if (session.status === SESSION_STATUSES.ACTIVE) {
        const player2 = session.players.find((p) => p.role === 'player2');
        if (player2) {
          return player2.deviceId === deviceId
            ? 'ALREADY_JOINED'
            : 'SESSION_FULL';
        }
        return 'SESSION_FULL';
      }
      return 'SESSION_FINISHED';
    }

    if (session.codeExpiresAt && session.codeExpiresAt < now) {
      return 'CODE_EXPIRED';
    }

    const player1 = session.players.find((p) => p.role === 'player1');
    if (player1?.deviceId === deviceId && !passAndPlay) {
      return 'SELF_JOIN';
    }

    const player2 = session.players.find((p) => p.role === 'player2');
    if (player2) {
      return player2.deviceId === deviceId ? 'ALREADY_JOINED' : 'SESSION_FULL';
    }

    return null;
  }

  private buildJoinResponse(
    session: { id: string; category: string; questionCount: number },
    player: { playerId: string; role: string },
  ): JoinSessionResponse {
    return {
      sessionId: session.id,
      playerId: player.playerId,
      role: player.role as PlayerRole,
      category: session.category as Category,
      questionCount: session.questionCount,
    };
  }

  async regenerateCode(
    sessionId: string,
    deviceId: string,
  ): Promise<RegenerateCodeResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const player1 = session.players.find((p) => p.role === 'player1');
    if (player1?.deviceId !== deviceId) {
      throw new BadRequestException('Only the host can regenerate the code');
    }

    if (session.status !== SESSION_STATUSES.WAITING) {
      throw new BadRequestException(
        'Code can only be regenerated while waiting',
      );
    }

    const code = await this.codeGenerator.generateAndAssign(sessionId);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        codeExpiresAt: expiresAt,
        lastActivityAt: new Date(),
      },
    });

    return { code, expiresAt: expiresAt.toISOString() };
  }

  async deleteSession(sessionId: string, deviceId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const player1 = session.players.find((p) => p.role === 'player1');
    if (player1?.deviceId !== deviceId) {
      throw new BadRequestException('Only the host can cancel the lobby');
    }

    if (session.status !== SESSION_STATUSES.WAITING) {
      throw new BadRequestException(
        'Lobby can only be cancelled while waiting',
      );
    }

    await this.prisma.session.delete({ where: { id: sessionId } });
  }

  async findMine(deviceId: string): Promise<MySessionsResponse> {
    const now = new Date();
    const recentThreshold = new Date(now.getTime() - RECENT_SESSION_TTL_MS);

    const sessions = await this.prisma.session.findMany({
      where: {
        players: { some: { deviceId } },
        status: { not: SESSION_STATUSES.ABANDONED },
        lastActivityAt: { gte: recentThreshold },
      },
      include: { players: true, answers: true },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions.map((session) => {
      const player = session.players.find((p) => p.deviceId === deviceId)!;
      const partner = session.players.find((p) => p.role !== player.role);
      const totalExpected = session.questionCount;

      const yourAnswerCount = session.answers.filter(
        (a) => a.playerId === player.playerId,
      ).length;
      const partnerAnswerCount = session.answers.filter(
        (a) => a.playerId === partner?.playerId,
      ).length;
      const passAndPlay = !!partner && partner.deviceId === player.deviceId;

      return {
        id: session.id,
        category: session.category as Category,
        status: session.status as SessionStateResponse['session']['status'],
        statusLabel: this.statusLabel(session.status),
        questionCount: session.questionCount,
        role: player.role as PlayerRole,
        playerId: player.playerId,
        partnerJoined: !!partner,
        yourAnswerCount,
        partnerAnswerCount,
        totalExpected,
        passAndPlay,
        lastActivityAt: session.lastActivityAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
      };
    });
  }

  private statusLabel(status: string): string {
    switch (status) {
      case SESSION_STATUSES.WAITING:
        return 'Waiting for opponent';
      case SESSION_STATUSES.ACTIVE:
        return 'In progress';
      case SESSION_STATUSES.COMPLETED:
        return 'Finished';
      case SESSION_STATUSES.EXPIRED:
        return 'Expired';
      case SESSION_STATUSES.ABANDONED:
        return 'Abandoned';
      default:
        return 'Unknown';
    }
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async getState(
    sessionId: string,
    playerId: string,
  ): Promise<SessionStateResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const player = session.players.find((p) => p.playerId === playerId);
    if (!player) {
      throw new ForbiddenException('Player does not belong to this session');
    }

    const role = player.role as PlayerRole;
    const partner = session.players.find((p) => p.role !== role);
    const partnerId = partner?.playerId ?? null;

    // One query per table — questions, answers (question/player ids only,
    // never the answer values) and the result — no N+1.
    const [questions, answers, result] = await Promise.all([
      this.prisma.question.findMany({
        where: { sessionId },
        orderBy: { id: 'asc' },
        select: { id: true, text: true, type: true, options: true },
      }),
      this.prisma.answer.findMany({
        where: { sessionId },
        select: { questionId: true, playerId: true },
      }),
      this.prisma.result.findUnique({ where: { sessionId } }),
    ]);

    const youAnsweredQuestionIds = answers
      .filter((a) => a.playerId === playerId)
      .map((a) => a.questionId);

    const partnerAnsweredQuestionIds = partnerId
      ? answers.filter((a) => a.playerId === partnerId).map((a) => a.questionId)
      : [];

    const partnerComplete =
      !!partnerId && partnerAnsweredQuestionIds.length >= session.questionCount;

    const parsedResult: Result | null = result
      ? {
          score: result.score,
          summary: result.summary,
          strengths: JSON.parse(result.strengths) as string[],
          differences: JSON.parse(result.differences) as string[],
        }
      : null;

    const youComplete = youAnsweredQuestionIds.length >= session.questionCount;

    return {
      session: {
        id: session.id,
        category: session.category as Category,
        questionCount: session.questionCount,
        status: session.status as SessionStateResponse['session']['status'],
        createdAt: session.createdAt.toISOString(),
      },
      you: {
        playerId,
        role,
        answeredQuestionIds: youAnsweredQuestionIds,
      },
      partner: {
        joined: !!partnerId,
        answeredQuestionIds: partnerAnsweredQuestionIds,
        complete: partnerComplete,
      },
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type as QuestionType,
        options: q.options ? (JSON.parse(q.options) as string[]) : null,
      })),
      result: {
        status: parsedResult
          ? 'ready'
          : youComplete && partnerComplete
            ? 'pending'
            : 'none',
        data: parsedResult,
      },
    };
  }
}
