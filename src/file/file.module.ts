import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { R2Service } from './r2.service';

@Module({
  controllers: [FileController],
  providers: [FileService, R2Service],
  exports: [FileService, R2Service],
})
export class FileModule {}
