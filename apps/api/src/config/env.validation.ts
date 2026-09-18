import { z } from 'zod';

/**
 * Single source of truth for every environment variable the API reads,
 * and whether it is required to boot. Run this before `NestFactory.create`
 * so a missing/invalid var fails loudly at startup (crash-looping the
 * container, which the host will surface) instead of at first request.
 *
 * Documented in DEPLOY.md — keep the two in sync when adding a new var.
 */
const envSchema = z
  .object({
    // --- Always required ---
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required (Postgres connection string)'),

    // --- Optional, with defaults matching current runtime behaviour ---
    PORT: z.coerce.number().int().positive().default(3001),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    ALLOWED_ORIGINS: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    ALLOW_LEGACY_PLAYER_ID_BODY: z.enum(['true', 'false']).default('true'),
    LLM_PROVIDER: z.enum(['gemini', 'groq']).default('gemini'),

    // --- Conditionally required, checked below based on LLM_PROVIDER ---
    GEMINI_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GEMINI_API_KEY'],
        message:
          'GEMINI_API_KEY is required when LLM_PROVIDER=gemini (the default)',
      });
    }
    if (env.LLM_PROVIDER === 'groq' && !env.GROQ_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GROQ_API_KEY'],
        message: 'GROQ_API_KEY is required when LLM_PROVIDER=groq',
      });
    }
  });

export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validates `process.env` and exits the process with a clear, itemized
 * error if anything required is missing or malformed. Must be called as
 * the first thing in main.ts, before the Nest app (and its Prisma
 * connection) is created.
 */
export function validateEnv(): ValidatedEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Invalid or missing environment variables:\n');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error(
      '\nSee apps/api/.env.example and DEPLOY.md for the full list of required variables.\n',
    );
    process.exit(1);
  }

  return result.data;
}
