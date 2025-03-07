import { Injectable } from '@nestjs/common';
import Expo from 'expo-server-sdk';

@Injectable()
export class NotificationService {
  private expo: Expo;
  constructor() {
    this.expo = new Expo();
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
