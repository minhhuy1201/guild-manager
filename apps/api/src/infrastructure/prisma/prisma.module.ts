import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Provides PrismaService app-wide — shared infrastructure, so it is @Global() and feature modules
 * need not import it everywhere.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
