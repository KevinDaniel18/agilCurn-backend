import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Project,
  InvitationToProject,
  User,
  ProjectDocument,
} from '@prisma/client';
import { MailService } from 'src/mail.service';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private userService: UserService,
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

    const project = await this.prisma.project.create({
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

    return project;
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
      const confirmationLink = `${process.env.URL_LOCAL}/projects/confirm-invitation/${invitation.id}`;
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
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (project.creatorId === userId) {
        throw new BadRequestException(
          'You cannot invite yourself to your own project',
        );
      }

      const existingInvitation =
        await this.prisma.invitationToProject.findFirst({
          where: {
            projectId,
            invitedId: userId,
            confirmed: true,
          },
        });

      if (existingInvitation) {
        throw new ConflictException(
          'The user is already invited or has confirmed the invitation',
        );
      }

      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userExists) {
        throw new NotFoundException('User not found');
      }
      return this.createInvitation({ projectId, invitedId: userId });
    } catch (error) {
      console.error('Error in InviteUserToProject', error);
      throw error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('An unexpected error occurred.');
    }
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

  async uploadDocument(
    projectId: number,
    file: Express.Multer.File,
    uploaderId: number,
  ): Promise<ProjectDocument> {
    const fileUrl = `/uploads/${file.filename}`;
    return this.prisma.projectDocument.create({
      data: {
        fileName: file.originalname,
        fileUrl,
        project: { connect: { id: projectId } },
        uploader: { connect: { id: uploaderId } },
      },
    });
  }

  async getProjectDocuments(projectId: number): Promise<ProjectDocument[]> {
    return this.prisma.projectDocument.findMany({
      where: { projectId },
      include: {
        uploader: { select: { id: true, fullname: true, profileImage: true } },
      },
    });
  }

  async deleteDocument(
    userId: number,
    projectId: number,
    documentId: number,
  ): Promise<void> {
    const document = await this.prisma.projectDocument.findUnique({
      where: { id: documentId, projectId: projectId },
      include: { project: true, uploader: true },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const isCreator = document.project.creatorId === userId;
    const isUploader = document.uploaderId === userId;

    // Verificar si el usuario es el creador del proyecto o el uploader del documento
    if (!isCreator && !isUploader) {
      throw new Error('You are not authorized to delete this document');
    }

    // Si pasa las validaciones, eliminar el documento
    await this.prisma.projectDocument.delete({
      where: { id: documentId },
    });
  }
}
