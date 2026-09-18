import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { PlayerContext } from '../guards/player.guard';

interface RequestWithPlayer extends Request {
  player?: PlayerContext;
}

/**
 * Reads the `{ playerId, role }` attached by `PlayerGuard`. Only usable on
 * routes that apply `PlayerGuard` — the guard always sets `request.player`
 * before the handler runs, or throws first.
 */
export const CurrentPlayer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PlayerContext => {
    const request = context.switchToHttp().getRequest<RequestWithPlayer>();
    return request.player as PlayerContext;
  },
);
