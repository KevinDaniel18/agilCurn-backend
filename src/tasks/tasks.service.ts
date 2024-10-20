import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Sprint, Task, TaskStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { Expo } from 'expo-server-sdk';
import * as moment from 'moment';

@Injectable()
export class TasksService {
  private expo: Expo;
  constructor(private prisma: PrismaService) {
    this.expo = new Expo();
  }

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
    sprintId?: number;
  }): Promise<Task> {
    try {
      console.log('Data received for creating task:', data);

      const projectExists = await this.prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!projectExists) {
        throw new NotFoundException('Project not found.');
      }

      const isInvited = await this.isUserInvitedToProject(
        data.projectId,
        data.creatorId,
      );

      if (!isInvited) {
        throw new ForbiddenException('You are not invited to this project.');
      }

      const userRole = await this.prisma.userRole.findFirst({
        where: {
          userId: data.creatorId,
          projectId: data.projectId,
        },
        include: { role: true },
      });

      if (userRole.role.roleName === 'Developer') {
        if (data.assigneeId) {
          throw new ForbiddenException(
            'Developers cannot assign tasks to others.',
          );
        }

        if (data.sprintId) {
          throw new ForbiddenException(
            'Developers cannot assign tasks to sprints.',
          );
        }
      } else if (
        userRole.role.roleName !== 'Product Owner' &&
        userRole.role.roleName !== 'Scrum Master'
      ) {
        throw new ForbiddenException(
          'You do not have permission to create tasks.',
        );
      }

      if (data.sprintId) {
        const sprint = await this.prisma.sprint.findUnique({
          where: { id: data.sprintId },
        });

        if (!sprint || sprint.projectId !== data.projectId) {
          throw new ForbiddenException(
            'The selected sprint does not belong to this project.',
          );
        }

        const isSprintOver = moment().isAfter(moment(sprint.endDate));
        if (isSprintOver) {
          throw new ForbiddenException(
            'You cannot assign tasks to a finished sprint.',
          );
        }
      }

      if (data.assigneeId) {
        const assigneeExists = await this.prisma.user.findUnique({
          where: { id: data.assigneeId },
        });

        if (!assigneeExists) {
          throw new NotFoundException('Assignee not found.');
        }
      }

      const task = await this.prisma.task.create({
        data: {
          title: data.title,
          description: data.description,
          project: {
            connect: { id: data.projectId },
          },
          sprint: data.sprintId
            ? { connect: { id: data.sprintId } }
            : undefined,
          assignee: data.assigneeId
            ? { connect: { id: data.assigneeId } }
            : undefined,
          creator: { connect: { id: data.creatorId } },
        },
      });

      const project = await this.prisma.project.findUnique({
        where: { id: data.projectId },
        select: { projectName: true },
      });

      if (data.assigneeId) {
        const assignee = await this.prisma.user.findUnique({
          where: { id: data.assigneeId },
          select: { expoPushToken: true },
        });

        if (assignee?.expoPushToken) {
          await this.sendPushNotification(
            assignee.expoPushToken,
            'New Task Assigned',
            `You have been assigned a new task: ${data.title}, to the project: ${project?.projectName}.`,
          );
        }
      }

      return task;
    } catch (error) {
      console.log('error creating task', error);
      throw error instanceof ForbiddenException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('An unexpected error occurred.');
    }
  }

  async getProjectTasks(projectId: number, userId: number): Promise<Task[]> {
    const isInvited = await this.isUserInvitedToProject(projectId, userId);

    if (!isInvited) {
      throw new ForbiddenException('You are not invited to this project.');
    }

    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        creator: true,
        project: { include: { userRoles: true } },
        assignee: true,
        sprint: true,
      },
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
      include: {
        creator: { include: { roles: { include: { role: true } } } },
        project: { include: { userRoles: true } },
      },
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
        include: {
          project: { include: { userRoles: { include: { role: true } } } },
          creator: true,
          assignee: true,
          sprint: true,
        },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      if (task.sprintId && task.sprint.endDate < new Date()) {
        throw new ForbiddenException(
          'Cannot change the status of a task in a completed sprint.',
        );
      }

      const userRole = task.project.userRoles.find(
        (userRole) => userRole.userId === userId,
      );

      if (!userRole) {
        throw new ForbiddenException('You are not part of this project');
      }

      const roleName = userRole.role.roleName;

      if (roleName === 'Product Owner' || roleName === 'Scrum Master') {
        return await this.prisma.task.update({
          where: { id: taskId },
          data: { status },
        });
      }

      if (
        roleName === 'Developer' &&
        (task.creatorId === userId || task.assigneeId === userId)
      ) {
        return await this.prisma.task.update({
          where: { id: taskId },
          data: { status },
        });
      }

      throw new ForbiddenException(
        'You are not authorized to update this task',
      );
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  async deleteTask(taskId: number, userId: number): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { include: { userRoles: { include: { role: true } } } },
        creator: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const userRole = task.project.userRoles.find(
      (userRole) => userRole.userId === userId,
    );

    if (!userRole) {
      throw new ForbiddenException('You are not part of this project');
    }

    const roleName = userRole.role.roleName;

    if (roleName === 'Product Owner') {
      await this.prisma.task.delete({
        where: { id: taskId },
      });
      return;
    }

    if (
      roleName === 'Developer' ||
      (roleName === 'Scrum Master' &&
        (task.creatorId === userId || task.assigneeId === userId))
    ) {
      await this.prisma.task.delete({
        where: { id: taskId },
      });
      return;
    }

    throw new ForbiddenException('You are not authorized to delete this task');
  }

  async createSprint(data: {
    sprintName: string;
    startDate: Date;
    endDate: Date;
    projectId: number;
    creatorId: number;
  }): Promise<Sprint> {
    try {
      const isInvited = await this.isUserInvitedToProject(
        data.projectId,
        data.creatorId,
      );

      if (!isInvited) {
        throw new ForbiddenException('You are not invited to this project.');
      }

      const userRole = await this.prisma.userRole.findFirst({
        where: { userId: data.creatorId, projectId: data.projectId },
        include: { role: true },
      });

      if (
        userRole.role.roleName !== 'Product Owner' &&
        userRole.role.roleName !== 'Scrum Master'
      ) {
        throw new ForbiddenException(
          'You do not have permission to create sprints.',
        );
      }

      const project = await this.prisma.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found.');
      }

      if (data.endDate > project.endDate) {
        throw new ForbiddenException(
          'The end date of the sprint cannot be greater than the end date of the project.',
        );
      }

      return this.prisma.sprint.create({
        data: {
          sprintName: data.sprintName,
          startDate: data.startDate,
          endDate: data.endDate,
          project: { connect: { id: data.projectId } },
        },
      });
    } catch (error) {
      console.error('Error in creating sprint', error);
      throw error instanceof ForbiddenException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('An unexpected error occurred.');
    }
  }

  async getSprintsByProjectId(projectId: number) {
    return this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: { startDate: 'asc' },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            assigneeId: true,
            creatorId: true,
          },
        },
      },
    });
  }

  async assignTaskToSprint(
    taskId: number,
    sprintId: number,
    userId: number,
  ): Promise<Task> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { project: true },
      });

      if (!task) {
        throw new NotFoundException('Task not found.');
      }

      const isUserAuthorized = await this.isUserInvitedToProject(
        task.projectId,
        userId,
      );

      if (!isUserAuthorized) {
        throw new ForbiddenException(
          'You are not authorized to assign tasks to this sprint.',
        );
      }

      const userRole = await this.prisma.userRole.findFirst({
        where: {
          userId: userId,
          projectId: task.projectId,
        },
        include: { role: true },
      });

      if (
        userRole.role.roleName !== 'Product Owner' &&
        userRole.role.roleName !== 'Scrum Master'
      ) {
        throw new ForbiddenException(
          'You do not have permission to assign tasks to a sprint.',
        );
      }

      const sprintExists = await this.prisma.sprint.findUnique({
        where: { id: sprintId },
        include: { project: true },
      });

      if (!sprintExists) {
        throw new NotFoundException('Sprint not found.');
      }

      if (sprintExists.projectId !== task.projectId) {
        throw new ForbiddenException(
          'You cannot assign tasks to sprints of different projects.',
        );
      }

      return this.prisma.task.update({
        where: { id: taskId },
        data: { sprintId: sprintId },
      });
    } catch (error) {
      console.error('Error assing task to sprint', error);
      throw error instanceof ForbiddenException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('An unexpected error occurred.');
    }
  }

  async removeTaskFromSprint(taskId: number, userId: number): Promise<Task> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { project: true },
      });

      if (!task) {
        throw new NotFoundException('Task not found.');
      }

      const isUserAuthorized = await this.isUserInvitedToProject(
        task.projectId,
        userId,
      );

      if (!isUserAuthorized) {
        throw new ForbiddenException(
          'You are not authorized to remove tasks from this sprint.',
        );
      }

      const userRole = await this.prisma.userRole.findFirst({
        where: {
          userId: userId,
          projectId: task.projectId,
        },
        include: { role: true },
      });

      if (
        userRole.role.roleName !== 'Product Owner' &&
        userRole.role.roleName !== 'Scrum Master'
      ) {
        throw new ForbiddenException(
          'You do not have permission to remove tasks from a sprint.',
        );
      }

      return this.prisma.task.update({
        where: { id: taskId },
        data: { sprintId: null },
      });
    } catch (error) {
      console.error('Error removing task from sprint', error);
      throw error instanceof ForbiddenException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('An unexpected error occurred.');
    }
  }

  async deleteSprint(sprintId: number, userId: number): Promise<Sprint> {
    try {
      const sprint = await this.prisma.sprint.findUnique({
        where: { id: sprintId },
        include: { project: true },
      });

      if (!sprint) {
        throw new NotFoundException('Sprint not found.');
      }

      const isUserAuthorized = await this.isUserInvitedToProject(
        sprint.projectId,
        userId,
      );

      if (!isUserAuthorized) {
        throw new ForbiddenException(
          'You are not authorized to delete this sprint.',
        );
      }

      const userRole = await this.prisma.userRole.findFirst({
        where: {
          userId: userId,
          projectId: sprint.projectId,
        },
        include: { role: true },
      });

      if (
        userRole.role.roleName !== 'Product Owner' &&
        userRole.role.roleName !== 'Scrum Master'
      ) {
        throw new ForbiddenException(
          'You do not have permission to delete this sprint.',
        );
      }

      return await this.prisma.sprint.delete({
        where: { id: sprintId },
      });
    } catch (error) {
      console.error('Error deleting sprint', error);
      throw error instanceof ForbiddenException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('An unexpected error occurred.');
    }
  }

  async sendPushNotification(token: string, title: string, body: string) {
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Push token ${token} is not a valid Expo push token`);
      return;
    }

    let messages = [];

    messages.push({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: { withSome: 'data' },
    });

    console.log('Messages to be sent:', messages);

    let chunks = this.expo.chunkPushNotifications(messages);
    let tickets = [];

    for (let chunk of chunks) {
      try {
        let ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        console.log(ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }
  }
}
