import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitAnswerDto } from './answer.dto';
import { Answer, AnswerCountResponse, AnswersResponse } from '@youandi/shared';

@Injectable()
export class AnswerService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: SubmitAnswerDto): Promise<Answer> {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
      include: { players: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    const player = session.players.find((p) => p.playerId === dto.playerId);
    if (!player) {
      throw new BadRequestException('Player does not belong to this session');
    }

    // Upsert the answer (allows re-answering)
    // PlayerGuard guarantees playerId is present; the body field is kept
    // optional only for the legacy fallback path.
    const playerId = dto.playerId!;
    const answer = await this.prisma.answer.upsert({
      where: {
        sessionId_questionId_playerId: {
          sessionId: dto.sessionId,
          questionId: dto.questionId,
          playerId,
        },
      },
      update: { answer: dto.answer },
      create: {
        sessionId: dto.sessionId,
        questionId: dto.questionId,
        playerId,
        answer: dto.answer,
      },
    });

    return answer;
  }

  async getAnswersForSession(sessionId: string): Promise<AnswersResponse> {
    return this.prisma.answer.findMany({
      where: { sessionId },
      orderBy: { questionId: 'asc' },
    });
  }

  async getAnswerCount(sessionId: string): Promise<AnswerCountResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    const player1 = session.players.find((p) => p.role === 'player1');
    const player2 = session.players.find((p) => p.role === 'player2');
    const player1Id = player1?.playerId ?? '___none___';
    const player2Id = player2?.playerId ?? '___none___';

    const [player1Answers, player2Answers] = await Promise.all([
      this.prisma.answer.count({
        where: { sessionId, playerId: player1Id },
      }),
      this.prisma.answer.count({
        where: { sessionId, playerId: player2Id },
      }),
    ]);

    const totalExpected = session.questionCount;

    return {
      player1: player1Answers,
      player2: player2Answers,
      totalExpected,
      bothComplete:
        player1Answers >= totalExpected && player2Answers >= totalExpected,
    };
  }
}
