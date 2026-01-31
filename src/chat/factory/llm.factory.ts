import { ConfigService } from '@nestjs/config';
import { ChatLLM } from '../interfaces/llm.provider';
import { GroqLLM } from '../interfaces/impl/groq.adapter';
import { OllamaLLM } from '../interfaces/impl/ollama.adapter';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LLMFactory {
  constructor(private readonly config: ConfigService) {}

  create(provider: string, model: string): ChatLLM {
    switch (provider) {
      case 'groq':
        return new GroqLLM(this.config.get('GROQ_API_KEY'), model);

      case 'ollama':
        return new OllamaLLM(this.config.get('OLLAMA_BASE_URL'), model);

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
