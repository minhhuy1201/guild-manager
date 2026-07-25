import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Cung cấp PrismaService cho toàn app — hạ tầng dùng chung nên đánh dấu @Global()
 * để module nghiệp vụ không phải import lại ở mọi nơi.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
