import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnswerService } from './answer.service';
import { SubmitAnswerDto } from './answer.dto';
import {
  AllowLegacyPlayerIdBody,
  PlayerGuard,
} from '../common/guards/player.guard';
import type { PlayerContext } from '../common/guards/player.guard';
import { CurrentPlayer } from '../common/decorators/current-player.decorator';

@Controller('answer')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  // Body-based `playerId` is still accepted (deprecated) so apps/web keeps
  // working until it sends X-Player-Id — see AllowLegacyPlayerIdBody.
  // Looser than the LLM-backed routes: this is just a DB write per question.
  @Post()
  @UseGuards(PlayerGuard)
  @AllowLegacyPlayerIdBody()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async submit(
    @Body() dto: SubmitAnswerDto,
    @CurrentPlayer() player: PlayerContext,
  ) {
    return this.answerService.submit({ ...dto, playerId: player.playerId });
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
