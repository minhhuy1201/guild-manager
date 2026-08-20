import { Module } from '@nestjs/common';

import { BattleSessionsController } from './battle-sessions.controller';
import { BattleSessionsService } from './battle-sessions.service';

/** Module lịch đánh: sở hữu bảng BattleSession, tự sinh Guild War và CRUD scrim. */
@Module({
  controllers: [BattleSessionsController],
  providers: [BattleSessionsService],
  exports: [BattleSessionsService],
})
export class BattleSessionsModule {}
