import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { LlmModule } from '../llm/llm.module';
import { PlayerGuard } from '../common/guards/player.guard';
import { CodeGeneratorService } from './code-generator.service';
import { SessionCleanupService } from './session-cleanup.service';

@Module({
  imports: [LlmModule],
  controllers: [SessionController],
  providers: [
    SessionService,
    CodeGeneratorService,
    SessionCleanupService,
    PlayerGuard,
  ],
  exports: [SessionService],
})
export class SessionModule {}
