import { Module } from '@nestjs/common';

import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { CharactersModule } from '../characters/characters.module';
import { TeamBuilderController } from './team-builder.controller';
import { TeamBuilderService } from './team-builder.service';

/**
 * Guild war team builder module.
 * Uses BattleSessionsService to know the open week and to ensure its sessions exist — the schedule is
 * the schedule module's responsibility and is not duplicated here.
 */
@Module({
  imports: [BattleSessionsModule, CharactersModule],
  controllers: [TeamBuilderController],
  providers: [TeamBuilderService],
  // Attendance writes through this service: answering "Không" takes the member out of the day's
  // formation, and the slot rules stay in exactly one module.
  exports: [TeamBuilderService],
})
export class TeamBuilderModule {}
