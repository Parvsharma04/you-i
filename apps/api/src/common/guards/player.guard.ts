import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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

const ALLOW_LEGACY_PLAYER_ID_BODY_KEY = 'allowLegacyPlayerIdBody';

/**
 * Marks a route as still accepting `playerId` in the request body as a
 * fallback when no `X-Player-Id` header is present. Only meant for routes
 * that had a body-based playerId before the header migration (currently
 * just POST /answer) so apps/web keeps working until it migrates. Gated
 * behind `ALLOW_LEGACY_PLAYER_ID_BODY` so it can be turned off in one place
 * once every client sends the header.
 */
export const AllowLegacyPlayerIdBody = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_LEGACY_PLAYER_ID_BODY_KEY, true);

function isLegacyBodyFallbackEnabled(): boolean {
  return process.env.ALLOW_LEGACY_PLAYER_ID_BODY !== 'false';
}

/**
 * Loads the session named by the route (`:sessionId`/`:id` param, or
 * `body.sessionId` for routes that only carry it in the body) and checks
 * the caller's player id — read from the `X-Player-Id` header, or from
 * `body.playerId` on routes explicitly opted in with
 * `@AllowLegacyPlayerIdBody()` — against `player1Id`/`player2Id`. Attaches
 * `{ playerId, role }` to the request as `request.player` on success;
 * throws 403 on mismatch, 400 if nothing identifies the player, 404 if the
 * session doesn't exist.
 */
@Injectable()
export class PlayerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

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
      const allowLegacyBody = this.reflector.getAllAndOverride<boolean>(
        ALLOW_LEGACY_PLAYER_ID_BODY_KEY,
        [context.getHandler(), context.getClass()],
      );

      const legacyBody = (request.body as { playerId?: string } | undefined)
        ?.playerId;
      if (
        allowLegacyBody &&
        isLegacyBodyFallbackEnabled() &&
        typeof legacyBody === 'string' &&
        legacyBody.length > 0
      ) {
        playerId = legacyBody;
        console.warn(
          `[deprecated] playerId read from request body for ${request.method} ${request.originalUrl} — migrate to the ${PLAYER_ID_HEADER} header`,
        );
      }
    }

    if (!playerId) {
      throw new BadRequestException(`${PLAYER_ID_HEADER} header is required`);
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    let role: PlayerRole;
    if (playerId === session.player1Id) {
      role = 'player1';
    } else if (session.player2Id && playerId === session.player2Id) {
      role = 'player2';
    } else {
      throw new ForbiddenException('Player does not belong to this session');
    }

    request.player = { playerId, role };
    return true;
  }
}
