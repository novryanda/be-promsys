import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Role } from '../auth/roles.enum';
import { Prisma } from '@prisma/client';
type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

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
      taskCompletionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalInvoices,
      unpaidInvoices,
      totalReimbursements,
      pendingReimbursements,
      totalUsers,
    };
  }

  private async getFinanceSummary() {
    const [totalIncome, totalExpense, unpaidInvoices, pendingReimbursements] =
      await Promise.all([
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
      taskCompletionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
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
      taskCompletionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  async getFinanceDashboard(timeRange?: string) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (timeRange === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st
    } else if (timeRange === 'thisyear') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else {
      // Default: last 6 months
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }

    const [
      incomeByMonth,
      expenseByMonth,
      outstandingInvoicesList,
      overdueCount,
      paidInvoicesCount,
      recentInvoicesList,
      reimbursementsByStatus,
      invoiceExpensesByCategory,
      reimbursementExpensesByCategory,
    ] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['createdAt'],
        where: {
          type: 'INCOME',
          status: 'PAID',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['createdAt'],
        where: {
          type: 'EXPENSE',
          status: 'PAID',
          createdAt: { gte: startDate, lte: endDate },
        },
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
        _count: { _all: true },
        _sum: { amount: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['categoryId'],
        where: { type: 'EXPENSE', status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      this.prisma.reimbursement.groupBy({
        by: ['categoryId'],
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);


    // Transform monthly data: group by YYYY-MM
    const toMonthly = (
      rows: any[],
    ) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        if (!row.createdAt || !(row.createdAt instanceof Date)) continue;
        const month = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, '0')}`;
        const sumVal = row._sum?.totalAmount || row._sum?.amount || 0;
        map.set(
          month,
          (map.get(month) ?? 0) + Number(sumVal),
        );
      }
      return Array.from(map.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));
    };

    const outstandingAmount = outstandingInvoicesList.reduce(
      (sum, inv) => sum + Number(inv.totalAmount ?? 0),
      0,
    );

    // Merge expenses by category
    const categoryMap = new Map<string, number>();

    for (const row of invoiceExpensesByCategory) {
      if (row.categoryId && typeof row.categoryId === 'string') {
        categoryMap.set(row.categoryId, (categoryMap.get(row.categoryId) ?? 0) + Number(row._sum.totalAmount ?? 0));
      }
    }
    for (const row of reimbursementExpensesByCategory) {
      if (row.categoryId && typeof row.categoryId === 'string') {
        categoryMap.set(row.categoryId, (categoryMap.get(row.categoryId) ?? 0) + Number(row._sum.amount ?? 0));
      }
    }

    const categoryIds = Array.from(categoryMap.keys()).filter(id => !!id);

    let expensesByCategory: any[] = [];
    if (categoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });

      expensesByCategory = categories.map(cat => ({
        name: cat.name,
        amount: categoryMap.get(cat.id) || 0,
      })).sort((a, b) => b.amount - a.amount);
    }


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
        count: (r._count as any)._all,
        total: Number(r._sum.amount ?? 0),
      })),
      expensesByCategory,
    };
  }

  async getProjectDashboard() {
    const [projectsByStatus, recentProjects, tasksByStatus, upcomingDeadlines] =
      await Promise.all([
        this.prisma.project.groupBy({
          by: ['status'],
          _count: { _all: true },
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
          _count: { _all: true },
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
        count: (p._count as any)._all,
      })),
      recentProjects,
      tasksByStatus: tasksByStatus.map((t) => ({
        status: t.status,
        count: (t._count as any)._all,
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
