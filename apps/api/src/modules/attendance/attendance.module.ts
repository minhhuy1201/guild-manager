import { Module } from '@nestjs/common';

import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { CharactersModule } from '../characters/characters.module';
import { TeamBuilderModule } from '../team-builder/team-builder.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

/** Attendance module: characters and their attendance entries. The schedule belongs to BattleSessionsModule. */
@Module({
  imports: [BattleSessionsModule, CharactersModule, TeamBuilderModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  // The Discord bot writes attendance through this same service, so the rule about who may mark
  // whom lives in exactly one place.
  exports: [AttendanceService],
})
export class AttendanceModule {}
