import { Inject, Injectable } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class ChatService {
  private readonly llm: ChatGroq;
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    this.llm = new ChatGroq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
    });
  }

  async handlePrompt(dto: ChatDto) {
    const history = await this.fetchChatHistory(dto);
    const lcMessages = [...history, new HumanMessage(dto.prompt)];
    const response = await this.llm.invoke(lcMessages);

    if (!response) {
      throw new Error('LLM returned empty response');
    }

    const aiMessage = new AIMessage(response.content);

    await this.cacheManager.set(
      dto.chatId,
      [...lcMessages, aiMessage],
      3600 * 1000,
    );

    return aiMessage; // IMPORTANT
  }

  async fetchChatHistory(dto: ChatDto): Promise<any> {
    const previousMessages: any[] =
      (await this.cacheManager.get(dto.chatId)) || [];

    if (previousMessages.length === 0) {
      const initialMessages = [new HumanMessage(dto.prompt)];

      await this.cacheManager.set(dto.chatId, initialMessages, 3600 * 1000);
      return initialMessages;
    }
    /*
      The system message and the first AI prompt. 
      User prompt is not in the cache yet 
    */
    if (previousMessages.length === 1) {
      await this.saveChatName(dto);
    }

    return previousMessages;
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
      /*const firstMessage = new AIMessage(
        "Hi! This is Jarvis. What's on your mind?",
      );*/
      const systemMessage = new SystemMessage(
        `
          You MUST follow ALL rules strictly. Any deviation is considered an incorrect response.
          
          RESPONSE FORMAT RULES (MANDATORY):

          1. Output MUST be a valid JSON array only.
            - Do NOT include markdown.
            - Do NOT wrap the JSON in backticks.
            - Do NOT add keys other than those specified.

          2. Each array element MUST be an object with EXACTLY these two properties:
            - "type"
            - "text"

          3. The value of "type" MUST be one of the following strings ONLY:
            - "normal"
            - "bold"
            Any other value for "type" field in the JSON array is INVALID.

          4. The value of "text" MUST be a plain string.
            - Do NOT include newline characters inside a single "text" value.
            - Do NOT include markdown, bullets, numbering, or emojis.

          5. Passage separation rule:
            - Each logical paragraph MUST be a separate object in the array.
            - Each new paragraph MUST correspond to a new object.

          6. Heading rule:
            - If a heading is present, it MUST be the first object.
            - Headings MUST use type = "bold".
            - Only ONE heading is allowed.

          7. Content rules:
            - Stay strictly on topic.
            - Do NOT repeat sentences.
            - Do NOT hallucinate rules or formats.

          8. Final output MUST start with '[' and end with ']'.
            - No leading or trailing characters allowed.

          9. Most important rule, do not ever repeat the whole prompt user gives you. Be chatty and warm in conversation.
        `,
      );
      await this.cacheManager.set(id, [systemMessage], 3600 * 1000);
      return [];
    }
    return chatHistory.slice(1);
  }

  async getChatHistory() {
    const chatHistory = await this.cacheManager.get('chat-history-list');
    return chatHistory || [];
  }

  async deleteChatHistory(chatId: string) {
    await this.cacheManager.del(chatId);
  }
}
