import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatDto, ChatMessageResponseDto } from './dto/chat.dto';
import { plainToInstance } from 'class-transformer';

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
  async getMessagesByChatId(@Param('chatId') id: string) {
    const message = await this.chatService.getMessagesByChatId(id);
    return plainToInstance(ChatMessageResponseDto, message, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':chatId')
  deleteThreadByChatId(@Param('chatId') id: string) {
    return this.chatService.deleteChatHistory(id);
  }
}
