import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './common/zod-validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(new ZodValidationPipe());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 you&i backend running on http://localhost:${port}`);
}

bootstrap();
