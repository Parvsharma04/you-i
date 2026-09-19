import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CodeGeneratorService } from './code-generator.service';

const CROCKFORD_RE = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

describe('CodeGeneratorService', () => {
  let service: CodeGeneratorService;
  let prisma: {
    session: { update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = { session: { update: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CodeGeneratorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(CodeGeneratorService);
  });

  it('generates a 6-character Crockford base32 code', async () => {
    prisma.session.update.mockResolvedValue({});

    const code = await service.generateAndAssign('session-1');

    expect(code).toHaveLength(6);
    expect(code).toMatch(CROCKFORD_RE);
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { code },
    });
  });

  it('retries on unique constraint violation', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test' },
    );
    prisma.session.update
      .mockRejectedValueOnce(uniqueError)
      .mockResolvedValueOnce({});

    const code = await service.generateAndAssign('session-1');

    expect(code).toMatch(CROCKFORD_RE);
    expect(prisma.session.update).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test' },
    );
    prisma.session.update.mockRejectedValue(uniqueError);

    await expect(service.generateAndAssign('session-1')).rejects.toThrow(
      'Failed to generate a unique room code',
    );
  });

  it('throws non-unique errors immediately', async () => {
    prisma.session.update.mockRejectedValue(new Error('database down'));

    await expect(service.generateAndAssign('session-1')).rejects.toThrow(
      'database down',
    );
  });
});
