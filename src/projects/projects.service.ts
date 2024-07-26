import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Project, InvitationToProject, User } from '@prisma/client';
import { MailService } from 'src/mail.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async createProject(data: {
    projectName: string;
    startDate: Date;
    endDate: Date;
    creatorId: number;
  }): Promise<Project> {
    if (data.creatorId === undefined || data.creatorId === null) {
      throw new Error('creatorId must be defined and not null');
    }
    console.log('Creating project with creatorId:', data.creatorId);

    return this.prisma.project.create({
      data: {
        projectName: data.projectName,
        startDate: data.startDate,
        endDate: data.endDate,
        creator: {
          connect: {
            id: data.creatorId,
          },
        },
      },
    });
  }

  async createInvitation(data: {
    projectId: number;
    invitedId: number;
  }): Promise<InvitationToProject> {
    const invitation = await this.prisma.invitationToProject.create({
      data,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: data.invitedId },
    });

    if (user) {
      const confirmationLink = `http://192.168.1.17:3000/projects/confirm-invitation/${invitation.id}`;
      await this.mailService.sendInvitationEmail(user.email, confirmationLink);
    }

    return invitation;
  }

  async acceptInvitation(id: number): Promise<InvitationToProject> {
    return this.prisma.invitationToProject.update({
      where: { id },
      data: { confirmed: true },
    });
  }

  async inviteUserToProject(
    projectId: number,
    userId: number,
  ): Promise<InvitationToProject> {
    return this.createInvitation({ projectId, invitedId: userId });
  }

  async confirmInvitation(id: number): Promise<Project> {
    await this.acceptInvitation(id);

    const invitation = await this.prisma.invitationToProject.findUnique({
      where: { id },
      select: { projectId: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return this.prisma.project.findUnique({
      where: { id: invitation.projectId },
    });
  }

  async getProjects(): Promise<Project[]> {
    return this.prisma.project.findMany();
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: {
        OR: [
          {
            creatorId: userId,
          },
          {
            invitations: {
              some: {
                invitedId: userId,
                confirmed: true,
              },
            },
          },
        ],
      },
    });
  }

  async deleteProject(projectId: number): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.invitationToProject.deleteMany({
      where: { projectId: projectId },
    });

    return this.prisma.project.delete({
      where: { id: projectId },
    });
  }

  async leaveProject(projectId: number, userId: number): Promise<void> {
    const invitation = await this.prisma.invitationToProject.findFirst({
      where: {
        projectId,
        invitedId: userId,
        confirmed: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or not confirmed');
    }

    await this.prisma.invitationToProject.delete({
      where: { id: invitation.id },
    });
  }

  async getInvitedUsers(projectId: number): Promise<User[]> {
    const invitations = await this.prisma.invitationToProject.findMany({
      where: {
        projectId: projectId,
        confirmed: true,
      },
      select: {
        invited: true,
      },
    });

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        creator: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return [
      project.creator,
      ...invitations.map((invitation) => invitation.invited),
    ];
  }
}
