import { OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, Knex } from 'nestjs-knex';

@Injectable()
export class RagService {
  private embeddings: OllamaEmbeddings;

  constructor(
    private readonly configService: ConfigService,
    @InjectConnection('dbConnection')
    private readonly db: Knex,
  ) {
    this.embeddings = new OllamaEmbeddings({
      baseUrl: configService.get('OLLAMA_BASE_URL'),
      model: 'nomic-embed-text',
    });
  }

  async embedText(text: string): Promise<number[]> {
    return await this.embeddings.embedQuery(text);
  }

  async retrieveContext(prompt: string): Promise<string | null> {
    const embedding = await this.embedText(prompt);

    const results = await this.similaritySearch(embedding, 3);
    console.log('results:', results);
    if (!results.length) return null;
    if (results[0].similarity < 0.5) return null;

    return results.map((r) => r.content).join('\n\n---\n\n');
  }

  async similaritySearch(embedding: number[], limit = 1) {
    const rows = await this.db
      .select([
        'id',
        'name',
        'content',
        this.db.raw(
          '1 - (embedding <=> ?) AS similarity',
          `[${embedding.join(',')}]`,
        ),
      ])
      .from('knowledge.documents')
      .orderByRaw('embedding <=> ?', `[${embedding.join(',')}]`)
      .limit(limit);

    return rows;
  }
}
