import { Module } from '@nestjs/common';

import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { CharactersModule } from '../characters/characters.module';
import { TeamBuilderModule } from '../team-builder/team-builder.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AutoAttendController } from './auto-attend.controller';
import { AutoAttendService } from './auto-attend.service';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

/** Attendance module: characters and their attendance entries. The schedule belongs to BattleSessionsModule. */
@Module({
  imports: [BattleSessionsModule, CharactersModule, TeamBuilderModule],
  controllers: [AttendanceController, LeaveController, AutoAttendController],
  providers: [AttendanceService, LeaveService, AutoAttendService],
  // The Discord bot writes attendance through this same service, so the rule about who may mark
  // whom lives in exactly one place.
  exports: [AttendanceService, LeaveService, AutoAttendService],
})
export class AttendanceModule {}
