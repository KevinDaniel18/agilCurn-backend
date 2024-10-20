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
  ForbiddenException,
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
      sprintId: number;
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
  @Delete(':id')
  async deleteTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Request() req: any,
  ) {
    return this.tasksService.deleteTask(taskId, req.user.id);
  }

  @Post('sprints')
  @UseGuards(JwtAuthGuard)
  async createSprint(
    @Body()
    sprintData: {
      sprintName: string;
      startDate: Date;
      endDate: Date;
      projectId: number;
      creatorId: number;
    },
    @Request() req: any,
  ) {
    const creatorId = req.user.id;
    return this.tasksService.createSprint({
      ...sprintData,
      creatorId,
    });
  }

  @Get(':projectId/sprints')
  @UseGuards(JwtAuthGuard)
  async getSprintsByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    if (!userId) {
      throw new ForbiddenException('User is not authenticated.');
    }

    return this.tasksService.getSprintsByProjectId(projectId);
  }

  @Post(':taskId/assign-to-sprint')
  @UseGuards(JwtAuthGuard)
  async assignTaskToSprint(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body('sprintId', ParseIntPipe) sprintId: number,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    if (!userId) {
      throw new ForbiddenException('User is not authenticated.');
    }

    return this.tasksService.assignTaskToSprint(taskId, sprintId, userId);
  }

  @Post(':taskId/remove-from-sprint')
  @UseGuards(JwtAuthGuard)
  async removeTaskFromSprint(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    if (!userId) {
      throw new ForbiddenException('User is not authenticated.');
    }

    return this.tasksService.removeTaskFromSprint(taskId, userId);
  }

  @Delete(':sprintId/delete-sprint')
  @UseGuards(JwtAuthGuard)
  async deleteSprint(
    @Param('sprintId', ParseIntPipe) sprintId: number,
    @Request() req: any,
  ) {
    const userId = req.user.id;

    if (!userId) {
      throw new ForbiddenException('User is not authenticated.');
    }

    return this.tasksService.deleteSprint(sprintId, userId);
  }
}
