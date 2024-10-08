import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/authentication/auth.guard';
import { PrismaService } from 'src/prisma.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('messages')
  async getMessages(
    @Query('userId') userId: string,
    @Query('contactId') contactId: string,
  ) {
    const userIdNumber = parseInt(userId, 10);
    const contactIdNumber = parseInt(contactId, 10);
    return this.chatService.getMessages(userIdNumber, contactIdNumber);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sendMessage')
  async sendMessage(
    @Body() body: { from: number; to: number; message: string },
  ) {
    const { from, to, message } = body;
    return this.chatService.saveMessage(from, to, message);
  }

  @UseGuards(JwtAuthGuard)
  @Post('deleteMessages')
  async deleteMessages(
    @Body('userId') userId: number,
    @Body('contactId') contactId: number,
  ) {
    return this.chatService.deleteMessages(userId, contactId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/status')
  async getUserStatus(@Query('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
      select: { id: true, isOnline: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Post('save-token')
  @UseGuards(JwtAuthGuard)
  async saveToken(@Body() body: { token: string }, @Req() req: any) {
    const userId = req.user.id;
    return this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: body.token },
    });
  }
}
