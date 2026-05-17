import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { SessionModule } from './session/session.module';
import { QuestionModule } from './question/question.module';
import { AnswerModule } from './answer/answer.module';
import { ResultModule } from './result/result.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    PrismaModule,
    SessionModule,
    QuestionModule,
    AnswerModule,
    ResultModule,
    GatewayModule,
  ],
})
export class AppModule {}
