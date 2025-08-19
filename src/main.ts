import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin,
    credentials: true
  });

  app.use(cookieParser(process.env.COOKIE_SECRET));

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend on http://localhost:${port}`);
}
bootstrap();
