import { BaseMessage } from '@langchain/core/messages';
import { IterableReadableStream } from '@langchain/core/utils/stream';

export interface ChatLLM {
  invoke(messages: BaseMessage[]): Promise<any>;
  stream(
    messages: BaseMessage[] | BaseMessage,
  ): Promise<IterableReadableStream<string>>;
}
