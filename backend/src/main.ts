import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // En production déployée (single-service), le frontend et le backend partagent
  // la même origine donc CORS n'est pas critique. On laisse '*' par défaut.
  // En dev local, on accepte le port Vite via CORS_ORIGIN=http://localhost:5173
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api', {
    // ServeStaticModule sert /, /menu, /kitchen, etc. — on n'exclut rien du préfixe API.
  });

  const port = Number(process.env.PORT) || 3000;
  // 0.0.0.0 obligatoire pour Railway, Render, Fly.io, etc. (pas seulement localhost)
  await app.listen(port, '0.0.0.0');
  console.log(`AK Resto démarré sur le port ${port}`);
  console.log(`  API     → /api`);
  console.log(`  Socket  → /socket.io`);
  console.log(`  Front   → /`);
}

bootstrap();
