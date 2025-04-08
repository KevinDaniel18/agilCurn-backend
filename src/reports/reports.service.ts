import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ReportsGateway } from './reports.gateway';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from 'src/notification.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: ReportsGateway,
    private notificationService: NotificationService,
  ) {}

  @Cron('0 0 * * 0')
  async handleCron() {
    await this.getBottlenecks();
  }

  async getProjectStatus(): Promise<any> {
    const projects = await this.prisma.project.findMany({
      include: {
        tasks: true,
      },
    });

    return projects.map((project) => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(
        (task) => task.status === 'DONE',
      ).length;
      const progressPercentage = totalTasks
        ? (completedTasks / totalTasks) * 100
        : 0;

      return {
        projectId: project.id,
        projectName: project.projectName,
        startDate: project.startDate,
        endDate: project.endDate,
        progressPercentage,
      };
    });
  }

  async getTeamProductivity(
    projectId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { assignee: true, creator: true },
    });

    const productivity = tasks.reduce((acc, task) => {
      const user = task.assignee || task.creator;
      if (user) {
        acc[user.id] = acc[user.id] || {
          userId: user.id,
          userName: user.fullname,
          profileImage: user.profileImage,
          completedTasks: 0,
          inProgressTasks: 0,
          incompleteTasks: 0,
        };

        if (task.status === 'DONE') {
          acc[user.id].completedTasks += 1;
        } else if (task.status === 'IN_PROGRESS') {
          acc[user.id].inProgressTasks += 1;
        } else {
          acc[user.id].incompleteTasks += 1;
        }
      }
      return acc;
    }, {});

    return Object.values(productivity);
  }

  async getBottlenecks(): Promise<any> {
    const bottleneckThreshold = 7;
    const now = new Date();
    const tasks = await this.prisma.task.findMany({
      where: { status: { in: ['IN_PROGRESS', 'TODO'] } },
      include: { project: true, assignee: true, creator: true },
    });

    const bottlenecks = tasks.filter((task) => {
      const daysInProgress =
        (new Date().getTime() - new Date(task.updatedAt).getTime()) /
        (1000 * 60 * 60 * 24);

      return daysInProgress > bottleneckThreshold;
    });

    for (const task of bottlenecks) {
      const isProjectOver = new Date(task.project.endDate) < now;

      if (!isProjectOver) {
        const recipientToken =
          task.assignee?.expoPushToken || task.creator?.expoPushToken;
        if (recipientToken) {
          await this.notificationService.sendPushNotification(
            recipientToken,
            'Bottleneck Alert',
            `The task "${task.title}" from the project ${task.project.projectName} has been in progress for more than ${bottleneckThreshold} days.`,
            {
              type: 'report',
              projectId: task.project.id,
              projectName: task.project.projectName,
              startDate: task.project.startDate.toISOString(),
              endDate: task.project.endDate.toISOString(),
            },
          );
        }
      }
    }

    if (bottlenecks.length > 0) {
      this.notificationsGateway.sendBottleneckNotification(
        'Tienes varios bottlenecks',
      );
      console.log('Nuevo bottleneck');
    } else {
    }

    return bottlenecks.map((task) => ({
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      projectName: task.project.projectName,
      daysInProgress: Math.floor(
        (new Date().getTime() - new Date(task.updatedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));
  }
}
