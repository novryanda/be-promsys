import 'dotenv/config';
import { PrismaClient, CategoryType, ProjectStatus, TaskStatus, TaskPriority, InvoiceType, InvoiceStatus, ReimbursementStatus, DocumentType, Prisma, user, vendor, project } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { auth } from '../src/auth/auth.instance';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- Helper Functions ---
const getRandomDate = (monthsBack: number) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() - Math.floor(Math.random() * monthsBack), Math.floor(Math.random() * 28) + 1);
    return date;
};

const getDateWithinRange = (start: Date, end: Date) => {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return new Date(startTime + Math.random() * (endTime - startTime));
};

async function main() {
    console.log('🌱 Starting enhanced seeding...');

    // 1. Cleanup existing data (STRICT ORDER)
    console.log('🧹 Cleaning up existing data...');
    const deleteOrder = [
        'notification',
        'reimbursementAttachment', 'invoiceAttachment', 'taskAttachment',
        'reimbursement', 'invoice', 'taskComment', 'task',
        'projectDocument', 'projectActivity', 'projectMember',
        'project',
        'teamMember', 'team',
        'vendor', 'tax', 'category', 'file',
        'session', 'account', 'verification', 'user'
    ];

    for (const table of deleteOrder) {
        try {
            await (prisma as any)[table].deleteMany();
        } catch (e) {
            console.warn(`⚠️ Could not clean table ${table}:`, e instanceof Error ? e.message : e);
        }
    }

    // 2. Master Data: Taxes
    const taxes = await Promise.all([
        prisma.tax.create({ data: { name: 'PPN 11%', percentage: new Prisma.Decimal(0.11) } }),
        prisma.tax.create({ data: { name: 'PPh 23 (2%)', percentage: new Prisma.Decimal(0.02) } }),
        prisma.tax.create({ data: { name: 'None', percentage: new Prisma.Decimal(0) } }),
    ]);

    // 3. Master Data: Categories
    const expenseCategories = await Promise.all([
        prisma.category.create({ data: { name: 'Marketing', type: CategoryType.EXPENSE } }),
        prisma.category.create({ data: { name: 'Office Supplies', type: CategoryType.EXPENSE } }),
        prisma.category.create({ data: { name: 'IT Infrastructure', type: CategoryType.EXPENSE } }),
        prisma.category.create({ data: { name: 'Travel', type: CategoryType.EXPENSE } }),
        prisma.category.create({ data: { name: 'Operational', type: CategoryType.EXPENSE } }),
        prisma.category.create({ data: { name: 'Salary', type: CategoryType.EXPENSE } }),
    ]);

    const incomeCategories = await Promise.all([
        prisma.category.create({ data: { name: 'Project Revenue', type: CategoryType.INCOME } }),
        prisma.category.create({ data: { name: 'Maintenance Fee', type: CategoryType.INCOME } }),
        prisma.category.create({ data: { name: 'Consulting', type: CategoryType.INCOME } }),
    ]);

    // Helper to create user
    const createUser = async (name: string, email: string, role: string) => {
        const response = await auth.api.signUpEmail({
            body: { name, email, password: 'Admin123!' },
        });
        const updatedUser = await prisma.user.update({
            where: { id: response.user!.id },
            data: { role, emailVerified: true },
        });
        return updatedUser;
    };

    // 4. Users
    console.log('👤 Seeding Users...');
    const admins = [await createUser('Super Admin', 'admin@fintech.com', 'ADMIN')];
    const managers = [
        await createUser('Project Manager A', 'pm.a@fintech.com', 'MANAGER'),
        await createUser('Project Manager B', 'pm.b@fintech.com', 'MANAGER'),
    ];
    const employees: user[] = [];
    for (let i = 1; i <= 10; i++) {
        employees.push(await createUser(`Staff ${i}`, `staff${i}@fintech.com`, 'EMPLOYEES'));
    }

    // 5. Vendors
    console.log('🏢 Seeding Vendors...');
    const vendors: vendor[] = [];
    const vendorNames = ['GCP', 'Azure', 'Office Stationery', 'Local Travel Co', 'Internet Provider', 'Cleaning Pro'];
    for (let i = 0; i < vendorNames.length; i++) {
        vendors.push(await prisma.vendor.create({
            data: {
                name: vendorNames[i],
                location: 'Jakarta',
                categoryId: expenseCategories[i % expenseCategories.length].id,
            }
        }));
    }

    // 6. Projects (Diverse timelines)
    console.log('🏗️ Seeding Projects...');
    const now = new Date();
    const projectData = [
        { name: 'Core Banking Integration', start: new Date(now.getFullYear(), now.getMonth() - 8, 1), end: new Date(now.getFullYear(), now.getMonth() + 2, 1), value: 750000000, status: ProjectStatus.ACTIVE },
        { name: 'Mobile App Revamp', start: new Date(now.getFullYear(), now.getMonth() - 4, 1), end: new Date(now.getFullYear(), now.getMonth() + 4, 1), value: 450000000, status: ProjectStatus.ACTIVE },
        { name: 'Security Audit Q1', start: new Date(now.getFullYear(), now.getMonth() - 10, 1), end: new Date(now.getFullYear(), now.getMonth() - 1, 1), value: 200000000, status: ProjectStatus.COMPLETED },
        { name: 'Cloud Migration Phase 2', start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth() + 11, 1), value: 1200000000, status: ProjectStatus.PLANNING },
        { name: 'HR System Implementation', start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1), value: 300000000, status: ProjectStatus.ON_HOLD },
    ];

    const projects: project[] = [];
    for (const p of projectData) {
        const prj = await prisma.project.create({
            data: {
                name: p.name,
                clientName: 'Global Enterprise Ltd',
                contractValue: new Prisma.Decimal(p.value),
                startDate: p.start,
                endDate: p.end,
                status: p.status,
                createdById: admins[0].id,
            }
        });
        projects.push(prj);

        // Add 3 unique random members
        const shuffledMembers = [...employees].sort(() => 0.5 - Math.random());
        for (let i = 0; i < 3; i++) {
            await prisma.projectMember.create({
                data: { projectId: prj.id, userId: shuffledMembers[i].id }
            });
        }
    }

    // 7. Invoices (Project and Non-Project, Multi-Month)
    console.log('🧾 Seeding diverse Invoices...');
    let invCounter = 1;

    // Tracker for project income to avoid exceeding contract value
    const projectIncomeTracker: Record<string, number> = {};

    // Create Invoices for each month over the last 12 months
    for (let m = 0; m < 12; m++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 15);

        // --- 1. Income (General & Project) ---
        for (let i = 0; i < 3; i++) {
            // Assign to a random project that is active or completed during this time
            const eligibleProjects = projects.filter(p => monthDate >= p.startDate! && (p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.COMPLETED));
            const isProject = Math.random() > 0.2 && eligibleProjects.length > 0;
            const targetProject = isProject ? eligibleProjects[Math.floor(Math.random() * eligibleProjects.length)] : null;

            let amount = 25000000 + Math.random() * 50000000;
            const taxRate = 0.11;

            // Logic to cap total income (including tax) at contract value
            if (targetProject) {
                const currentIncomeTotal = projectIncomeTracker[targetProject.id] || 0;
                const remainingTotal = Number(targetProject.contractValue) - currentIncomeTotal;

                if (remainingTotal <= 1000) { // Negligible remaining
                    continue;
                }

                // If (amount * 1.11) > remainingTotal, then amount = remainingTotal / 1.11
                if (amount * (1 + taxRate) > remainingTotal) {
                    amount = remainingTotal / (1 + taxRate);
                }

                projectIncomeTracker[targetProject.id] = currentIncomeTotal + (amount * (1 + taxRate));
            }

            await prisma.invoice.create({
                data: {
                    invoiceNumber: `INC-${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(invCounter++).padStart(3, '0')}`,
                    type: InvoiceType.INCOME,
                    status: Math.random() > 0.1 ? InvoiceStatus.PAID : InvoiceStatus.UNPAID,
                    amount: new Prisma.Decimal(amount),
                    taxAmount: new Prisma.Decimal(amount * taxRate),
                    totalAmount: new Prisma.Decimal(amount * (1 + taxRate)),
                    categoryId: incomeCategories[0].id,
                    projectId: targetProject?.id,
                    createdAt: monthDate,
                    paidAt: Math.random() > 0.1 ? monthDate : null,
                    createdById: admins[0].id,
                }
            });
        }

        // --- 2. Expenses (General & Project) ---
        for (let i = 0; i < 4; i++) {
            const eligibleProjects = projects.filter(p => monthDate >= p.startDate! && p.status !== ProjectStatus.COMPLETED);
            const isProject = Math.random() > 0.4 && eligibleProjects.length > 0;
            const targetProject = isProject ? eligibleProjects[Math.floor(Math.random() * eligibleProjects.length)] : null;

            const amount = 2000000 + Math.random() * 8000000;
            await prisma.invoice.create({
                data: {
                    invoiceNumber: `EXP-${monthDate.getFullYear()}${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(invCounter++).padStart(3, '0')}`,
                    type: InvoiceType.EXPENSE,
                    status: InvoiceStatus.PAID,
                    amount: new Prisma.Decimal(amount),
                    taxAmount: new Prisma.Decimal(amount * 0.11),
                    totalAmount: new Prisma.Decimal(amount * 1.11),
                    categoryId: expenseCategories[i % expenseCategories.length].id,
                    projectId: targetProject?.id,
                    vendorId: vendors[i % vendors.length].id,
                    createdAt: monthDate,
                    paidAt: monthDate,
                    createdById: admins[0].id,
                }
            });
        }
    }

    // 8. Reimbursements
    console.log('💰 Seeding Reimbursements...');
    for (let i = 1; i <= 50; i++) {
        const rDate = getRandomDate(10);
        // Find projects that were active during rDate
        const eligibleProjects = projects.filter(p => rDate >= p.startDate! && rDate <= (p.endDate || now));
        const targetProject = eligibleProjects.length > 0 && Math.random() > 0.3
            ? eligibleProjects[Math.floor(Math.random() * eligibleProjects.length)]
            : null;

        await prisma.reimbursement.create({
            data: {
                title: `Expense: ${expenseCategories[Math.floor(Math.random() * expenseCategories.length)].name} - Task ${i}`,
                amount: new Prisma.Decimal(50000 + Math.random() * 1000000),
                categoryId: expenseCategories[Math.floor(Math.random() * expenseCategories.length)].id,
                projectId: targetProject?.id,
                status: ReimbursementStatus.PAID,
                submittedById: employees[Math.floor(Math.random() * employees.length)].id,
                approvedById: managers[Math.floor(Math.random() * managers.length)].id,
                submittedAt: rDate,
                approvedAt: rDate,
                paidAt: rDate,
            }
        });
    }

    console.log('✅ Seeding complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
