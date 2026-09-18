import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodDto } from './create-zod-dto';

/**
 * Global replacement for Nest's `class-validator`-based `ValidationPipe`.
 * Only validates `@Body()` parameters whose metatype was created with
 * `createZodDto` (see create-zod-dto.ts) — path/query params are left
 * untouched, matching the pre-refactor behaviour where only DTO-typed
 * bodies were validated. On failure this throws a `BadRequestException`
 * (400), same as the previous `ValidationPipe` default.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body') {
      return value;
    }

    const metatype = metadata.metatype as ZodDto<unknown> | undefined;
    if (!metatype?.schema) {
      return value;
    }

    const result = metatype.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }

    return result.data;
  }
}
