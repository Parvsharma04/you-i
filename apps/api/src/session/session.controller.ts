import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { SessionService } from './session.service';
import { CreateSessionDto, JoinSessionDto } from './session.dto';
import { PlayerGuard } from '../common/guards/player.guard';
import type { PlayerContext } from '../common/guards/player.guard';
import { CurrentPlayer } from '../common/decorators/current-player.decorator';
import { getClientIp } from '../common/client-ip';
import { DEVICE_ID_HEADER } from '@youandi/shared';

function requireDeviceId(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || value.length === 0) {
    throw new BadRequestException(`${DEVICE_ID_HEADER} header is required`);
  }
  return value;
}

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  // Costs an LLM call to generate questions — tight limit, distinct from
  // the default throttler config.
  @Post('create')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async create(
    @Body() dto: CreateSessionDto,
    @Headers(DEVICE_ID_HEADER) deviceIdHeader: string | string[] | undefined,
  ) {
    const deviceId = requireDeviceId(deviceIdHeader);
    return this.sessionService.create(dto, deviceId);
  }

  @Post('join')
  async join(
    @Body() dto: JoinSessionDto,
    @Headers(DEVICE_ID_HEADER) deviceIdHeader: string | string[] | undefined,
    @Req() request: Request,
  ) {
    const deviceId = requireDeviceId(deviceIdHeader);
    const ip = getClientIp(request);
    return this.sessionService.join(dto, deviceId, ip);
  }

  @Post(':id/regenerate-code')
  async regenerateCode(
    @Param('id') id: string,
    @Headers(DEVICE_ID_HEADER) deviceIdHeader: string | string[] | undefined,
  ) {
    const deviceId = requireDeviceId(deviceIdHeader);
    return this.sessionService.regenerateCode(id, deviceId);
  }

  @Delete(':id')
  async deleteSession(
    @Param('id') id: string,
    @Headers(DEVICE_ID_HEADER) deviceIdHeader: string | string[] | undefined,
  ) {
    const deviceId = requireDeviceId(deviceIdHeader);
    await this.sessionService.deleteSession(id, deviceId);
    return { deleted: true };
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
