import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(fromId: number, toId: number, message: string) {
    return this.prisma.message.create({
      data: {
        fromId,
        toId,
        message,
      },
      select: {
        id: true,
        createdAt: true,
        message: true,
        fromId: true,
        toId: true,
        deletedBy: true,
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
    await this.prisma.message.deleteMany({
      where: {
        OR: [
          { fromId: userId, toId: contactId },
          { fromId: contactId, toId: userId },
        ],
      },
    });
    return { message: 'Messages deleted successfully' };
  }
}
