import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from 'src/user.service';
import { UserModule } from 'src/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MailService } from 'src/mail.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, UserService, MailService],
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: "clavesecreta",
      signOptions: {expiresIn: "1d",},
    }),
  ],
})
export class AuthModule {}
