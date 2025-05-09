import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  Project,
  InvitationToProject,
  User,
  ProjectDocument,
} from '@prisma/client';
import { MailService } from 'src/mail.service';
import { PrismaService } from 'src/prisma.service';
import { UpdateProjectDto } from './dto/update-project.dto';

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

    await this.prisma.userRole.create({
      data: {
        userId: data.creatorId,
        projectId: project.id,
        roleId: 1,
      },
    });

    return project;
  }

  async createInvitation(data: {
    projectId: number;
    roleId: number;
    invitedId?: number;
    email?: string;
  }): Promise<InvitationToProject> {
    const invitation = await this.prisma.invitationToProject.create({
      data: {
        projectId: data.projectId,
        invitedId: data.invitedId,
        confirmed: false,
      },
    });

    const confirmationLink = `${process.env.URL_PRODUCTION}/projects/confirm-invitation/${invitation.id}/${data.roleId}`;
    if (data.email) {
      await this.mailService.sendInvitationEmail(data.email, confirmationLink);
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: data.invitedId },
      });

      if (user) {
        await this.mailService.sendInvitationEmail(
          user.email,
          confirmationLink,
        );
      }
    }

    console.log(invitation);

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
    roleId: number,
    userId?: number,
    email?: string,
  ): Promise<InvitationToProject> {
    try {
      const valideRolesIds = [1, 2, 3];
      if (!valideRolesIds.includes(roleId)) {
        throw new BadRequestException(
          'Invalid roleId. It must be Scrum Master, Product Owner or Developer',
        );
      }

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw new NotFoundException('Role no found');
      }

      if (project.creatorId === userId) {
        throw new BadRequestException(
          'You cannot invite yourself to your own project',
        );
      }

      let invitedId: number | null = null;

      if (userId) {
        const userExists = await this.prisma.user.findUnique({
          where: { id: userId },
        });
        if (!userExists) {
          throw new NotFoundException('User not found');
        }
        invitedId = userId;
      } else if (email) {
        const userExists = await this.prisma.user.findUnique({
          where: { email },
        });
        if (!userExists) {
          throw new NotFoundException('User not found with this email');
        }
        invitedId = userExists.id;
      }

      // Comprobar si la invitación ya existe
      const existingInvitation =
        await this.prisma.invitationToProject.findFirst({
          where: {
            projectId,
            invitedId, // Usar el invitedId determinado
            confirmed: true,
          },
        });

      if (existingInvitation) {
        throw new ConflictException(
          'The user is already invited or has confirmed the invitation',
        );
      }

      return this.createInvitation({
        projectId,
        roleId,
        invitedId,
        email,
      });
    } catch (error) {
      console.error('Error in InviteUserToProject', error);
      throw error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('An unexpected error occurred.');
    }
  }

  async confirmInvitation(id: number, roleId: number): Promise<Project> {
    try {
      const invitation = await this.prisma.invitationToProject.findUnique({
        where: { id },
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.confirmed) {
        // If already confirmed, just return the project info
        return this.prisma.project.findUnique({
          where: { id: invitation.projectId },
          include: {
            userRoles: {
              include: {
                user: true,
                role: true,
              },
            },
          },
        });
      }
      await this.acceptInvitation(id);

      if (invitation.invitedId) {
        await this.prisma.userRole.create({
          data: {
            userId: invitation.invitedId,
            projectId: invitation.projectId,
            roleId: roleId,
          },
        });
      }

      return this.prisma.project.findUnique({
        where: { id: invitation.projectId },
        include: {
          userRoles: {
            include: {
              user: true,
              role: true,
            },
          },
        },
      });
    } catch (error) {
      console.error(error);
    }
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
          {
            userRoles: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        invitations: true,
        tasks: true,
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

    await this.prisma.userRole.deleteMany({
      where: { projectId },
    });

    await this.prisma.invitationToProject.deleteMany({
      where: { projectId },
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

    await this.prisma.userRole.deleteMany({
      where: {
        userId,
        projectId,
      },
    });
  }

  async getInvitedUsers(projectId: number): Promise<User[]> {
    const invitations = await this.prisma.invitationToProject.findMany({
      where: {
        projectId: projectId,
        confirmed: true,
      },
      include: {
        invited: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
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

  async updateProject(
    projectId: number,
    userId: number,
    data: UpdateProjectDto,
  ) {
    // Verificar rol admin
    const userRole = await this.prisma.userRole.findFirst({
      where: { userId, projectId, roleId: 1 },
    });

    if (!userRole) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este proyecto.',
      );
    }

    // Verificar existencia del proyecto
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { Sprint: true },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    // Validar fechas si se modificó startDate
    if (data.startDate) {
      const sprintsOutsideRange = project.Sprint.filter(
        (sprint) => sprint.startDate < new Date(data.startDate),
      );

      if (
        sprintsOutsideRange.length > 0 &&
        (!data.sprints || data.sprints.length === 0)
      ) {
        throw new BadRequestException({
          message:
            'Existen sprints cuya fecha de inicio es anterior a la nueva fecha de inicio del proyecto. Modifícalos antes de continuar.',
          sprints: sprintsOutsideRange.map(
            ({ id, sprintName, startDate, endDate }) => ({
              id,
              sprintName,
              startDate,
              endDate,
            }),
          ),
        });
      }
    }

    // Si se enviaron sprints actualizados, los actualizamos
    if (data.sprints && data.sprints.length > 0) {
      for (const sprint of data.sprints) {
        await this.prisma.sprint.update({
          where: { id: Number(sprint.id) },
          data: {
            sprintName: sprint.sprintName,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate),
          },
        });
      }
    }

    // Finalmente, actualizar el proyecto
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        projectName: data.projectName,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
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
