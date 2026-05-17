import { Controller, Get, Param } from '@nestjs/common';
import { QuestionService } from './question.service';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get(':sessionId')
  async getQuestions(@Param('sessionId') sessionId: string) {
    return this.questionService.getQuestionsForSession(sessionId);
  }
}
