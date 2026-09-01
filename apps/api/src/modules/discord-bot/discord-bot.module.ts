import { Module } from '@nestjs/common';

import { AttendanceModule } from '../attendance/attendance.module';
import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { CharactersModule } from '../characters/characters.module';
import { DiscordBotController } from './discord-bot.controller';
import { DiscordSignatureGuard } from './discord-bot.guard';
import { ActorResolver } from './actor-resolver';
import { InteractionRouter } from './interaction-router';

/**
 * Wires the Discord interaction endpoint.
 *
 * It imports three domain modules because the attendance commands read the schedule and write
 * attendance through the very same services the web API uses — the bot is another way in, not a
 * second set of rules.
 */
@Module({
  imports: [AttendanceModule, BattleSessionsModule, CharactersModule],
  controllers: [DiscordBotController],
  providers: [DiscordSignatureGuard, InteractionRouter, ActorResolver],
})
export class DiscordBotModule {}
