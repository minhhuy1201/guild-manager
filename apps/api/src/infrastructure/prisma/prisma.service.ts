import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { attachDatabasePool } from '@vercel/functions';
import { Pool } from 'pg';

import { DATABASE_POOL_OPTIONS, type Env } from '../../config';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * PrismaClient dùng chung cho toàn app.
 * Prisma 7 kết nối qua driver adapter nên connection string được truyền từ ConfigService,
 * không đọc trực tiếp process.env.
 *
 * Pool được dựng ở đây thay vì để `PrismaPg` tự tạo, vì cần một tham chiếu để đưa cho
 * `attachDatabasePool` — xem createPool bên dưới.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg(
        createPool(config.get('DATABASE_URL', { infer: true })),
      ),
    });
  }

  /**
   * Đóng connection pool khi app shutdown (đi cùng app.enableShutdownHooks()).
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Ping database bằng một query rẻ nhất có thể.
   * @returns true nếu database phản hồi, false nếu không kết nối được
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn(
        `Không kết nối được database: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}

/**
 * Dựng pg pool và đăng ký với Vercel.
 *
 * `attachDatabasePool` nghe sự kiện `release` của pool để đóng các kết nối đang rảnh **trước khi**
 * Vercel treo instance; không có nó, kết nối nằm lại phía Supavisor cho tới lúc timeout. Ngoài
 * Vercel, hàm này tự vô hiệu (nó kiểm tra `VERCEL_URL`/`VERCEL_REGION`), nên local không cần nhánh
 * riêng.
 *
 * @param connectionString - DATABASE_URL đã qua validate
 */
function createPool(connectionString: string): Pool {
  const pool = new Pool({ connectionString, ...DATABASE_POOL_OPTIONS });
  attachDatabasePool(pool);

  return pool;
}
