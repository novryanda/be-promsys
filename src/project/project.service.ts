import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import {
  CreateProjectDocumentDto,
  UpdateProjectDocumentDto,
} from './dto/project-document.dto';
import {
  CreateProjectActivityDto,
  UpdateProjectActivityDto,
} from './dto/project-activity.dto';
import { Role } from '../auth/roles.enum';

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  constructor(private prisma: PrismaService) { }

  async create(data: CreateProjectDto, createdById: string) {
    try {
      this.logger.debug(
        `[ProjectService.create] data: ${JSON.stringify(data)}`,
      );
      this.logger.debug(`[ProjectService.create] createdById: ${createdById}`);

      const result = await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: { ...stripUndefined(data), createdById },
        });

        // Automatically add creator as owner/member
        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId: createdById,
            role: 'owner',
          },
        });

        return tx.project.findUnique({
          where: { id: project.id },
          include: {
            createdBy: true,
            members: { include: { user: true } },
            _count: { select: { tasks: true, invoices: true } },
          },
        });
      });

      this.logger.log(`[ProjectService.create] success: ${result?.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `[ProjectService.create] ERROR: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(
    userId: string,
    userRole: string,
    params: { page: number; size: number },
  ) {
    const { page, size } = params;
    const skip = (page - 1) * size;

    this.logger.debug(`[ProjectService.findAll] userId: ${userId}, role: ${userRole}, params: ${JSON.stringify(params)}`);

    const where =
      userRole === Role.EMPLOYEES
        ? { members: { some: { userId } } }
        : undefined;

    this.logger.debug(`[ProjectService.findAll] where: ${JSON.stringify(where)}`);

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          createdBy: true,
          members: { include: { user: true } },
          _count: { select: { tasks: true, invoices: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.project.count({ where }),
    ]);

    this.logger.debug(`[ProjectService.findAll] found projects: ${projects.length}, total count: ${total}`);

    return {
      data: projects,
      paging: {
        current_page: page,
        size: size,
        total_page: Math.ceil(total / size),
      },
    };
  }

  async findOne(id: string, userId: string, userRole: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: true,
        members: { include: { user: true } },
        _count: { select: { tasks: true, invoices: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (
      userRole === Role.EMPLOYEES &&
      !project.members.some((m) => m.userId === userId)
    ) {
      throw new ForbiddenException('You are not assigned to this project');
    }

    return project;
  }

  async update(id: string, data: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.project.update({
      where: { id },
      data: stripUndefined(data),
      include: {
        createdBy: true,
        members: { include: { user: true } },
      },
    });
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.delete({ where: { id } });
  }

  async addMember(projectId: string, userId: string, role: string) {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
      });
      if (!project) throw new NotFoundException('Project not found');

      const existing = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (existing)
        throw new ConflictException('User is already a project member');

      return tx.projectMember.create({
        data: { projectId, userId, role },
        include: { user: true },
      });
    });
  }

  async removeMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Member not found in project');

    return this.prisma.projectMember.delete({ where: { id: member.id } });
  }

  async getMembers(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
    });
  }

  // ─── Users (for member selection) ───────────────────────

  async getUsers(search?: string) {
    const where = search
      ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
      : undefined;

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Project Documents ─────────────────────────────────

  async createDocument(
    projectId: string,
    data: CreateProjectDocumentDto,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.projectDocument.create({
      data: {
        projectId,
        name: data.name,
        type: data.type,
        fileName: file.originalname,
        fileUrl: '', // will be updated after R2 upload
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  async createDocumentWithR2(
    projectId: string,
    data: CreateProjectDocumentDto,
    file: Express.Multer.File,
    uploadedById: string,
    r2Service: any,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const ext = file.originalname.split('.').pop();
    const key = `projects/${projectId}/docs/${Date.now()}-${file.originalname}`;

    const { url } = await r2Service.upload(key, file.buffer, file.mimetype);

    return this.prisma.projectDocument.create({
      data: {
        projectId,
        name: data.name,
        type: data.type,
        fileName: file.originalname,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  async findAllDocuments(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.projectDocument.findMany({
      where: { projectId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneDocument(projectId: string, documentId: string) {
    const doc = await this.prisma.projectDocument.findFirst({
      where: { id: documentId, projectId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async updateDocument(
    projectId: string,
    documentId: string,
    data: UpdateProjectDocumentDto,
  ) {
    const doc = await this.prisma.projectDocument.findFirst({
      where: { id: documentId, projectId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.projectDocument.update({
      where: { id: documentId },
      data: stripUndefined(data),
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  async removeDocument(projectId: string, documentId: string) {
    const doc = await this.prisma.projectDocument.findFirst({
      where: { id: documentId, projectId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.projectDocument.delete({ where: { id: documentId } });
  }

  // ─── Project Activities ────────────────────────────────

  async createActivity(
    projectId: string,
    data: CreateProjectActivityDto,
    createdById: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.projectActivity.create({
      data: {
        projectId,
        title: data.title,
        description: data.description ?? null,
        activityDate: data.activityDate ?? new Date(),
        createdById,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  async findAllActivities(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.projectActivity.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { activityDate: 'desc' },
    });
  }

  async findOneActivity(projectId: string, activityId: string) {
    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, projectId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  async updateActivity(
    projectId: string,
    activityId: string,
    data: UpdateProjectActivityDto,
  ) {
    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, projectId },
    });
    if (!activity) throw new NotFoundException('Activity not found');

    return this.prisma.projectActivity.update({
      where: { id: activityId },
      data: stripUndefined(data),
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  async removeActivity(projectId: string, activityId: string) {
    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, projectId },
    });
    if (!activity) throw new NotFoundException('Activity not found');

    return this.prisma.projectActivity.delete({ where: { id: activityId } });
  }
}
