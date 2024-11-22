import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { RolesService } from './roles/roles.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const rolesService = app.get(RolesService)
  const corsOptions: CorsOptions = {
    origin: [
      process.env.URL_PRODUCTION,
      'https://new-password-agil-curn.vercel.app',
      'http://localhost:8081',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.enableCors(corsOptions);
  await rolesService.initializeRoles()
  await app.listen(3000);
}
bootstrap();
