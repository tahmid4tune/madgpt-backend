import { ChatGroq } from '@langchain/groq';
import { ChatLLM } from '../llm.provider';
import { BaseMessage } from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { StringOutputParser } from '@langchain/core/output_parsers';

export class GroqLLM implements ChatLLM {
  private llm: ChatGroq;

  constructor(apiKey: string, model: string) {
    this.llm = new ChatGroq({
      apiKey,
      model,
      temperature: 0.7,
    });
  }

  invoke(messages: BaseMessage[]) {
    return this.llm.invoke(messages);
  }

  async stream(
    messages: BaseMessage[],
  ): Promise<IterableReadableStream<string>> {
    const parser = new StringOutputParser();
    // Create a simple chain
    const chain = this.llm.pipe(parser);
    return await chain.stream(messages);
  }
}
