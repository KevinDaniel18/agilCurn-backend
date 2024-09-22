import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaService } from 'src/prisma.service';
import { ReportsGateway } from './reports.gateway';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, ReportsGateway],
})
export class ReportsModule {}
