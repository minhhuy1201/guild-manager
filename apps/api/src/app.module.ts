import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from '@/config';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { HealthModule } from '@/modules/health/health.module';

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
    AttendanceModule,
  ],
})
export class AppModule {}
