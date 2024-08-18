import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Task, TaskStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async isUserInvitedToProject(
    projectId: number,
    userId: number,
  ): Promise<boolean> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { creatorId: userId },
          { invitations: { some: { invitedId: userId, confirmed: true } } },
        ],
      },
    });
    return !!project;
  }

  async createTask(data: {
    title: string;
    description?: string;
    projectId: number;
    assigneeId?: number;
    creatorId: number;
  }): Promise<Task> {
    console.log('Data received for creating task:', data);

    const isInvited = await this.isUserInvitedToProject(
      data.projectId,
      data.creatorId,
    );

    if (!isInvited) {
      throw new ForbiddenException('You are not invited to this project.');
    }

    return await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        project: {
          connect: { id: data.projectId },
        },
        assignee: data.assigneeId
          ? { connect: { id: data.assigneeId } }
          : undefined,
        creator: { connect: { id: data.creatorId } },
      },
    });
  }

  async getProjectTasks(projectId: number, userId: number): Promise<Task[]> {
    const isInvited = await this.isUserInvitedToProject(projectId, userId);

    if (!isInvited) {
      throw new ForbiddenException('You are not invited to this project.');
    }

    return this.prisma.task.findMany({
      where: { projectId },
      include: { creator: true, project: true },
    });
  }

  async getAllTasks(userId: number): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        OR: [
          {
            project: {
              creatorId: userId,
            },
          },
          {
            project: {
              invitations: {
                some: {
                  invitedId: userId,
                  confirmed: true,
                },
              },
            },
          },
        ],
      },
      include: { creator: true, project: true },
    });
  }

  async updateTaskStatus(
    taskId: number,
    status: TaskStatus,
    userId: number,
  ): Promise<Task> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { project: true, creator: true },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      if (
        task.creatorId !== userId &&
        task.project.creatorId !== userId &&
        task.assigneeId !== userId
      ) {
        throw new ForbiddenException(
          'You are not authorized to update this task',
        );
      }

      return await this.prisma.task.update({
        where: { id: taskId },
        data: { status },
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  async deleteTask(taskId: number, userId: number): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true, creator: true },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.project.creatorId !== userId && task.creatorId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to delete this task',
      );
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  async assignTask(
    taskId: number,
    userId: number,
    assignerId: number,
  ): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.project.creatorId !== assignerId) {
      throw new ForbiddenException('Only the project creator can assign tasks');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: userId },
    });
  }
}
