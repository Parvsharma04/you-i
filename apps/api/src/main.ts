import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/zod-validation.pipe';
import { buildCorsOptions } from './common/cors.config';
import { validateEnv } from './config/env.validation';

// Fail fast: validate every required env var before Nest (and its Prisma
// connection) is even constructed, rather than discovering a missing key
// on the first request.
const env = validateEnv();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors(buildCorsOptions());

  app.useGlobalPipes(new ZodValidationPipe());

  await app.listen(env.PORT);
  console.log(`🚀 you&i backend running on http://localhost:${env.PORT}`);
}

bootstrap();
