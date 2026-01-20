import { Inject, Injectable } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ChatService {
  private readonly groq: Groq;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async handlePrompt(dto: ChatDto) {
    const messages = await this.fetchChatHistory(dto);
    const completion = await this.groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: messages,
    });
    if (completion.choices[0]?.message) {
      await this.cacheManager.set(
        dto.chatId,
        [...messages, completion.choices[0]?.message],
        3600 * 1000,
      );
    }
    return completion.choices[0]?.message || {};
  }

  async fetchChatHistory(dto: ChatDto): Promise<any> {
    const memoryMessage = {
      role: 'system',
      content: 'Hi, I am a smart chatbot. How can I help you today?',
    };

    const previousChatHistory: any[] = await this.cacheManager.get(dto.chatId);
    if (!previousChatHistory) {
      await this.cacheManager.set(
        dto.chatId,
        [memoryMessage, { role: 'user', content: dto.prompt }],
        3600 * 1000,
      );
      return [memoryMessage, { role: 'user', content: dto.prompt }];
    }
    if (previousChatHistory && previousChatHistory.length == 1) {
      await this.saveChatName(dto);
    }

    return [...previousChatHistory, { role: 'user', content: dto.prompt }];
  }

  async saveChatName(dto: ChatDto) {
    const cacheKey = 'chat-history-list';

    const chatHistoryList: any[] =
      (await this.cacheManager.get(cacheKey)) || [];

    const updatedList = [
      ...chatHistoryList.filter((c) => c.id !== dto.chatId),
      { id: dto.chatId, name: dto.prompt.substring(0, 20) },
    ];

    await this.cacheManager.set(cacheKey, updatedList, 3600 * 1000);
  }

  async getMessagesByChatId(id: string) {
    const chatHistory: any[] = await this.cacheManager.get(id);
    if (!chatHistory) {
      const firstMessage = {
        role: 'system',
        content: 'Hi, I am a smart chatbot. How can I help you today?',
      };
      await this.cacheManager.set(id, [firstMessage], 3600 * 1000);
      return [firstMessage];
    }
    return chatHistory;
  }

  async getChatHistory() {
    const chatHistory = await this.cacheManager.get('chat-history-list');
    return chatHistory || [];
  }
}
