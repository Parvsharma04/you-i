import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionService } from './session.service';
import { CreateSessionDto, JoinSessionDto } from './session.dto';
import { PlayerGuard } from '../common/guards/player.guard';
import type { PlayerContext } from '../common/guards/player.guard';
import { CurrentPlayer } from '../common/decorators/current-player.decorator';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  // Costs an LLM call to generate questions — tight limit, distinct from
  // the default throttler config.
  @Post('create')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto);
  }

  @Post('join')
  async join(@Body() dto: JoinSessionDto) {
    return this.sessionService.join(dto);
  }

  // Must be declared before the `:id` route below so Nest doesn't try to
  // match "state" as a session id.
  @Get(':sessionId/state')
  @UseGuards(PlayerGuard)
  async getState(
    @Param('sessionId') sessionId: string,
    @CurrentPlayer() player: PlayerContext,
  ) {
    return this.sessionService.getState(sessionId, player.playerId);
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.sessionService.getSession(id);
  }
}
