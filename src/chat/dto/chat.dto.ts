import { IsString, IsUUID } from 'class-validator';

export class ChatDto {
  @IsUUID()
  chatId: string;

  @IsString()
  prompt: string;
}
