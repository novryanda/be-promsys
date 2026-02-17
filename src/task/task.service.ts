import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Role } from '../auth/roles.enum';

const taskInclude = {
  project: true,
  assignedTo: true,
  createdBy: true,
  attachments: true,
  comments: {
    include: { user: true },
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, data: CreateTaskDto, createdById: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.task.create({
      data: { ...data, projectId, createdById },
      include: taskInclude,
    });
  }

  async findByProject(
    projectId: string,
    userId: string,
    userRole: string,
    params: { page: number; size: number },
  ) {
    const { page, size } = params;
    const skip = (page - 1) * size;

    const where: any = { projectId };
    if (userRole === Role.EMPLOYEES) {
      where.assignedToId = userId;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      paging: {
        current_page: page,
        size: size,
        total_page: Math.ceil(total / size),
      },
    };
  }

  async findAll(
    userId: string,
    userRole: string,
    params: { page: number; size: number },
  ) {
    const { page, size } = params;
    const skip = (page - 1) * size;

    const where =
      userRole === Role.EMPLOYEES ? { assignedToId: userId } : undefined;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      paging: {
        current_page: page,
        size: size,
        total_page: Math.ceil(total / size),
      },
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, data: UpdateTaskDto) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.task.delete({ where: { id } });
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
    userRole: string,
  ) {
    const task = await this.findOne(id);

    // EMPLOYEES can only set SUBMITTED or IN_PROGRESS
    if (
      userRole === Role.EMPLOYEES &&
      !['SUBMITTED', 'IN_PROGRESS'].includes(status)
    ) {
      throw new ForbiddenException(
        'Employees can only set status to IN_PROGRESS or SUBMITTED',
      );
    }

    // EMPLOYEES can only update their own tasks
    if (userRole === Role.EMPLOYEES && task.assignedToId !== userId) {
      throw new ForbiddenException('You can only update your own tasks');
    }

    return this.prisma.task.update({
      where: { id },
      data: { status: status as any },
      include: taskInclude,
    });
  }

  async addAttachment(
    taskId: string,
    data: { fileName: string; fileUrl: string; fileSize: number },
    uploadedById: string,
  ) {
    await this.findOne(taskId);
    return this.prisma.taskAttachment.create({
      data: { ...data, taskId, uploadedById },
    });
  }

  async addComment(taskId: string, content: string, userId: string) {
    await this.findOne(taskId);
    return this.prisma.taskComment.create({
      data: { taskId, userId, content },
      include: { user: true },
    });
  }
}
