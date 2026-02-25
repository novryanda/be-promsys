const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const invoices = await prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            type: true,
            status: true,
            categoryId: true,
            totalAmount: true,
            amount: true,
            category: { select: { name: true } },
            createdAt: true
        }
    });
    console.log('RECENT INVOICES:');
    console.log(JSON.stringify(invoices, null, 2));

    const categories = await prisma.category.findMany();
    console.log('ALL CATEGORIES:', categories.length);

    const categoriesInUse = await prisma.invoice.groupBy({
        by: ['categoryId'],
        _count: true,
    });
    console.log('CATEGORIES IN USE (GROUPS):', JSON.stringify(categoriesInUse, null, 2));

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
