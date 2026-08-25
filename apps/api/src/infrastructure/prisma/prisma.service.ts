import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { attachDatabasePool } from '@vercel/functions';
import { Pool } from 'pg';

import { DATABASE_POOL_OPTIONS, type Env } from '../../config';
import { Prisma, PrismaClient } from '../../generated/prisma/client';

/**
 * The client inside a `$transaction`: the same model surface as `PrismaService`, without a nested
 * `$transaction`. Declared here because `src/generated/prisma` may only be imported from
 * infrastructure.
 *
 * `PrismaService` is assignable to this type, so a function taking it works both inside and outside
 * a transaction.
 */
export type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * The app-wide PrismaClient.
 * Prisma 7 connects through a driver adapter, so the connection string comes from ConfigService
 * rather than process.env.
 *
 * The pool is built here instead of letting `PrismaPg` create it, because a reference is needed for
 * `attachDatabasePool` — see createPool below.
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

  /** Close the connection pool on shutdown (paired with app.enableShutdownHooks()). */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Ping the database with the cheapest possible query.
   * @returns true when the database responds, false when it is unreachable
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
 * Build the pg pool and register it with Vercel.
 *
 * `attachDatabasePool` listens to the pool's `release` event to close idle connections **before**
 * Vercel suspends the instance; without it they linger on the Supavisor side until timeout. Off
 * Vercel it disables itself (it checks `VERCEL_URL`/`VERCEL_REGION`), so local needs no separate
 * branch.
 *
 * @param connectionString - The validated DATABASE_URL
 */
function createPool(connectionString: string): Pool {
  const pool = new Pool({ connectionString, ...DATABASE_POOL_OPTIONS });
  attachDatabasePool(pool);

  return pool;
}
