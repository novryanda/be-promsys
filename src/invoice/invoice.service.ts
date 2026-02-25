import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(InvoiceService.name);
  constructor(private prisma: PrismaService) { }

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
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber();

      let taxAmount = new Decimal(0);
      let totalAmount = new Decimal(data.amount);

      if (data.taxId) {
        const tax = await tx.tax.findUnique({
          where: { id: data.taxId },
        });
        if (tax) {
          taxAmount = new Decimal(data.amount).mul(tax.percentage).div(100);
          totalAmount = new Decimal(data.amount).add(taxAmount);
        }
      }

      return tx.invoice.create({
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
          status: 'PAID',
          paidAt: new Date(),
          dueDate: data.dueDate,
          notes: data.notes,
          createdById,
        },
        include: invoiceInclude,
      });
    });
  }

  async findAll(
    userId: string,
    userRole: string,
    params: { page: number; size: number; projectId?: string; type?: string },
  ) {
    const { page, size, projectId, type } = params;
    const skip = (page - 1) * size;

    const where: any = {};

    // PM context
    if (userRole === Role.PROJECTMANAGER) {
      where.project = { createdById: userId };
    }

    // Filter by project
    if (projectId) {
      where.projectId = projectId;
    }

    // Filter by type
    if (type) {
      where.type = type;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        include: invoiceInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      this.prisma.invoice.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ]);

    return {
      data: invoices,
      paging: {
        current_page: page,
        size: size,
        total_page: Math.ceil(total / size),
      },
    };
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
    const amount =
      data.amount !== undefined ? data.amount : Number(invoice.amount);

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

  async findAllFinance(
    params: { page: number; size: number; search?: string },
  ) {
    const { page, size, search } = params;

    // Fetch Invoices
    const invoices = await this.prisma.invoice.findMany({
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch Reimbursements
    const reimbursements = await this.prisma.reimbursement.findMany({
      include: {
        category: true,
        project: true,
        submittedBy: true,
        approvedBy: true,
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Combine and Map
    const unifiedList = [
      ...invoices.map((inv) => ({
        id: inv.id,
        type: 'INVOICE',
        number: inv.invoiceNumber,
        title: inv.vendor?.name || inv.project?.name || inv.category?.name || 'General Invoice',
        description: inv.notes,
        amount: inv.totalAmount,
        status: inv.status,
        date: inv.createdAt,
        dueDate: inv.dueDate,
        // Specific fields
        vendor: inv.vendor,
        project: inv.project,
        category: inv.category,
        createdBy: inv.createdBy,
        attachments: inv.attachments,
        isPaid: inv.status === 'PAID',
      })),
      ...reimbursements.map((reimb) => ({
        id: reimb.id,
        type: 'REIMBURSEMENT',
        number: `REIMB-${reimb.createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${reimb.id.slice(-4)}`, // Generate a pseudo-number for display
        title: reimb.title, // Title of reimbursement
        description: reimb.description,
        amount: reimb.amount,
        status: reimb.status, // PENDING, APPROVED, REJECTED, PAID
        date: reimb.createdAt,
        dueDate: null,
        // Specific fields
        vendor: null, // Reimbursements don't have external vendors typically in this context, or user is the vendor
        submitter: reimb.submittedBy, // The employee
        project: reimb.project,
        category: reimb.category,
        createdBy: reimb.submittedBy,
        attachments: reimb.attachments,
        isPaid: reimb.status === 'PAID',
      })),
    ];

    // Filter by Search if needed (naive in-memory filter for now as we combined two different tables)
    let filteredList = unifiedList;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredList = unifiedList.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchLower) ||
          item.number?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower),
      );
    }

    // Sort by Date Descending
    filteredList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination
    const total = filteredList.length;
    const data = filteredList.slice((page - 1) * size, page * size);

    return {
      data,
      paging: {
        current_page: page,
        size: size,
        total_page: Math.ceil(total / size),
        total_items: total,
      },
      summary: {
        totalInvoices: invoices.length,
        totalReimbursements: reimbursements.length,
        totalAmount: filteredList.reduce((sum, item) => sum.add(new Prisma.Decimal(item.amount)), new Prisma.Decimal(0))
      }
    };
  }
}
