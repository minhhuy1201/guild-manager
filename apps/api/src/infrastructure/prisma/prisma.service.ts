import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import type { Env } from '../../config';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * PrismaClient dùng chung cho toàn app.
 * Prisma 7 kết nối qua driver adapter nên connection string được truyền từ ConfigService,
 * không đọc trực tiếp process.env.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
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

