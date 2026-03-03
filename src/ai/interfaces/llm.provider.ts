import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage } from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';

export interface ChatLLM {
  readonly instance: BaseChatModel;

  invoke(messages: BaseMessage[]): Promise<any>;
  stream(
    messages: BaseMessage[] | BaseMessage,
  ): Promise<IterableReadableStream<string>>;
}
