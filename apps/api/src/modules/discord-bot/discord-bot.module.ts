import { Module } from '@nestjs/common';

import { AttendanceModule } from '../attendance/attendance.module';
import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { CharactersModule } from '../characters/characters.module';
import { ActorResolver } from './actor-resolver';
import { BotChannelService } from './bot-channel.service';
import { CronSecretGuard } from './cron.guard';
import { DiscordBotController } from './discord-bot.controller';
import { DiscordSignatureGuard } from './discord-bot.guard';
import { DiscordRestClient } from './discord-rest';
import { FormationAnnouncerService } from './formation-announcer.service';
import { InteractionRouter } from './interaction-router';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';

/**
 * Wires the Discord interaction endpoint and the scheduled attendance reminder.
 *
 * It imports three domain modules because the attendance commands read the schedule and write
 * attendance through the very same services the web API uses — the bot is another way in, not a
 * second set of rules. The reminder reads through those same services for the same reason.
 *
 * The two controllers cannot be one: Discord's webhook authenticates with an Ed25519 signature, the
 * cron call with a shared secret, and a class-level guard cannot be both.
 */
@Module({
  imports: [AttendanceModule, BattleSessionsModule, CharactersModule],
  controllers: [DiscordBotController, ReminderController],
  providers: [
    DiscordSignatureGuard,
    InteractionRouter,
    ActorResolver,
    BotChannelService,
    DiscordRestClient,
    ReminderService,
    FormationAnnouncerService,
    CronSecretGuard,
  ],
  // The team builder screen announces a day's line-up through this service; the bot itself never
  // reaches back into team-builder, so the dependency stays one-way.
  exports: [FormationAnnouncerService],
})
export class DiscordBotModule {}
