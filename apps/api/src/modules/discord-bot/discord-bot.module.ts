import { Module } from '@nestjs/common';

import { DiscordBotController } from './discord-bot.controller';
import { DiscordSignatureGuard } from './discord-bot.guard';

/** Wires the Discord interaction endpoint. No providers of its own beyond the guard. */
@Module({
  controllers: [DiscordBotController],
  providers: [DiscordSignatureGuard],
})
export class DiscordBotModule {}
