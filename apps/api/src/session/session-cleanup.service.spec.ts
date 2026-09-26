import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SessionCleanupService } from './session-cleanup.service';
import { SESSION_STATUSES } from '@youandi/shared';

describe('SessionCleanupService', () => {
  let service: SessionCleanupService;
  let prisma: {
    $transaction: jest.Mock;
    session: { updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((ops) => Promise.all(ops)),
      session: { updateMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionCleanupService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(SessionCleanupService);
  });

  it('expires waiting sessions past codeExpiresAt', async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 2 });

    await service.handleCleanup();

    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: SESSION_STATUSES.WAITING,
          code: { not: null },
          codeExpiresAt: { lt: expect.any(Date) },
        },
        data: {
          code: null,
          codeExpiresAt: null,
          status: SESSION_STATUSES.EXPIRED,
        },
      }),
    );
  });

  it('abandons inactive sessions', async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 3 });

    await service.handleCleanup();

    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { not: SESSION_STATUSES.ABANDONED },
          lastActivityAt: { lt: expect.any(Date) },
        },
        data: {
          status: SESSION_STATUSES.ABANDONED,
        },
      }),
    );
  });
});
