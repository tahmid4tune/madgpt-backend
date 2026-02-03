import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { InjectConnection, Knex } from 'nestjs-knex';
import { RagService } from '../rag/rag.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentType } from './types';

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
    // 2. Chunk the text
    const chunks = await this.splitText(text);
    // 3. Generate embedding
    const rows: DocumentType[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await this.generateEmbedding(chunks[i]);
      rows.push({
        name: file.originalname,
        content: chunks[i],
        embedding: `[${embedding.join(',')}]`,
        chunk_id: i,
      });
    }
    return await this.saveDocument(rows);
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

  async saveDocument(rows: DocumentType[]) {
    await this.db.withSchema('knowledge').insert(rows).into('documents');
  }

  async splitText(text: string) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
    });

    return await splitter.splitText(text);
  }
}
