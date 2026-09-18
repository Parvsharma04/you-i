import { IsString, IsInt } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  sessionId!: string;

  @IsInt()
  questionId!: number;

  @IsString()
  playerId!: string;

  @IsString()
  answer!: string;
}
