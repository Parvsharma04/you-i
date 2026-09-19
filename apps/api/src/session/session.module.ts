import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { SessionsController } from './sessions.controller';
import { LlmModule } from '../llm/llm.module';
import { PlayerGuard } from '../common/guards/player.guard';
import { CodeGeneratorService } from './code-generator.service';
import { SessionCleanupService } from './session-cleanup.service';
import { JoinRateLimitService } from './join-rate-limit.service';

@Module({
  imports: [LlmModule],
  controllers: [SessionController, SessionsController],
  providers: [
    SessionService,
    CodeGeneratorService,
    SessionCleanupService,
    JoinRateLimitService,
    PlayerGuard,
  ],
  exports: [SessionService],
})
export class SessionModule {}
