import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDFs allowed');
    }
    return this.documentService.uploadPdf(file);
  }
}
