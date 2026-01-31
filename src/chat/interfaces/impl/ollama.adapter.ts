import { ChatOllama } from '@langchain/ollama';
import { ChatLLM } from '../llm.provider';

export class OllamaLLM implements ChatLLM {
  private llm: ChatOllama;

  constructor(baseUrl: string, model: string) {
    this.llm = new ChatOllama({
      baseUrl,
      model,
      temperature: 0.7,
    });
  }

  invoke(messages) {
    return this.llm.invoke(messages);
  }
}
