import { Module } from '@nestjs/common';
import { UserModule } from './user.module';
import { AuthModule } from './authentication/auth.module';

@Module({
  imports: [AuthModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
