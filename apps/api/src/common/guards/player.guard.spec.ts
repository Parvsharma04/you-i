import { Test } from '@nestjs/testing';
import {
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PlayerGuard } from './player.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('PlayerGuard', () => {
  let guard: PlayerGuard;
  let prisma: { session: { findUnique: jest.Mock } };

  const SESSION = {
    id: 'session-1',
    players: [
      { playerId: 'p1', role: 'player1' },
      { playerId: 'p2', role: 'player2' },
    ],
  };

  function makeContext(opts: {
    headers?: Record<string, string>;
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  }): ExecutionContext {
    const request = {
      headers: opts.headers ?? {},
      params: opts.params ?? { sessionId: SESSION.id },
      body: opts.body ?? {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    prisma = { session: { findUnique: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlayerGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = moduleRef.get(PlayerGuard);
  });

  it('allows a request whose X-Player-Id header matches player1Id', async () => {
    prisma.session.findUnique.mockResolvedValue(SESSION);
    const ctx = makeContext({ headers: { 'x-player-id': 'p1' } });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.player).toEqual({ playerId: 'p1', role: 'player1' });
  });

  it('allows a request whose X-Player-Id header matches player2Id', async () => {
    prisma.session.findUnique.mockResolvedValue(SESSION);
    const ctx = makeContext({ headers: { 'x-player-id': 'p2' } });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.player).toEqual({ playerId: 'p2', role: 'player2' });
  });

  it('rejects a playerId that does not belong to the session', async () => {
    prisma.session.findUnique.mockResolvedValue(SESSION);
    const ctx = makeContext({ headers: { 'x-player-id': 'stranger' } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws 400 when no header is provided', async () => {
    prisma.session.findUnique.mockResolvedValue(SESSION);
    const ctx = makeContext({ body: { playerId: 'p1' } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws 404 when the session does not exist', async () => {
    prisma.session.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ headers: { 'x-player-id': 'p1' } });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
