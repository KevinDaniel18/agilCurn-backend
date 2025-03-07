import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaService } from 'src/prisma.service';
import { ReportsGateway } from './reports.gateway';
import { NotificationService } from 'src/notification.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, ReportsGateway, NotificationService],
})
export class ReportsModule {}
