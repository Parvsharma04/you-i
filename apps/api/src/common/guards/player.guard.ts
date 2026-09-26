import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PLAYER_ID_HEADER, PlayerRole } from '@youandi/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlayerContext {
  playerId: string;
  role: PlayerRole;
}

interface RequestWithPlayer extends Request {
  player?: PlayerContext;
}

/**
 * Loads the session named by the route (`:sessionId`/`:id` param, or
 * `body.sessionId` for routes that only carry it in the body) and checks
 * the caller's player id — read from the `X-Player-Id` header — against
 * the session's `SessionPlayer` rows.
 * Attaches `{ playerId, role }` to the request as `request.player` on success;
 * throws 403 on mismatch, 400 if nothing identifies the player, 404 if the
 * session doesn't exist.
 */
@Injectable()
export class PlayerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithPlayer>();

    const sessionId =
      (request.params?.sessionId as string | undefined) ??
      (request.params?.id as string | undefined) ??
      (request.body as { sessionId?: string } | undefined)?.sessionId;

    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const headerValue = request.headers[PLAYER_ID_HEADER];
    let playerId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!playerId) {
      throw new BadRequestException(`${PLAYER_ID_HEADER} header is required`);
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { players: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const player = session.players.find((p) => p.playerId === playerId);
    if (!player) {
      throw new ForbiddenException('Player does not belong to this session');
    }

    request.player = { playerId, role: player.role as PlayerRole };
    return true;
  }
}
