import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;
import { Role } from '../auth/roles.enum';

const invoiceInclude = {
  project: true,
  vendor: true,
  category: true,
  tax: true,
  createdBy: true,
  attachments: true,
};

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `INV-${yearMonth}-`;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });

    let seq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-').pop()!, 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async create(data: CreateInvoiceDto, createdById: string) {
    const invoiceNumber = await this.generateInvoiceNumber();

    let taxAmount = new Decimal(0);
    let totalAmount = new Decimal(data.amount);

    if (data.taxId) {
      const tax = await this.prisma.tax.findUnique({
        where: { id: data.taxId },
      });
      if (tax) {
        taxAmount = new Decimal(data.amount)
          .mul(tax.percentage)
          .div(100);
        totalAmount = new Decimal(data.amount).add(taxAmount);
      }
    }

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        type: data.type,
        projectId: data.projectId,
        vendorId: data.vendorId,
        categoryId: data.categoryId,
        taxId: data.taxId,
        amount: data.amount,
        taxAmount,
        totalAmount,
        status: data.status,
        dueDate: data.dueDate,
        notes: data.notes,
        createdById,
      },
      include: invoiceInclude,
    });
  }

  async findAll(userId: string, userRole: string) {
    // PM can only see invoices related to their projects
    let where: any = undefined;
    if (userRole === Role.PROJECTMANAGER) {
      where = {
        project: { createdById: userId },
      };
    }

    return this.prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(id: string, data: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);

    let taxAmount = invoice.taxAmount;
    let totalAmount = invoice.totalAmount;
    const amount = data.amount !== undefined ? data.amount : Number(invoice.amount);

    const taxId = data.taxId !== undefined ? data.taxId : invoice.taxId;
    if (taxId) {
      const tax = await this.prisma.tax.findUnique({ where: { id: taxId } });
      if (tax) {
        taxAmount = new Decimal(amount).mul(tax.percentage).div(100);
        totalAmount = new Decimal(amount).add(taxAmount);
      }
    } else {
      taxAmount = new Decimal(0);
      totalAmount = new Decimal(amount);
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...data,
        taxAmount,
        totalAmount,
      },
      include: invoiceInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.invoice.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    const data: any = { status };
    if (status === 'PAID') {
      data.paidAt = new Date();
    }
    return this.prisma.invoice.update({
      where: { id },
      data,
      include: invoiceInclude,
    });
  }

  async addAttachment(
    invoiceId: string,
    data: { fileName: string; fileUrl: string; fileSize: number },
  ) {
    await this.findOne(invoiceId);
    return this.prisma.invoiceAttachment.create({
      data: { ...data, invoiceId },
    });
  }
}
