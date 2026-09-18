import { submitAnswerRequestSchema } from '@youandi/shared';
import { createZodDto } from '../common/create-zod-dto';

export class SubmitAnswerDto extends createZodDto(submitAnswerRequestSchema) {}
