import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  handlePrompt(@Body() dto: ChatDto) {
    return this.chatService.handlePrompt(dto);
  }

  @Get('history')
  getChatHistory() {
    return this.chatService.getChatHistory();
  }

  @Get(':chatId')
  getMessagesByChatId(@Param('chatId') id: string) {
    return this.chatService.getMessagesByChatId(id);
  }
}
