import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/prisma.service';
import { ChatController } from './chat.controller';
import { AuthModule } from 'src/authentication/auth.module';
import { NotificationService } from 'src/notification.service';

@Module({
  imports: [
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService, ChatGateway, NotificationService],
})
export class ChatModule {}
