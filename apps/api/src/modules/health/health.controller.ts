import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Clock } from '../../common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** Result of the API health check. */
export interface HealthStatus {
  /** 'ok' while the API is alive — even when the database is not ready. */
  status: 'ok';
  /** Seconds the process has been running. */
  uptime: number;
  /** Database connection state. */
  db: 'up' | 'down';
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /**
   * Check the API and its database connection.
   * @returns The overall status; `db` is 'down' when the database is unreachable
   */
  @Get()
  @ApiOperation({ summary: 'Kiểm tra tình trạng API và database' })
  @ApiOkResponse({ description: 'API đang chạy' })
  async check(): Promise<HealthStatus> {
    const isDbUp = await this.prisma.isHealthy();

    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      db: isDbUp ? 'up' : 'down',
      timestamp: this.clock.now().toISOString(),
    };
  }
}
