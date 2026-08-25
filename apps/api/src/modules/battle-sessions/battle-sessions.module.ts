import { Module } from '@nestjs/common';

import { BattleSessionsController } from './battle-sessions.controller';
import { BattleSessionsService } from './battle-sessions.service';

/** Schedule module: owns the BattleSession table, generates Guild Wars and provides scrim CRUD. */
@Module({
  controllers: [BattleSessionsController],
  providers: [BattleSessionsService],
  exports: [BattleSessionsService],
})
export class BattleSessionsModule {}
