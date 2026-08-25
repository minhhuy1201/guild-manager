import { defineConfig, env } from 'prisma/config';

import { loadPrismaEnv } from './prisma/load-env';

/**
 * Config for the Prisma CLI (generate/migrate/seed/studio). The app runtime does not read
 * this file — PrismaService builds its adapter from DATABASE_URL.
 */

loadPrismaEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // Prefer DIRECT_DATABASE_URL when present: migrate needs an advisory lock and DDL inside a
    // transaction, which the transaction pooler cannot hold. The runtime does not read this file so
    // it keeps using DATABASE_URL — this is the only place the two paths can diverge, since Prisma 7
    // dropped `directUrl`. env() is not used for the direct variable: it throws when empty, and empty
    // is valid here.
    url: process.env.DIRECT_DATABASE_URL || env('DATABASE_URL'),
  },
});
