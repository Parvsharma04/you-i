import { Controller, Post, Get, Param } from '@nestjs/common';
import { ResultService } from './result.service';

@Controller('result')
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  @Post('generate/:sessionId')
  async generate(@Param('sessionId') sessionId: string) {
    return this.resultService.generate(sessionId);
  }

  @Get(':sessionId')
  async getResult(@Param('sessionId') sessionId: string) {
    return this.resultService.getResult(sessionId);
  }
}
