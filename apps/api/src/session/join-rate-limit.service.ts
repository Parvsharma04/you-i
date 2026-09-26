import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JoinSessionErrorCode } from '@youandi/shared';
import { Counter } from 'prom-client';

const BASE_LOCKOUT_MS = 60_000;
const MAX_LOCKOUT_MS = 60 * 60_000;

export const joinFailureCounter = new Counter({
  name: 'session_join_failures_total',
  help: 'Total failed session join attempts by reason',
  labelNames: ['reason'],
});

interface RateLimitKey {
  key: string;
  scope: 'device' | 'ip';
}

/**
 * Failure-based rate limiting for POST /session/join.
 *
 * Successful joins wipe the failure history for the device and IP. Only
 * failed attempts are counted; after the third failure the key is locked out
 * with exponential backoff so enumeration of the code space is noisy and slow.
 */
@Injectable()
export class JoinRateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Throws RATE_LIMITED if either key is currently locked out.
   */
  async assertNotRateLimited(
    deviceId: string | undefined,
    ip: string | undefined,
  ): Promise<void> {
    const keys = this.buildKeys(deviceId, ip);
    if (keys.length === 0) return;

    const now = new Date();
    const active = await this.prisma.joinRateLimit.findMany({
      where: {
        OR: keys,
        failureCount: { gte: 3 },
        expiresAt: { gt: now },
      },
    });

    if (active.length > 0) {
      throw new JoinRateLimitException(active[0].expiresAt);
    }
  }

  /**
   * Increments the global failure metric without touching the per-key
   * backoff counters. Used for RATE_LIMITED responses.
   */
  recordMetric(reason: JoinSessionErrorCode): void {
    joinFailureCounter.inc({ reason });
  }

  /**
   * Records a failed join attempt and increments the global failure metric.
   * Rate-limited attempts themselves are not counted again.
   */
  async recordFailure(
    deviceId: string | undefined,
    ip: string | undefined,
    reason: JoinSessionErrorCode,
  ): Promise<void> {
    this.recordMetric(reason);

    const keys = this.buildKeys(deviceId, ip);
    const now = new Date();

    for (const { key, scope } of keys) {
      await this.recordFailureForKey(key, scope, now);
    }
  }

  /**
   * Clears failure history after a successful join.
   */
  async clearFailures(
    deviceId: string | undefined,
    ip: string | undefined,
  ): Promise<void> {
    const keys = this.buildKeys(deviceId, ip);
    if (keys.length === 0) return;

    await this.prisma.joinRateLimit.deleteMany({
      where: { OR: keys },
    });
  }

  private async recordFailureForKey(
    key: string,
    scope: 'device' | 'ip',
    now: Date,
  ): Promise<void> {
    const row = await this.prisma.joinRateLimit.upsert({
      where: { key_scope: { key, scope } },
      create: {
        key,
        scope,
        failureCount: 1,
        firstFailureAt: now,
        lastFailureAt: now,
        expiresAt: now,
      },
      update: {
        failureCount: { increment: 1 },
        lastFailureAt: now,
      },
    });

    if (row.failureCount >= 3) {
      const backoff = Math.min(
        BASE_LOCKOUT_MS * Math.pow(2, row.failureCount - 3),
        MAX_LOCKOUT_MS,
      );
      const expiresAt = new Date(now.getTime() + backoff);
      await this.prisma.joinRateLimit.update({
        where: { id: row.id },
        data: { expiresAt },
      });
    }
  }

  private buildKeys(
    deviceId: string | undefined,
    ip: string | undefined,
  ): RateLimitKey[] {
    const keys: RateLimitKey[] = [];
    if (deviceId) keys.push({ key: deviceId, scope: 'device' });
    if (ip) keys.push({ key: ip, scope: 'ip' });
    return keys;
  }
}

export class JoinRateLimitException extends Error {
  constructor(public readonly retryAfter: Date) {
    super('Rate limited');
    this.name = 'JoinRateLimitException';
  }
}
