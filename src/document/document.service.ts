import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { InjectConnection, Knex } from 'nestjs-knex';
import { RagService } from '../rag/rag.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly ragService: RagService,
    @InjectConnection('dbConnection')
    private readonly db: Knex,
  ) {}
  async uploadPdf(file: Express.Multer.File) {
    // 1. Extract text
    const text = await this.parseTextFromPdf(file);
    console.log(text);
    if (!text) {
      throw new BadRequestException('Empty PDF content');
    }
    // 2. Generate embedding
    const embedding = await this.generateEmbedding(text);
    await this.saveDocument(file.originalname, text, embedding);
  }

  async parseTextFromPdf(file: Express.Multer.File) {
    const uint8Array = new Uint8Array(file.buffer);
    const parser = new PDFParse(uint8Array);
    const parsed = await parser.getText();
    return parsed.text;
  }
  async generateEmbedding(text: string) {
    return await this.ragService.embedText(text);
  }

  async saveDocument(name: string, content: string, embedding: number[]) {
    await this.db
      .withSchema('knowledge')
      .insert({ name, content, embedding: `[${embedding.join(',')}]` })
      .into('documents');
  }
}
