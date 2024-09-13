import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/prisma.service';

interface ChatMessage {
  to: number;
  message: string;
}

interface TypingPayload {
  to: number;
  typing: boolean;
}

@WebSocketGateway({
  cors: true,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private users = new Map<number, Socket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.query.token as string;
    try {
      const decoded = this.jwtService.verify(token);
      console.log(decoded);

      client.data.user = decoded;
      this.users.set(decoded.id, client);
      this.server.emit('userStatus', { id: decoded.id, status: 'online' });
    } catch (e) {
      console.log('Unauthorized client');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.users.delete(user.id);
      this.server.emit('userStatus', { id: user.id, status: 'offline' });
      console.log('Client disconnected:', client.id);
    }
  }

  notifyTaskUpdate(task: any) {
    this.server.emit('taskUpdated', task);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() chatMessage: ChatMessage,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = client.data.user;
    const targetSocket = this.users.get(chatMessage.to);
    try {
      const sender = await this.chatService.findUserById(user.id);
      const savedMessage = await this.chatService.saveMessage(
        user.id,
        chatMessage.to,
        chatMessage.message,
      );
      console.log('Mensaje guardado:', savedMessage);

      if (targetSocket) {
        targetSocket.emit('receiveMessage', {
          from: sender.fullname,
          message: chatMessage.message,
          createdAt: savedMessage.createdAt,
        });
      }
      client.emit('messageStatus', {
        status: 'sent',
        to: chatMessage.to,
        message: chatMessage.message,
      });
    } catch (error) {
      client.emit('messageStatus', { status: 'error', error: error.message });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() typingPayload: TypingPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = client.data.user;
    const targetSocket = this.users.get(typingPayload.to);
    if (targetSocket) {
      targetSocket.emit('typing', {
        from: user.id,
        typing: typingPayload.typing,
      });
    }
  }
}
