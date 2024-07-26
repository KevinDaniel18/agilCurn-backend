import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MailService } from 'src/mail.service';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, MailService, PrismaService, UserService]
})
export class ProjectsModule {}
