import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { User } from './user.model';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getAllUser(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async getUser(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: Number(id) } });
  }

  async updateUserProfileImage(
    userId: number,
    imageUrl: string,
  ): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage: imageUrl },
    });
    return user;
  }

  /*async createUser(data: User): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }*/

  async createUser(data: User): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

    if (existing) {
      throw new ConflictException('email already exist');
    }
    return this.prisma.user.create({ data });
  }

  async updateUser(id: Number, data: User): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.update({
      where: { id: Number(id) },
      data: {
        fullname: data.fullname,
        email: data.email,
        password: hashedPassword,
      },
    });
  }

  async deleteUser(id: Number): Promise<User> {
    return this.prisma.user.delete({
      where: { id: Number(id) },
    });
  }

  async deleteUserByIdAndCredentials(
    userId: number,
    email: string,
    password: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sentMessages: true,
        receivedMessages: true,
        invitations: true,
        createdProjects: {
          include: {
            invitations: true,
            tasks: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== email) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.prisma.message.deleteMany({
      where: { fromId: userId },
    });

    await this.prisma.message.deleteMany({
      where: { toId: userId },
    });

    await this.prisma.invitationToProject.deleteMany({
      where: { invitedId: userId },
    });

    for (const project of user.createdProjects) {
      await this.prisma.invitationToProject.deleteMany({
        where: { projectId: project.id },
      });
      await this.prisma.task.deleteMany({
        where: { projectId: project.id },
      });
      await this.prisma.project.delete({
        where: { id: project.id },
      });
    }

    await this.prisma.user.delete({ where: { id: user.id } });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  }
}
