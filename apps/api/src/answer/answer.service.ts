import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitAnswerDto } from './answer.dto';

@Injectable()
export class AnswerService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: SubmitAnswerDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (dto.playerId !== session.player1Id && dto.playerId !== session.player2Id) {
      throw new BadRequestException('Player does not belong to this session');
    }

    // Upsert the answer (allows re-answering)
    const answer = await this.prisma.answer.upsert({
      where: {
        sessionId_questionId_playerId: {
          sessionId: dto.sessionId,
          questionId: dto.questionId,
          playerId: dto.playerId,
        },
      },
      update: { answer: dto.answer },
      create: {
        sessionId: dto.sessionId,
        questionId: dto.questionId,
        playerId: dto.playerId,
        answer: dto.answer,
      },
    });

    return answer;
  }

  async getAnswersForSession(sessionId: string) {
    return this.prisma.answer.findMany({
      where: { sessionId },
      orderBy: { questionId: 'asc' },
    });
  }

  async getAnswerCount(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    const player1Answers = await this.prisma.answer.count({
      where: { sessionId, playerId: session.player1Id },
    });

    const player2Answers = await this.prisma.answer.count({
      where: { sessionId, playerId: session.player2Id ?? '' },
    });

    const totalExpected = session.questionCount;

    return {
      player1: player1Answers,
      player2: player2Answers,
      totalExpected,
      bothComplete: player1Answers >= totalExpected && player2Answers >= totalExpected,
    };
  }
}
