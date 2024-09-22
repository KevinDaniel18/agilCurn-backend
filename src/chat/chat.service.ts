import { Injectable } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ChatService {
  private expo: Expo;
  constructor(
    private readonly prisma: PrismaService,
  ) {
    this.expo = new Expo();
  }

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

  async sendPushNotification(token: string, title: string, body: string) {
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Push token ${token} is not a valid Expo push token`);
      return;
    }

    let messages = [];

    messages.push({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: { withSome: 'data' },
    });

    let chunks = this.expo.chunkPushNotifications(messages);
    let tickets = [];

    for (let chunk of chunks) {
      try {
        let ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        console.log(ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }
  }
}
