import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateReimbursementDto } from './dto/reimbursement.dto';
import { Role } from '../auth/roles.enum';

const reimbursementInclude = {
  category: true,
  project: true,
  submittedBy: true,
  approvedBy: true,
  attachments: true,
};

@Injectable()
export class ReimbursementService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateReimbursementDto, submittedById: string) {
    return this.prisma.reimbursement.create({
      data: { ...data, submittedById },
      include: reimbursementInclude,
    });
  }

  async findAll(userId: string, userRole: string) {
    const where =
      userRole === Role.EMPLOYEES ? { submittedById: userId } : undefined;

    return this.prisma.reimbursement.findMany({
      where,
      include: reimbursementInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRole: string) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id },
      include: reimbursementInclude,
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');

    if (
      userRole === Role.EMPLOYEES &&
      reimbursement.submittedById !== userId
    ) {
      throw new ForbiddenException(
        'You can only view your own reimbursements',
      );
    }

    return reimbursement;
  }

  async approve(id: string, approvedById: string) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id },
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');
    if (reimbursement.status !== 'PENDING') {
      throw new BadRequestException('Only pending reimbursements can be approved');
    }

    return this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
      include: reimbursementInclude,
    });
  }

  async reject(id: string, approvedById: string, rejectionReason: string) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id },
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');
    if (reimbursement.status !== 'PENDING') {
      throw new BadRequestException('Only pending reimbursements can be rejected');
    }

    return this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById,
        rejectionReason,
      },
      include: reimbursementInclude,
    });
  }

  async markPaid(id: string) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id },
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');
    if (reimbursement.status !== 'APPROVED') {
      throw new BadRequestException('Only approved reimbursements can be marked paid');
    }

    return this.prisma.reimbursement.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
      include: reimbursementInclude,
    });
  }

  async addAttachment(
    reimbursementId: string,
    data: { fileName: string; fileUrl: string; fileSize: number },
  ) {
    const reimbursement = await this.prisma.reimbursement.findUnique({
      where: { id: reimbursementId },
    });
    if (!reimbursement) throw new NotFoundException('Reimbursement not found');

    return this.prisma.reimbursementAttachment.create({
      data: { ...data, reimbursementId },
    });
  }
}
