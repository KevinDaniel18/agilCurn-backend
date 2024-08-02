import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOptions: CorsOptions = {
    origin: [
      'https://new-password-agil-curn.vercel.app',
      'http://192.168.1.17:5173',
      'http://192.168.1.17:3000',
      'http://localhost:8081',
      'http://192.168.1.17:8081',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.enableCors(corsOptions);
  await app.listen(3000);
}
bootstrap();
