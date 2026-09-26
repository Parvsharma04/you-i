import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { register } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';

interface HealthResponse {
  status: 'ok';
  database: 'up';
}

// Not player/session data, and used by uptime monitors — exempt from the
// per-IP throttler and from PlayerGuard (there's no session to check).
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch (error) {
      console.error('[health] database check failed', error);
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
  }

  @Get('metrics')
  async metrics(): Promise<string> {
    return register.metrics();
  }
}
