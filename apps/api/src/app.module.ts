import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ClockModule } from './common/clock/clock.module';
import { validateEnv } from './config';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { BattleSessionsModule } from './modules/battle-sessions/battle-sessions.module';
import { CharactersModule } from './modules/characters/characters.module';
import { DiscordBotModule } from './modules/discord-bot/discord-bot.module';
import { HealthModule } from './modules/health/health.module';
import { TeamBuilderModule } from './modules/team-builder/team-builder.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    ClockModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    BattleSessionsModule,
    CharactersModule,
    AttendanceModule,
    TeamBuilderModule,
    DiscordBotModule,
  ],
})
export class AppModule {}
