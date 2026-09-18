import { Controller, Post, Get, Param, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ResultService } from './result.service';

@Controller('result')
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  @Post('generate/:sessionId')
  async generate(
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { alreadyExists, body } =
      await this.resultService.requestGeneration(sessionId);
    res.status(alreadyExists ? HttpStatus.OK : HttpStatus.ACCEPTED);
    return body;
  }

  @Get(':sessionId')
  async getResult(@Param('sessionId') sessionId: string) {
    return this.resultService.getResult(sessionId);
  }
}
