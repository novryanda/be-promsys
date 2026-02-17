import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
import { ProjectService } from './project.service';
import { R2Service } from '../file/r2.service';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  AddProjectMemberSchema,
} from './dto/project.dto';
import type {
  CreateProjectDto,
  UpdateProjectDto,
  AddProjectMemberDto,
} from './dto/project.dto';
import {
  CreateProjectDocumentSchema,
  UpdateProjectDocumentSchema,
} from './dto/project-document.dto';
import type {
  CreateProjectDocumentDto,
  UpdateProjectDocumentDto,
} from './dto/project-document.dto';
import {
  CreateProjectActivitySchema,
  UpdateProjectActivitySchema,
} from './dto/project-activity.dto';
import type {
  CreateProjectActivityDto,
  UpdateProjectActivityDto,
} from './dto/project-activity.dto';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('api/projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly r2Service: R2Service,
  ) {}

  // ─── Project CRUD ──────────────────────────────────────

  @Post()
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  create(@Body(new ZodValidationPipe(CreateProjectSchema)) body: CreateProjectDto, @CurrentUser('id') userId: string) {
    return this.projectService.create(body, userId);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.projectService.findAll(userId, role);
  }

  @Get('users')
  getUsers(@Query('search') search?: string) {
    return this.projectService.getUsers(search);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.projectService.findOne(id, userId, role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProjectSchema)) body: UpdateProjectDto,
  ) {
    return this.projectService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.projectService.remove(id);
  }

  // ─── Project Members ───────────────────────────────────

  @Post(':id/members')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  addMember(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddProjectMemberSchema))
    body: AddProjectMemberDto,
  ) {
    return this.projectService.addMember(id, body.userId, body.role);
  }

  @Delete(':id/members/:userId')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.projectService.removeMember(id, userId);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.projectService.getMembers(id);
  }

  // ─── Project Documents ─────────────────────────────────

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async createDocument(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }), // 25MB
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    const parsed = CreateProjectDocumentSchema.parse(body);
    return this.projectService.createDocumentWithR2(id, parsed, file, userId, this.r2Service);
  }

  @Get(':id/documents')
  findAllDocuments(@Param('id') id: string) {
    return this.projectService.findAllDocuments(id);
  }

  @Get(':id/documents/:docId')
  findOneDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.projectService.findOneDocument(id, docId);
  }

  @Patch(':id/documents/:docId')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  updateDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body(new ZodValidationPipe(UpdateProjectDocumentSchema)) body: UpdateProjectDocumentDto,
  ) {
    return this.projectService.updateDocument(id, docId, body);
  }

  @Delete(':id/documents/:docId')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  removeDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.projectService.removeDocument(id, docId);
  }

  // ─── Project Activities ────────────────────────────────

  @Post(':id/activities')
  createActivity(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateProjectActivitySchema)) body: CreateProjectActivityDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectService.createActivity(id, body, userId);
  }

  @Get(':id/activities')
  findAllActivities(@Param('id') id: string) {
    return this.projectService.findAllActivities(id);
  }

  @Get(':id/activities/:activityId')
  findOneActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
  ) {
    return this.projectService.findOneActivity(id, activityId);
  }

  @Patch(':id/activities/:activityId')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  updateActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body(new ZodValidationPipe(UpdateProjectActivitySchema)) body: UpdateProjectActivityDto,
  ) {
    return this.projectService.updateActivity(id, activityId, body);
  }

  @Delete(':id/activities/:activityId')
  @Roles(Role.ADMIN, Role.PROJECTMANAGER)
  removeActivity(
    @Param('id') id: string,
    @Param('activityId') activityId: string,
  ) {
    return this.projectService.removeActivity(id, activityId);
  }
}
