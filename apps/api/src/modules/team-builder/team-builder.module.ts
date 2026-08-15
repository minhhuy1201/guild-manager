import { Module } from '@nestjs/common';

import { BattleSessionsModule } from '../battle-sessions/battle-sessions.module';
import { TeamBuilderController } from './team-builder.controller';
import { TeamBuilderService } from './team-builder.service';

/**
 * Module xếp đội hình bang chiến.
 * Dùng BattleSessionsService để biết tuần đang mở và đảm bảo các trận đã tồn tại —
 * lịch đánh là trách nhiệm của module lịch đánh, không chép lại ở đây.
 */
@Module({
  imports: [BattleSessionsModule],
  controllers: [TeamBuilderController],
  providers: [TeamBuilderService],
})
export class TeamBuilderModule {}
