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

    // 2. Super Admin User
    console.log('👤 Seeding Super Admin...');

    const adminEmail = 'admin@fintech.com';
    const adminPassword = 'Admin123!';

    try {
        const response = await auth.api.signUpEmail({
            body: { name: 'Super Admin', email: adminEmail, password: adminPassword },
        });

        if (response.user) {
            await prisma.user.update({
                where: { id: response.user.id },
                data: { role: 'ADMIN', emailVerified: true },
            });
            console.log(`✅ Admin account created: ${adminEmail}`);
        }
    } catch (e) {
        console.warn('⚠️ Admin account might already exist or failed to create:', e instanceof Error ? e.message : e);
    }

    console.log('✅ Seeding complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
