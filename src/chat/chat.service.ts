import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async saveMessage(fromId: number, toId: number, message: string) {
    return this.prisma.message.create({
      data: {
        fromId,
        toId,
        message,
      },
    });
  }

  async getMessages(userId: number, contactId: number) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { fromId: userId, toId: contactId },
          { fromId: contactId, toId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findUserById(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async deleteMessages(userId: number, contactId: number) {
    await this.prisma.message.updateMany({
      where: {
        fromId: userId,
        toId: contactId,
      },
      data: {
        deletedBy: userId,
      },
    });

    // Actualiza los mensajes recibidos por el usuario
    await this.prisma.message.updateMany({
      where: {
        fromId: contactId,
        toId: userId,
      },
      data: {
        deletedBy: userId,
      },
    });

    return { message: 'Messages deleted successfully' };
  }
}
