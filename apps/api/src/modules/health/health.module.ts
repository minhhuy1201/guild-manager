import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

/** Health check module — the reference shape for a feature module. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
