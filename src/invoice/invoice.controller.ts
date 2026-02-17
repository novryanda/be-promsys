import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { InvoiceService } from './invoice.service';
import { FileService } from '../file/file.service';
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  UpdateInvoiceStatusSchema,
} from './dto/invoice.dto';
import type {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  UpdateInvoiceStatusDto,
} from './dto/invoice.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('api/invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly fileService: FileService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.FINANCE)
  @UsePipes(new ZodValidationPipe(CreateInvoiceSchema))
  create(@Body() body: CreateInvoiceDto, @CurrentUser('id') userId: string) {
    return this.invoiceService.create(body, userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE, Role.PROJECTMANAGER)
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.invoiceService.findAll(userId, role);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FINANCE, Role.PROJECTMANAGER)
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FINANCE)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceSchema)) body: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.invoiceService.remove(id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.FINANCE)
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceStatusSchema))
    body: UpdateInvoiceStatusDto,
  ) {
    return this.invoiceService.updateStatus(id, body.status);
  }

  @Post(':id/attachments')
  @Roles(Role.ADMIN, Role.FINANCE)
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
    return this.invoiceService.addAttachment(id, {
      fileName: uploaded.originalName,
      fileUrl: uploaded.url,
      fileSize: uploaded.size,
    });
  }
}
