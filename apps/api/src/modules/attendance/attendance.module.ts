import { Module } from '@nestjs/common';

import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

/** Module điểm danh: nhân vật và các lượt điểm danh. Lịch đánh do BattleSessionsModule lo. */
@Module({
  imports: [BattleSessionsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
