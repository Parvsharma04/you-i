import { Module } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { AnswerController } from './answer.controller';
import { PlayerGuard } from '../common/guards/player.guard';

@Module({
  controllers: [AnswerController],
  providers: [AnswerService, PlayerGuard],
  exports: [AnswerService],
})
export class AnswerModule {}
