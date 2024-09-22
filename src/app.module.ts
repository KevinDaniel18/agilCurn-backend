import { Module } from '@nestjs/common';
import { UserModule } from './user.module';
import { AuthModule } from './authentication/auth.module';
import { ChatModule } from './chat/chat.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { ReportsModule } from './reports/reports.module';
import { ScheduleModule } from '@nestjs/schedule/dist';

@Module({
  imports: [
    AuthModule,
    UserModule,
    ChatModule,
    ProjectsModule,
    ProjectsModule,
    TasksModule,
    ReportsModule,
    ScheduleModule.forRoot()
  ],
})
export class AppModule {}
