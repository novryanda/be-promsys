import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UsePipes,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentUser } from '../auth/auth.decorator';
import { ReimbursementService } from './reimbursement.service';
import { FileService } from '../file/file.service';
import {
  CreateReimbursementSchema,
  RejectReimbursementSchema,
} from './dto/reimbursement.dto';
import type {
  CreateReimbursementDto,
  RejectReimbursementDto,
} from './dto/reimbursement.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('api/reimbursements')
export class ReimbursementController {
  constructor(
    private readonly reimbursementService: ReimbursementService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateReimbursementSchema))
  create(
    @Body() body: CreateReimbursementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reimbursementService.create(body, userId);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.reimbursementService.findAll(userId, role);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.reimbursementService.findOne(id, userId, role);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.FINANCE)
  approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reimbursementService.approve(id, userId);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.FINANCE)
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RejectReimbursementSchema))
    body: RejectReimbursementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reimbursementService.reject(id, userId, body.rejectionReason);
  }

  @Patch(':id/pay')
  @Roles(Role.ADMIN, Role.FINANCE)
  markPaid(@Param('id') id: string) {
    return this.reimbursementService.markPaid(id);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  async addAttachment(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    const uploaded = await this.fileService.upload(file, userId);
    return this.reimbursementService.addAttachment(id, {
      fileName: uploaded.originalName,
      fileUrl: uploaded.url,
      fileSize: uploaded.size,
    });
  }
}
