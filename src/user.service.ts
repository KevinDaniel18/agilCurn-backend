import { ConflictException, Injectable } from '@nestjs/common';
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
        repeatPassword: data.repeatPassword,
      },
    });
  }

  async deleteUser(id: Number): Promise<User> {
    return this.prisma.user.delete({
      where: { id: Number(id) },
    });
  }
}
