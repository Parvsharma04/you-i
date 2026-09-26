import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, QuestionsResponse, QuestionType } from '@youandi/shared';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestionsForSession(sessionId: string): Promise<QuestionsResponse> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const questions = await this.prisma.question.findMany({
      where: { sessionId },
      orderBy: { id: 'asc' },
    });

    return questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type as QuestionType,
      options: q.options ? JSON.parse(q.options) : null,
      category: session.category as Category,
    }));
  }
}
