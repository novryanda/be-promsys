import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Define access control statements for admin plugin
const statements = {
  user: [
    'create',
    'list',
    'set-role',
    'ban',
    'impersonate',
    'delete',
    'set-password',
    'get',
    'update',
  ] as const,
  session: ['list', 'revoke', 'delete'] as const,
};

const ac = createAccessControl(statements);

// Define roles matching our uppercase convention
const roles = {
  ADMIN: ac.newRole({
    user: [
      'create',
      'list',
      'set-role',
      'ban',
      'impersonate',
      'delete',
      'set-password',
      'get',
      'update',
    ],
    session: ['list', 'revoke', 'delete'],
  }),
  PROJECTMANAGER: ac.newRole({
    user: ['list', 'get'],
    session: [],
  }),
  FINANCE: ac.newRole({
    user: ['list', 'get'],
    session: [],
  }),
  EMPLOYEES: ac.newRole({
    user: [],
    session: [],
  }),
};

export const auth = betterAuth({
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  plugins: [
    admin({
      defaultRole: 'EMPLOYEES',
      adminRoles: ['ADMIN'],
      roles,
    }),
  ],
});

export type Auth = typeof auth;
