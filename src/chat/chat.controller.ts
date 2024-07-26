import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/authentication/auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
  @Post('deleteMessages')
  async deleteMessages(
    @Body('userId') userId: number,
    @Body('contactId') contactId: number,
  ) {
    return this.chatService.deleteMessages(userId, contactId);
  }
}
