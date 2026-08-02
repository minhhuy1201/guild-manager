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
    // Ưu tiên DIRECT_DATABASE_URL khi có: migrate cần advisory lock và DDL trong transaction,
    // thứ mà transaction pooler không giữ được. Runtime không đọc file này nên nó vẫn dùng
    // DATABASE_URL — đây là chỗ duy nhất tách được hai đường, vì Prisma 7 bỏ `directUrl`.
    // Không dùng env() cho biến direct: env() ném lỗi khi biến trống, còn ở đây trống là hợp lệ.
    url: process.env.DIRECT_DATABASE_URL || env('DATABASE_URL'),
  },
});
