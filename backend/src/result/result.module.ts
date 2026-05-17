import { Module } from '@nestjs/common';
import { ResultService } from './result.service';
import { ResultController } from './result.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  controllers: [ResultController],
  providers: [ResultService],
  exports: [ResultService],
})
export class ResultModule {}
