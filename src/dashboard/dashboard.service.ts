import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Role } from '../auth/roles.enum';
import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, userRole: string) {
    if (userRole === Role.EMPLOYEES) {
      return this.getEmployeeSummary(userId);
    }
    if (userRole === Role.FINANCE) {
      return this.getFinanceSummary();
    }
    if (userRole === Role.PROJECTMANAGER) {
      return this.getProjectManagerSummary(userId);
    }
    // ADMIN — full summary
    return this.getAdminSummary();
  }

  private async getAdminSummary() {
    const [
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      totalInvoices,
      unpaidInvoices,
      totalReimbursements,
      pendingReimbursements,
      totalUsers,
    ] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: 'ACTIVE' } }),
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: 'DONE' } }),
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { status: 'UNPAID' } }),
      this.prisma.reimbursement.count(),
      this.prisma.reimbursement.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count(),
    ]);

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalInvoices,
      unpaidInvoices,
      totalReimbursements,
      pendingReimbursements,
      totalUsers,
    };
  }

  private async getFinanceSummary() {
    const [
      totalIncome,
      totalExpense,
      unpaidInvoices,
      pendingReimbursements,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { type: 'INCOME', status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { type: 'EXPENSE', status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.count({ where: { status: 'UNPAID' } }),
      this.prisma.reimbursement.count({ where: { status: 'PENDING' } }),
    ]);

    const revenue = totalIncome._sum.totalAmount || new Decimal(0);
    const expense = totalExpense._sum.totalAmount || new Decimal(0);

    return {
      revenue: Number(revenue),
      expense: Number(expense),
      profit: Number(revenue) - Number(expense),
      unpaidInvoices,
      pendingReimbursements,
    };
  }

  private async getProjectManagerSummary(userId: string) {
    const [totalProjects, activeProjects, totalTasks, completedTasks] =
      await Promise.all([
        this.prisma.project.count({ where: { createdById: userId } }),
        this.prisma.project.count({
          where: { createdById: userId, status: 'ACTIVE' },
        }),
        this.prisma.task.count({
          where: { project: { createdById: userId } },
        }),
        this.prisma.task.count({
          where: { project: { createdById: userId }, status: 'DONE' },
        }),
      ]);

    return {
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  private async getEmployeeSummary(userId: string) {
    const [totalTasks, completedTasks, pendingTasks, submittedTasks] =
      await Promise.all([
        this.prisma.task.count({ where: { assignedToId: userId } }),
        this.prisma.task.count({
          where: { assignedToId: userId, status: 'DONE' },
        }),
        this.prisma.task.count({
          where: {
            assignedToId: userId,
            status: { in: ['TODO', 'IN_PROGRESS', 'REVISION'] },
          },
        }),
        this.prisma.task.count({
          where: { assignedToId: userId, status: 'SUBMITTED' },
        }),
      ]);

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      submittedTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  async getFinanceDashboard() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      incomeByMonth,
      expenseByMonth,
      outstandingInvoicesList,
      overdueCount,
      paidInvoicesCount,
      recentInvoicesList,
      reimbursementsByStatus,
    ] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['createdAt'],
        where: { type: 'INCOME', status: 'PAID', createdAt: { gte: sixMonthsAgo } },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['createdAt'],
        where: { type: 'EXPENSE', status: 'PAID', createdAt: { gte: sixMonthsAgo } },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: { in: ['UNPAID', 'DEBT'] } },
        select: { totalAmount: true },
      }),
      this.prisma.invoice.count({
        where: { status: { in: ['UNPAID', 'DEBT'] }, dueDate: { lt: now } },
      }),
      this.prisma.invoice.count({ where: { status: 'PAID' } }),
      this.prisma.invoice.findMany({
        select: {
          id: true,
          invoiceNumber: true,
          type: true,
          status: true,
          totalAmount: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.reimbursement.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    // Transform monthly data: group by YYYY-MM
    const toMonthly = (rows: { createdAt: Date; _sum: { totalAmount: any } }[]) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        const month = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, '0')}`;
        map.set(month, (map.get(month) ?? 0) + Number(row._sum.totalAmount ?? 0));
      }
      return Array.from(map.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));
    };

    const outstandingAmount = outstandingInvoicesList.reduce(
      (sum, inv) => sum + Number(inv.totalAmount ?? 0),
      0,
    );

    return {
      monthlyIncome: toMonthly(incomeByMonth as any),
      monthlyExpense: toMonthly(expenseByMonth as any),
      outstandingInvoices: outstandingInvoicesList.length,
      outstandingAmount,
      overdueInvoices: overdueCount,
      totalPaidInvoices: paidInvoicesCount,
      recentInvoices: recentInvoicesList.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        status: inv.status,
        total: Number(inv.totalAmount),
      })),
      reimbursementsByStatus: reimbursementsByStatus.map((r) => ({
        status: r.status,
        count: r._count,
        total: Number(r._sum.amount ?? 0),
      })),
    };
  }

  async getProjectDashboard() {
    const [projectsByStatus, recentProjects, tasksByStatus, upcomingDeadlines] = await Promise.all([
      this.prisma.project.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.project.findMany({
        include: {
          _count: { select: { tasks: true, members: true } },
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.task.findMany({
        where: {
          deadline: { gte: new Date() },
          status: { not: 'DONE' },
        },
        select: {
          id: true,
          title: true,
          deadline: true,
          project: { select: { name: true } },
        },
        orderBy: { deadline: 'asc' },
        take: 10,
      }),
    ]);

    return {
      projectsByStatus: projectsByStatus.map((p) => ({
        status: p.status,
        count: p._count,
      })),
      recentProjects,
      tasksByStatus: tasksByStatus.map((t) => ({
        status: t.status,
        count: t._count,
      })),
      upcomingDeadlines: upcomingDeadlines.map((t) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline?.toISOString() ?? '',
        projectName: t.project?.name ?? '',
      })),
    };
  }
}
