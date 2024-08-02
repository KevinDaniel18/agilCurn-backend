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

interface ChatMessage {
  to: number;
  message: string;
}

interface TypingPayload {
  to: number;
  typing: boolean;
}

@WebSocketGateway({
  cors: {
    origin: [
      'https://agil-curn-backend.vercel.app',
      'https://new-password-agil-curn.vercel.app',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
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
      client.data.user = decoded;
      this.users.set(decoded.id, client);
      console.log('Client connected:', decoded);
    } catch (e) {
      console.log('Unauthorized client');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.users.delete(user.id);
    }
    console.log('Client disconnected:', client.id);
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
      await this.chatService.saveMessage(
        user.id,
        chatMessage.to,
        chatMessage.message,
      );
      if (targetSocket) {
        targetSocket.emit('receiveMessage', {
          from: sender.fullname,
          message: chatMessage.message,
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
