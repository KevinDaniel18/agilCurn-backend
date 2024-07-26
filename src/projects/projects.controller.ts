import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { InvitationToProject, Project, User } from '@prisma/client';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectService: ProjectsService) {}

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
    @Body('userId', ParseIntPipe) userId: number,
  ): Promise<InvitationToProject> {
    return this.projectService.inviteUserToProject(projectId, userId);
  }

  @Get('confirm-invitation/:id')
  async confirmInvitation(
    @Param('id', ParseIntPipe) invitationId: number,
  ): Promise<Project> {
    return this.projectService.confirmInvitation(invitationId);
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
}
