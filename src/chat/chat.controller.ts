import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Sse,
  Query,
  MessageEvent,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatDto, ChatMessageResponseDto } from './dto/chat.dto';
import { plainToInstance } from 'class-transformer';
import { from, map, Observable } from 'rxjs';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  handlePrompt(@Body() dto: ChatDto) {
    return this.chatService.handlePrompt(dto);
  }

  @Sse('stream')
  stream(@Query() dto: ChatDto): Observable<MessageEvent> {
    return from(this.chatService.streamResponse(dto)).pipe(
      map(
        (chunk) =>
          ({
            data: chunk.data,
            id: undefined, // Tell NestJS not to generate/include the ID
          }) as MessageEvent,
      ),
    );
  }

  @Get('history')
  getChatHistory() {
    return this.chatService.getChatHistoryList();
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
