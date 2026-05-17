import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { SubmitAnswerDto } from './answer.dto';

@Controller('answer')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @Post()
  async submit(@Body() dto: SubmitAnswerDto) {
    return this.answerService.submit(dto);
  }

  @Get(':sessionId')
  async getAnswers(@Param('sessionId') sessionId: string) {
    return this.answerService.getAnswersForSession(sessionId);
  }

  @Get(':sessionId/count')
  async getCount(@Param('sessionId') sessionId: string) {
    return this.answerService.getAnswerCount(sessionId);
  }
}
