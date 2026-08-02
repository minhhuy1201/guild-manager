import { Module } from '@nestjs/common';

import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

/**
 * Public API của module: module khác chỉ được import từ file này, không đụng
 * file nội bộ (luật no-restricted-imports trong eslint.config.mjs).
 */
export { AttendanceService } from './attendance.service';

/** Module điểm danh: nhân vật, lịch đánh trong tuần và các lượt điểm danh. */
@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
