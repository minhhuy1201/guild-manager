import { Module } from '@nestjs/common';

import { BattleSessionsController } from './battle-sessions.controller';
import { BattleSessionsService } from './battle-sessions.service';

/**
 * Public API của module: module khác chỉ được import từ file này, không đụng
 * file nội bộ (luật no-restricted-imports trong eslint.config.mjs).
 */
export { BattleSessionsService } from './battle-sessions.service';
export {
  formatSessionLabel,
  isDeadlinePassed,
  weekEndOf,
} from './session-schedule';

/** Module lịch đánh: sở hữu bảng BattleSession, tự sinh Guild War và CRUD scrim. */
@Module({
  controllers: [BattleSessionsController],
  providers: [BattleSessionsService],
  exports: [BattleSessionsService],
})
export class BattleSessionsModule {}
