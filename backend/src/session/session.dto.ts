import { IsString, IsInt, IsIn, Min, Max } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsIn(['love', 'friendship', 'deep_talk', 'fun', 'spicy', 'fantasy', 'interests'])
  category!: string;

  @IsInt()
  @Min(5)
  @Max(20)
  questionCount!: number;
}

export class JoinSessionDto {
  @IsString()
  sessionId!: string;
}
