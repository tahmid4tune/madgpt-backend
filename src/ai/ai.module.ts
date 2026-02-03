import { Module } from '@nestjs/common';
import { LLMFactory } from './factory/llm.factory';

@Module({
  providers: [LLMFactory],
  exports: [LLMFactory],
})
export class AiModule {}
