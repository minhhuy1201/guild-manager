import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from '@/config';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { BattleSessionsModule } from '@/modules/battle-sessions/battle-sessions.module';
import { HealthModule } from '@/modules/health/health.module';
import { TeamBuilderModule } from '@/modules/team-builder/team-builder.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    BattleSessionsModule,
    AttendanceModule,
    TeamBuilderModule,
  ],
})
export class AppModule {}
