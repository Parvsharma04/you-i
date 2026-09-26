import {
  createSessionRequestSchema,
  joinSessionRequestSchema,
} from '@youandi/shared';
import { createZodDto } from '../common/create-zod-dto';

export class CreateSessionDto extends createZodDto(
  createSessionRequestSchema,
) {}

export class JoinSessionDto extends createZodDto(joinSessionRequestSchema) {}
