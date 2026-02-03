import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [AiModule, RagModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
