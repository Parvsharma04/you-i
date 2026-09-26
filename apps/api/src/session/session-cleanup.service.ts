import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_STATUSES } from '@youandi/shared';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every 5 minutes:
   * - Expires waiting sessions whose code has passed codeExpiresAt.
   * - Abandons sessions with no activity for 24 hours.
   */
  @Cron('*/5 * * * *')
  async handleCleanup(): Promise<void> {
    const now = new Date();
    const abandonedThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [expired, abandoned] = await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: {
          status: SESSION_STATUSES.WAITING,
          code: { not: null },
          codeExpiresAt: { lt: now },
        },
        data: {
          code: null,
          codeExpiresAt: null,
          status: SESSION_STATUSES.EXPIRED,
        },
      }),
      this.prisma.session.updateMany({
        where: {
          status: { not: SESSION_STATUSES.ABANDONED },
          lastActivityAt: { lt: abandonedThreshold },
        },
        data: {
          status: SESSION_STATUSES.ABANDONED,
        },
      }),
    ]);

    this.logger.log(
      `session cleanup complete: expired=${expired.count}, abandoned=${abandoned.count}`,
    );
  }
}
