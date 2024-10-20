import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from 'src/authentication/auth.guard';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('projectStatus')
  async getProjectStatus(): Promise<any> {
    return this.reportsService.getProjectStatus();
  }

  @Get('teamProductivity')
  async getTeamProductivity(
    @Query('projectId') projectId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.reportsService.getTeamProductivity(Number(projectId), start, end);
  }

  @Get('bottlenecks')
  @UseGuards(JwtAuthGuard)
  async getBottlenecks(): Promise<any> {
    return this.reportsService.getBottlenecks();
  }
}
