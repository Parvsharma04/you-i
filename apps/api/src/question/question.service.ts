import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuestionsForSession(sessionId: string) {
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
      type: q.type,
      options: q.options ? JSON.parse(q.options) : null,
      category: session.category,
    }));
  }
}
