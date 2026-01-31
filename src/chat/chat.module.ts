import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { LLMFactory } from './factory/llm.factory';

@Module({
  controllers: [ChatController],
  providers: [ChatService, LLMFactory],
})
export class ChatModule {}
