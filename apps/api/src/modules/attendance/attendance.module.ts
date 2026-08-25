import { Module } from '@nestjs/common';

import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { CharactersModule } from '../characters/characters.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

/** Attendance module: characters and their attendance entries. The schedule belongs to BattleSessionsModule. */
@Module({
  imports: [BattleSessionsModule, CharactersModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
