import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { R2Service } from './r2.service';
import { randomUUID } from 'crypto';
import 'multer';

@Injectable()
export class FileService {
  constructor(
    private prisma: PrismaService,
    private r2: R2Service,
  ) {}

  async upload(file: Express.Multer.File, uploadedById: string) {
    const ext = file.originalname.split('.').pop();
    const key = `uploads/${Date.now()}-${randomUUID()}.${ext}`;

    const { url, bucket } = await this.r2.upload(
      key,
      file.buffer,
      file.mimetype,
    );

    return this.prisma.file.create({
      data: {
        fileName: key.split('/').pop()!,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        bucket,
        key,
        uploadedById,
      },
    });
  }

  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async getSignedUrl(id: string) {
    const file = await this.findOne(id);
    const signedUrl = await this.r2.getSignedUrl(file.key);
    return { ...file, signedUrl };
  }

  async remove(id: string) {
    const file = await this.findOne(id);
    await this.r2.delete(file.key);
    return this.prisma.file.delete({ where: { id } });
  }
}
