import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { TaskService } from './task.service';
import { FileService } from '../file/file.service';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  UpdateTaskStatusSchema,
  CreateTaskCommentSchema,
} from './dto/task.dto';
import type {
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
  CreateTaskCommentDto,
} from './dto/task.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('api')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly fileService: FileService,
  ) {}

  @Post('projects/:projectId/tasks')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  create(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(CreateTaskSchema)) body: CreateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.create(projectId, body, userId);
  }

  @Get('projects/:projectId/tasks')
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.taskService.findByProject(projectId, userId, role);
  }

  @Get('tasks')
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.taskService.findAll(userId, role);
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Patch('tasks/:id')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) body: UpdateTaskDto,
  ) {
    return this.taskService.update(id, body);
  }

  @Delete('tasks/:id')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }

  @Patch('tasks/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskStatusSchema))
    body: UpdateTaskStatusDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.taskService.updateStatus(id, body.status, userId, role);
  }

  @Post('tasks/:id/attachments')
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
    return this.taskService.addAttachment(
      id,
      {
        fileName: uploaded.originalName,
        fileUrl: uploaded.url,
        fileSize: uploaded.size,
      },
      userId,
    );
  }

  @Post('tasks/:id/comments')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  addComment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateTaskCommentSchema))
    body: CreateTaskCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.addComment(id, body.content, userId);
  }
}
