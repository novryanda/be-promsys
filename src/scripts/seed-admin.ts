import 'dotenv/config';
import { auth } from '../auth/auth.instance';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@promsys.com' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      await prisma.$disconnect();
      return;
    }

    const response = await auth.api.signUpEmail({
      body: {
        name: 'Admin User',
        email: 'admin@promsys.com',
        password: 'admin123456',
      },
    });

    if (response?.user) {
      await prisma.user.update({
        where: { id: response.user.id },
        data: { role: 'ADMIN' },
      });
      console.log('Admin user created:', response.user.email);
      console.log('Role set to: ADMIN');
      console.log('Password: admin123456');
    } else {
      console.error('Failed to create admin user');
    }
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
