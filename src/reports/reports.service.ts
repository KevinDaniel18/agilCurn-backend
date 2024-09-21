import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

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

  async getTeamProductivity(startDate: Date, endDate: Date): Promise<any> {
    const tasks = await this.prisma.task.findMany({
      where: {
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
    const tasks = await this.prisma.task.findMany({
      where: { status: { in: ['IN_PROGRESS', 'TODO'] } },
      include: { project: true },
    });

    const bottlenecks = tasks.filter((task) => {
      const daysInProgress =
        (new Date().getTime() - new Date(task.updatedAt).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysInProgress > bottleneckThreshold;
    });

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
