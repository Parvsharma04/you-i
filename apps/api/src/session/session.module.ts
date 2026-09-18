import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { LlmModule } from '../llm/llm.module';
import { PlayerGuard } from '../common/guards/player.guard';

@Module({
  imports: [LlmModule],
  controllers: [SessionController],
  providers: [SessionService, PlayerGuard],
  exports: [SessionService],
})
export class SessionModule {}
