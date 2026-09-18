import {
  Controller,
  Post,
  Get,
  Param,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ResultService } from './result.service';
import { PlayerGuard } from '../common/guards/player.guard';

@Controller('result')
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  // Costs an LLM call — tight limit, distinct from the default throttler.
  @Post('generate/:sessionId')
  @UseGuards(PlayerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
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
  @UseGuards(PlayerGuard)
  async getResult(@Param('sessionId') sessionId: string) {
    return this.resultService.getResult(sessionId);
  }
}
