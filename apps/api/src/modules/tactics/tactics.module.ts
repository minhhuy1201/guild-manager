import { Module } from '@nestjs/common';

import { TacticsController } from './tactics.controller';
import { TacticsService } from './tactics.service';

/**
 * The tactics board. It depends on nothing but Prisma and nothing depends on it — which is why it
 * exports no service and carries no `tactics.public.ts`.
 */
@Module({
  controllers: [TacticsController],
  providers: [TacticsService],
})
export class TacticsModule {}
