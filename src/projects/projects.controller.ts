import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  Request,
  UseGuards,
  DefaultValuePipe,
  Query,
  Patch,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  InvitationToProject,
  Project,
  ProjectDocument,
  User,
} from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from 'src/prisma.service';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/authentication/auth.guard';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectService: ProjectsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  async createProject(
    @Body()
    projectData: {
      projectName: string;
      startDate: Date;
      endDate: Date;
      creatorId: number;
    },
  ): Promise<Project> {
    return this.projectService.createProject(projectData);
  }

  @Get()
  async getProjects(): Promise<Project[]> {
    return this.projectService.getProjects();
  }

  @Get('user/:userId')
  async getUserProjects(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<Project[]> {
    return this.projectService.getUserProjects(userId);
  }

  @Delete(':id')
  async deleteProject(@Param('id', ParseIntPipe) id: number): Promise<Project> {
    console.log(`Attempting to delete project with ID: ${id}`);
    return this.projectService.deleteProject(id);
  }

  @Post(':id/invite')
  async inviteUser(
    @Param('id', ParseIntPipe) projectId: number,
    @Body('roleId', ParseIntPipe) roleId: number,
    @Body('userId') userId?: string,
    @Body('email') email?: string,
  ): Promise<InvitationToProject> {
    return this.projectService.inviteUserToProject(
      projectId,
      roleId,
      parseInt(userId),
      email,
    );
  }

  @Get('confirm-invitation/:id/:roleId')
  async confirmInvitation(
    @Param('id', ParseIntPipe) invitationId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<Project> {
    console.log('Confirm invitation endpoint hit:', invitationId, roleId);
    return this.projectService.confirmInvitation(invitationId, roleId);
  }

  @Delete(':id/leave')
  async leaveProject(
    @Param('id', ParseIntPipe) projectId: number,
    @Body('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    return this.projectService.leaveProject(projectId, userId);
  }

  @Get(':id/invited-users')
  async getInvitedUsers(
    @Param('id', ParseIntPipe) projectId: number,
  ): Promise<User[]> {
    return this.projectService.getInvitedUsers(projectId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateProject(
    @Param('id', ParseIntPipe) projectId: number,
    @Body() data: UpdateProjectDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    return this.projectService.updateProject(projectId, userId, data);
  }

  @Post(':id/documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard)
  async uploadDocument(
    @Param('id', ParseIntPipe) projectId: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ProjectDocument> {
    const uploaderId = req.user.id;
    return this.projectService.uploadDocument(projectId, file, uploaderId);
  }

  @Get(':id/documents')
  async getProjectDocuments(
    @Param('id', ParseIntPipe) projectId: number,
  ): Promise<ProjectDocument[]> {
    return this.projectService.getProjectDocuments(projectId);
  }

  @Delete(':projectId/documents/:documentId')
  @UseGuards(JwtAuthGuard)
  async deleteDocument(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user.id;
    await this.projectService.deleteDocument(userId, projectId, documentId);
  }

  @Get(':projectId/documents/:documentId/download')
  async downloadDocument(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Res() res: Response,
  ): Promise<void> {
    const document = await this.prisma.projectDocument.findUnique({
      where: { id: documentId, projectId: projectId },
    });

    if (!document) {
      res.status(404).send('Document not found');
    }

    const filePath = `./uploads/${document.fileUrl.split('/').pop()}`;
    res.download(filePath, document.fileName, (err) => {
      if (err) {
        console.error('Download failed', err);
        res.status(500).send('Error downloading the document');
      }
    });
  }

  @Get(':projectId/user-roles/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserRoles(
    @Param('projectId') projectId: number,
    @Param('userId') userId: number,
  ) {
    return await this.prisma.userRole.findMany({
      where: { projectId, userId },
      include: { role: true },
    });
  }
}
