import { Module } from '@nestjs/common';

import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { TeamBuilderController } from './team-builder.controller';
import { TeamBuilderService } from './team-builder.service';

/**
 * Module xếp đội hình bang chiến.
 * Dùng lại AttendanceService để biết tuần đang mở và đảm bảo các trận đã tồn tại —
 * lịch đánh là trách nhiệm của module điểm danh, không chép lại ở đây.
 */
@Module({
  imports: [AttendanceModule],
  controllers: [TeamBuilderController],
  providers: [TeamBuilderService],
})
export class TeamBuilderModule {}
