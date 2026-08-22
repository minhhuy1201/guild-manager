import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Clock } from '../../common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** Kết quả health check của API. */
export interface HealthStatus {
  /** 'ok' khi API sống — kể cả khi database chưa sẵn sàng. */
  status: 'ok';
  /** Số giây process đã chạy. */
  uptime: number;
  /** Trạng thái kết nối database. */
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
   * Kiểm tra API và kết nối database.
   * @returns Trạng thái tổng quát; `db` là 'down' khi chưa kết nối được database
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
