import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class ReportsGateway {
  @WebSocketServer()
  server: Server;

  sendBottleneckNotification(message: string) {
    this.server.emit('bottleneckAlert', { message });
  }

  sendNoBottleneckNotification(userId: number) {
    this.server.emit('noBottlenecks', { userId });
  }
}
