import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { SessionModule } from './session/session.module';
import { QuestionModule } from './question/question.module';
import { AnswerModule } from './answer/answer.module';
import { ResultModule } from './result/result.module';
import { GatewayModule } from './gateway/gateway.module';
import { LlmModule } from './llm/llm.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Global baseline; routes that cost LLM money (POST /session/create,
    // POST /result/generate/:sessionId) override this with a tighter
    // per-route @Throttle(), and POST /answer overrides it looser.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 30,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    SessionModule,
    QuestionModule,
    AnswerModule,
    ResultModule,
    GatewayModule,
    LlmModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
