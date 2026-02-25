import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateReimbursementDto } from './dto/reimbursement.dto';
import { Role } from '../auth/roles.enum';
import { NotificationService } from '../notification/notification.service';

const reimbursementInclude = {
  category: true,
  project: true,
  submittedBy: true,
  approvedBy: true,
  attachments: true,
};

@Injectable()
export class ReimbursementService {
  private readonly logger = new Logger(ReimbursementService.name);
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) { }

  async create(data: CreateReimbursementDto, submittedById: string) {
    this.logger.log(`Creating reimbursement for user ${submittedById}: ${JSON.stringify(data)}`);
    const reimbursement = await this.prisma.reimbursement.create({
      data: { ...data, submittedById },
      include: reimbursementInclude,
    });

    // Notify all ADMIN and FINANCE users about new reimbursement
    const submitter = reimbursement.submittedBy;
    this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.FINANCE] }, id: { not: submittedById } },
      select: { id: true },
    }).then((users) => {
      const notifications = users.map((u) => ({
        userId: u.id,
        type: 'REIMBURSEMENT_SUBMITTED',
        title: 'New Reimbursement Request',
        message: `${submitter?.name || 'A user'} submitted a reimbursement: "${reimbursement.title}"`,
        referenceId: reimbursement.id,
        referenceType: 'REIMBURSEMENT',
      }));
      return this.notificationService.createMany(notifications);
    }).catch((err) => this.logger.error(`Failed to send reimbursement submitted notifications: ${err.message}`));

    return reimbursement;
  }

  async findAll(
    userId: string,
    userRole: string,
    params: { page: number; size: number; projectId?: string; view?: 'me' | 'all' },
  ) {
    const { page, size, projectId, view } = params;
    const skip = (page - 1) * size;

    const where: any = {};

    // Default visibility logic
    if (userRole === Role.EMPLOYEES || userRole === Role.PROJECTMANAGER) {
      where.submittedById = userId;
    } else if (userRole === Role.ADMIN || userRole === Role.FINANCE) {
      // Admin/Finance can choose to see only their own or all
      if (view === 'me') {
        where.submittedById = userId;
      }
      // If view === 'all' or not specified, show all (no submittedById filter)
    }

    if (projectId) {
      where.projectId = projectId;
    }

    this.logger.log(`Finding reimbursements. User: ${userId}, Role: ${userRole}, View: ${view}, Where: ${JSON.stringify(where)}`);

    const [reimbursements, total] = await Promise.all([
      this.prisma.reimbursement.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: reimbursementInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.reimbursement.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    this.logger.log(`Found ${total} reimbursements`);

    return {
      data: reimbursements,
      paging: {
        current_page: page,
        size: size,
        total_page: Math.ceil(total / size),
      },
    };
  }

  async findOne(id: string, userId: string, userRole: string) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id },
      include: reimbursementInclude,
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');

    if (userRole === Role.EMPLOYEES && reimbursement.submittedById !== userId) {
      throw new ForbiddenException('You can only view your own reimbursements');
    }

    return reimbursement;
  }

  async approve(id: string, approvedById: string) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id },
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');
    if (reimbursement.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending reimbursements can be approved',
      );
    }

    const updated = await this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
      include: reimbursementInclude,
    });

    // Notify submitter
    this.notificationService.create({
      userId: reimbursement.submittedById,
      type: 'REIMBURSEMENT_APPROVED',
      title: 'Reimbursement Approved',
      message: `Your reimbursement "${reimbursement.title}" has been approved`,
      referenceId: id,
      referenceType: 'REIMBURSEMENT',
    }).catch((err) => this.logger.error(`Failed to send reimbursement approved notification: ${err.message}`));

    return updated;
  }

  async reject(id: string, approvedById: string, rejectionReason: string) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id },
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');
    if (reimbursement.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending reimbursements can be rejected',
      );
    }

    const updated = await this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById,
        rejectionReason,
      },
      include: reimbursementInclude,
    });

    // Notify submitter
    this.notificationService.create({
      userId: reimbursement.submittedById,
      type: 'REIMBURSEMENT_REJECTED',
      title: 'Reimbursement Rejected',
      message: `Your reimbursement "${reimbursement.title}" has been rejected. Reason: ${rejectionReason}`,
      referenceId: id,
      referenceType: 'REIMBURSEMENT',
    }).catch((err) => this.logger.error(`Failed to send reimbursement rejected notification: ${err.message}`));

    return updated;
  }

  async markPaid(id: string) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id },
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');
    if (reimbursement.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only approved reimbursements can be marked paid',
      );
    }

    const updated = await this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: reimbursementInclude,
    });

    // Notify submitter
    this.notificationService.create({
      userId: reimbursement.submittedById,
      type: 'REIMBURSEMENT_PAID',
      title: 'Reimbursement Paid',
      message: `Your reimbursement "${reimbursement.title}" has been paid`,
      referenceId: id,
      referenceType: 'REIMBURSEMENT',
    }).catch((err) => this.logger.error(`Failed to send reimbursement paid notification: ${err.message}`));

    return updated;
  }

  async addAttachment(
    reimbursementId: string,
    data: { fileName: string; fileUrl: string; fileSize: number; type?: 'SUBMISSION' | 'PAYMENT' },
  ) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id: reimbursementId },
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');

    return this.prisma.reimbursementAttachment.create({
      data: {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        type: data.type || 'SUBMISSION',
        reimbursementId
      },
    });
  }
}
