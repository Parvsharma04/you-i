import { z } from 'zod';

/**
 * Wraps a zod schema (from @youandi/shared) in a class so it can be used as
 * a Nest controller parameter type (`@Body() dto: SomeDto`). The class
 * carries no validation logic of its own — `ZodValidationPipe` reads the
 * `schema` static property off the parameter's metatype and validates the
 * raw request body against it. This mirrors how `class-validator` DTOs used
 * to work, except the schema is the single shared source of truth instead
 * of being re-declared with decorators.
 */
export interface ZodDto<T> {
  new (): T;
  schema: z.ZodType<T>;
}

export function createZodDto<T>(schema: z.ZodType<T>): ZodDto<T> {
  class AugmentedZodDto {
    static schema = schema;
  }

  return AugmentedZodDto as unknown as ZodDto<T>;
}
