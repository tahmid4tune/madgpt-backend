import { Inject, Injectable } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectConnection, Knex } from 'nestjs-knex';
import { systemMessage } from './utils/system-message';
import { ChatLLM } from '../ai/interfaces/llm.provider';
import { LLMFactory } from '../ai/factory/llm.factory';
import { RagService } from '../rag/rag.service';
import { ChatGroq } from '@langchain/groq';
import {
  StateGraph,
  MessagesAnnotation,
  END,
  START,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
//import { McpClientService } from '../mcp-server-module/mcp-client.service';
import { z } from 'zod';

@Injectable()
export class ChatService {
  private llm: ChatLLM;
  private model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    temperature: 0.7,
  });
  constructor(
    private readonly llmFactory: LLMFactory,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    @InjectConnection('dbConnection')
    private readonly db: Knex,
    private readonly ragService: RagService,
    //    private readonly mcpClientService: McpClientService,
  ) {}

  async handlePrompt(dto: ChatDto) {
    this.llm = this.llmFactory.create(dto.provider, dto.model);
    const history = await this.fetchChatHistory(dto);
    let lcMessages = [...history, new HumanMessage(dto.prompt)];
    const ragContext = await this.ragService.retrieveContext(dto.prompt);

    const response = await this.llm.invoke(
      ragContext
        ? [
            new SystemMessage(
              `You are an assistant answering questions using ONLY the context below.
        If the answer is not present, say you don't know.
        Context:
        ${ragContext}`,
            ),
            ...lcMessages,
          ]
        : lcMessages,
    );

    if (!response) {
      throw new Error('LLM returned empty response');
    }

    const aiMessage = new AIMessage(response.content);
    if (lcMessages.length > 0 && lcMessages[0] instanceof SystemMessage) {
      lcMessages = lcMessages.slice(1);
    }
    await this.cacheManager.set(
      dto.chatId,
      [...lcMessages, aiMessage],
      3600 * 1000,
    );
    this.persistChat(dto, aiMessage);
    return aiMessage;
  }

  async *streamResponse(dto: ChatDto) {
    this.llm = this.llmFactory.create(dto.provider, dto.model);
    const nativeModel = this.llm.instance;

    const ragTool = tool(
      async ({ query }) => {
        const context = await this.ragService.retrieveContext(query);
        return (
          context || 'No specific information found in the knowledge base.'
        );
      },
      {
        name: 'search_docs',
        description:
          'Searches internal knowledge base for answering questions about specific persons.',
        schema: z.object({ query: z.string() }),
      },
    );
    const tools = [ragTool];
    const toolNode = new ToolNode(tools);

    // Bind tools to the model so it knows how to call them
    const modelWithTools = nativeModel.bindTools(tools);

    // 2. Define the Graph Nodes
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const response = await modelWithTools.invoke(state.messages);
      return { messages: [response] };
    };

    // Logic to decide: continue to tools or finish?
    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
      const lastMessage = state.messages[state.messages.length - 1];
      // If the LLM made tool calls, we go to the "tools" node
      if ((lastMessage as any).tool_calls?.length) {
        return 'tools';
      }
      return END;
    };
    // 3. Build the Graph
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode('tools', toolNode)
      .addNode('agent', callModel)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', shouldContinue)
      .addEdge('tools', 'agent'); // After tools, go back to agent to summarize

    const agent = workflow.compile();

    const history = await this.fetchChatHistory(dto);
    let lcMessages = [...history, new HumanMessage(dto.prompt)];
    const input = { messages: lcMessages };
    const eventStream = agent.streamEvents(input, { version: 'v2' });
    let fullAiContent = '';
    for await (const event of eventStream) {
      // Filter for the final response generation tokens
      if (event.event === 'on_chat_model_stream') {
        const content = event.data.chunk.content;
        if (content) {
          fullAiContent += content;
          yield { data: content };
        }
      }
    }
    // 5. Persistence
    if (fullAiContent) {
      const aiMessage = new AIMessage(fullAiContent);
      if (lcMessages.length > 0 && lcMessages[0] instanceof SystemMessage) {
        lcMessages = lcMessages.slice(1);
      }
      await this.cacheManager.set(
        dto.chatId,
        [...lcMessages, aiMessage],
        3600 * 1000,
      );

      await this.persistChat(dto, aiMessage);
    }
    /*
    const stream = await this.llm.stream(
      ragContext
        ? [
            new SystemMessage(
              `You are an assistant answering questions using ONLY the context below.
      If the answer is not present, say you don't know.
      Context:
      ${ragContext}`,
            ),
            ...lcMessages,
          ]
        : lcMessages,
    );
    let aiMessageStr = '';
    for await (const chunk of stream) {
      // 1. Extract the content from the chunk object
      const content =
        typeof chunk === 'string'
          ? chunk
          : ((chunk as any)?.content as string) || '';

      // 2. Accumulate for your DB/Cache
      aiMessageStr += content;

      // 3. Yield to the frontend immediately
      if (content) {
        yield { data: content };
      }
    }
    if (!aiMessageStr) {
      throw new Error('LLM returned empty response');
    }
    const aiMessage = new AIMessage(aiMessageStr);
    if (lcMessages.length > 0 && lcMessages[0] instanceof SystemMessage) {
      lcMessages = lcMessages.slice(1);
    }
    await this.cacheManager.set(
      dto.chatId,
      [...lcMessages, aiMessage],
      3600 * 1000,
    );

    this.persistChat(dto, aiMessage);
    */
    yield { data: '##[DONE]##' };
  }

  async fetchChatHistory(dto: ChatDto): Promise<any> {
    const previousMessages: any[] = await this.getMessagesByChatId(dto.chatId);
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
    await this.db
      .withSchema('chat')
      .insert({
        id: dto.chatId,
        name: dto.prompt.substring(0, 20),
      })
      .into('chats_meta_data');
  }

  async getMessagesByChatId(id: string) {
    let chatHistory: any[] = await this.cacheManager.get(id);
    if (!chatHistory) {
      /*const firstMessage = new AIMessage(
        "Hi! This is Jarvis. What's on your mind?",
      );*/
      const chat = await this.getChatHistoryFromDBById(id);

      if (!!!chat) {
        await this.cacheManager.set(id, [systemMessage], 3600 * 1000);
        return [];
      }
      chatHistory = await this.hydrateChatHistory(id, chat);
    }
    //Removing system message
    //return chatHistory.slice(1);
    return chatHistory;
  }

  async getChatHistoryList() {
    return await this.db
      .withSchema('chat')
      .select('id', 'name')
      .from('chats_meta_data');
  }

  async getChatHistoryFromDBById(id: string) {
    return await this.db
      .withSchema('chat')
      .where('chat_id', id)
      .from('chats_messages');
  }

  async hydrateChatHistory(id: string, chatMessages: any[]): Promise<any[]> {
    const hydrated = chatMessages.map((m) => {
      let content = m.content.trim(); // <--- trim leading/trailing whitespace

      // check if it looks like JSON (after trimming)
      if (content.startsWith('```json')) {
        try {
          content = content.replace('```json', '');
          content = content.replace(' ```', '');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            // flatten all 'text' fields into one string
            content = parsed.map((p) => p.text).join(' ');
          } else if (parsed.text) {
            content = parsed.text;
          }
        } catch (e) {
          // ignore parsing errors, fallback to raw string
        }
      }

      return m.role === 'user'
        ? new HumanMessage(content)
        : new AIMessage(content);
    });

    await this.cacheManager.set(id, [systemMessage, ...hydrated], 3600 * 1000);
    return hydrated;
  }

  async persistChat(dto: ChatDto, aiMessage: AIMessage) {
    const rowsToInsert = [
      { chat_id: dto.chatId, role: 'user', content: dto.prompt },
      { chat_id: dto.chatId, role: 'assistant', content: aiMessage.content },
    ];
    await this.db
      .withSchema('chat')
      .insert(rowsToInsert)
      .into('chats_messages');
  }

  async deleteChatHistory(chatId: string) {
    await Promise.all([
      this.db
        .withSchema('chat')
        .delete()
        .where('chat_id', chatId)
        .from('chats_messages'),
      this.db
        .withSchema('chat')
        .delete()
        .where('id', chatId)
        .from('chats_meta_data'),
    ]);
  }

  async toolCallIfNeeded(response: any) {
    let parsed: any;
    try {
      parsed = JSON.parse(response.content);
      if (parsed?.tool) {
        /*   const toolResult = await this.mcpClientService.callTool(
          parsed.tool,
          parsed.arguments || {},
        );
      */
      }
    } catch (error) {
      parsed = null;
    }
  }
}
