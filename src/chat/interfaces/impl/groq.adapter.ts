import { ChatGroq } from '@langchain/groq';
import { ChatLLM } from '../llm.provider';

export class GroqLLM implements ChatLLM {
  private llm: ChatGroq;

  constructor(apiKey: string, model: string) {
    this.llm = new ChatGroq({
      apiKey,
      model,
      temperature: 0.7,
    });
  }

  invoke(messages) {
    return this.llm.invoke(messages);
  }
}
