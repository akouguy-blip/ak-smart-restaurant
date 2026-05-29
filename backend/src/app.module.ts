import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './database.module';
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // En production : sert la PWA frontend depuis /public (build Vite copié là).
    // exclude=/api*,/socket.io* pour ne pas intercepter les routes API et WebSocket.
   ServeStaticModule.forRoot({
  rootPath: process.env.FRONTEND_PATH 
    || join(__dirname, '..', '..', 'frontend', 'dist'),
  exclude: ['/api*', '/socket.io*'],
}), '..', 'public'),
      exclude: ['/api', '/api/(.*)', '/socket.io', '/socket.io/(.*)'],
      serveStaticOptions: {
        index: 'index.html',
        fallthrough: true,
      },
    }),
    DatabaseModule,
    AuthModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
