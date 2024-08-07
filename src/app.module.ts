import { Module } from '@nestjs/common';
import { UserModule } from './user.module';
import { AuthModule } from './authentication/auth.module';
import { ChatModule } from './chat/chat.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    ChatModule,
    ProjectsModule,
    ProjectsModule,
    TasksModule,
  ],
})
export class AppModule {}
