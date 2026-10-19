import { Module } from '@nestjs/common';

import { AttendanceModule } from '../attendance/attendance.module';
import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { CatRaceModule } from '../cat-race/cat-race.module';
import { CharactersModule } from '../characters/characters.module';
import { TeamBuilderModule } from '../team-builder/team-builder.module';
import { ActorResolver } from './actor-resolver';
import { BotChannelService } from './bot-channel.service';
import { CatRaceAnnounceController } from './cat-race-announce.controller';
import { CatRaceAnnouncerService } from './cat-race-announcer.service';
import { CronSecretGuard } from './cron.guard';
import { DiscordBotController } from './discord-bot.controller';
import { DiscordSignatureGuard } from './discord-bot.guard';
import { DiscordRestClient } from './discord-rest';
import { FormationAnnounceController } from './formation-announce.controller';
import { FormationAnnouncerService } from './formation-announcer.service';
import { InteractionRouter } from './interaction-router';
import { ReminderController } from './reminder.controller';
import { ReminderService } from './reminder.service';
import { TeamNoticeService } from './team-notice.service';

/**
 * Wires the Discord interaction endpoint and the scheduled attendance reminder.
 *
 * It imports four domain modules because the attendance commands read the schedule and write
 * attendance through the very same services the web API uses — the bot is another way in, not a
 * second set of rules. The reminder reads through those same services for the same reason, and the
 * Team notices read the saved formation through `team-builder`.
 *
 * The three controllers cannot be one: Discord's webhook authenticates with an Ed25519 signature,
 * the cron call with a shared secret, and the formation announcement with an admin's JWT — a
 * class-level guard cannot be all three.
 */
@Module({
  imports: [
    AttendanceModule,
    BattleSessionsModule,
    CatRaceModule,
    CharactersModule,
    TeamBuilderModule,
  ],
  controllers: [
    DiscordBotController,
    ReminderController,
    FormationAnnounceController,
    CatRaceAnnounceController,
  ],
  providers: [
    DiscordSignatureGuard,
    InteractionRouter,
    ActorResolver,
    BotChannelService,
    DiscordRestClient,
    ReminderService,
    FormationAnnouncerService,
    TeamNoticeService,
    CatRaceAnnouncerService,
    CronSecretGuard,
  ],
})
export class DiscordBotModule {}
