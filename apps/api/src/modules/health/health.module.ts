import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/** Module health check — mẫu tham chiếu cho cấu trúc một module nghiệp vụ. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
