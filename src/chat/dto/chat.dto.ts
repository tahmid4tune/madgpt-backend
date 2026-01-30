import { IsString, IsUUID, IsIn } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';

export class ChatDto {
  @IsString()
  model: string;

  @IsUUID()
  chatId: string;

  @IsString()
  prompt: string;
}

export class ChatMessageResponseDto {
  @Expose()
  @IsIn(['system', 'user', 'assistant'])
  @Transform(({ obj }) => {
    if (obj instanceof HumanMessage) return 'user';
    if (obj instanceof AIMessage) return 'assistant';
    if (obj instanceof SystemMessage) return 'system';
    return 'system';
  })
  role: 'system' | 'user' | 'assistant';

  @Expose()
  @IsString()
  @Transform(({ obj }) => obj.content)
  content: string;
}
