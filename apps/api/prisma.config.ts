import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Cấu hình cho Prisma CLI (generate/migrate/seed/studio).
 * Runtime của app không đọc file này — PrismaService tự tạo adapter từ DATABASE_URL.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
