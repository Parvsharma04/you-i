import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto, JoinSessionDto } from './session.dto';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('create')
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto);
  }

  @Post('join')
  async join(@Body() dto: JoinSessionDto) {
    return this.sessionService.join(dto.sessionId);
  }

  // Must be declared before the `:id` route below so Nest doesn't try to
  // match "state" as a session id.
  @Get(':sessionId/state')
  async getState(
    @Param('sessionId') sessionId: string,
    @Headers('x-player-id') playerId: string,
  ) {
    if (!playerId) {
      throw new BadRequestException('X-Player-Id header is required');
    }
    return this.sessionService.getState(sessionId, playerId);
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.sessionService.getSession(id);
  }
}
