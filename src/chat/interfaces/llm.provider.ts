import { BaseMessage } from '@langchain/core/messages';

export interface ChatLLM {
  invoke(messages: BaseMessage[]): Promise<any>;
}
