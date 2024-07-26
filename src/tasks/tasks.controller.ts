import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, TaskStatus } from '@prisma/client';
import { JwtAuthGuard } from 'src/authentication/auth.guard';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async createTask(
    @Body()
    taskData: {
      title: string;
      description?: string;
      projectId: number;
      assigneeId?: number;
      creatorId: number;
    },
  ): Promise<Task> {
    console.log('Task data received in controller:', taskData);

    return this.tasksService.createTask(taskData);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllTasks(@Request() req: any): Promise<Task[]> {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.tasksService.getAllTasks(userId);
  }

  @Get('project/:projectId')
  @UseGuards(JwtAuthGuard)
  async getProjectTasks(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req: any,
  ): Promise<Task[]> {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.tasksService.getProjectTasks(projectId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateTaskStatus(
    @Param('id', ParseIntPipe) taskId: number,
    @Body('status') status: TaskStatus,
    @Request() req: any,
  ): Promise<Task> {
    const userId = req.user.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found');
    }
    return this.tasksService.updateTaskStatus(taskId, status, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/assign')
  async assignTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Body('userId', ParseIntPipe) userId: number,
    @Request() req: any,
  ): Promise<Task> {
    return this.tasksService.assignTask(taskId, userId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Request() req: any,
  ) {
    return this.tasksService.deleteTask(taskId, req.user.id);
  }
}
