export interface LLMProvider {
  generate(messages: any[]): Promise<any>;
}
