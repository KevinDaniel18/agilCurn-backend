import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('projectStatus')
  async getProjectStatus(): Promise<any> {
    return this.reportsService.getProjectStatus();
  }

  @Get('teamProductivity')
  async getTeamProductivity(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.reportsService.getTeamProductivity(start, end);
  }

  @Get('bottlenecks')
  async getBottlenecks(): Promise<any> {
    return this.reportsService.getBottlenecks();
  }
}
