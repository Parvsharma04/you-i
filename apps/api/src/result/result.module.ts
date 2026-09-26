import { Module } from '@nestjs/common';
import { ResultService } from './result.service';
import { ResultController } from './result.controller';
import { LlmModule } from '../llm/llm.module';
import { GatewayModule } from '../gateway/gateway.module';
import { PlayerGuard } from '../common/guards/player.guard';

@Module({
  imports: [LlmModule, GatewayModule],
  controllers: [ResultController],
  providers: [ResultService, PlayerGuard],
  exports: [ResultService],
})
export class ResultModule {}
