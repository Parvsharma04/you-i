import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/zod-validation.pipe';
import { buildCorsOptions } from './common/cors.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors(buildCorsOptions());

  app.useGlobalPipes(new ZodValidationPipe());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 you&i backend running on http://localhost:${port}`);
}

bootstrap();
