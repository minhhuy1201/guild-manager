import { isDiscordForbidden } from './discord-rest';

/** Posted when the scheduled reminder found no reminder channel configured. */
export const REMINDER_NO_CHANNEL_ALERT =
  '⚠️ Nhắc điểm danh 9h không chạy: chưa có kênh nhắc. Gõ /cau-hinh-kenh trong kênh muốn dùng.';

/**
 * The admin alert for a scheduled reminder that threw.
 * Never quotes the error itself - it may carry database detail; the log has it.
 * @param error - What `ReminderService.run` threw
 * @returns The sentence to post in the admin channel
 */
export function reminderFailureText(error: unknown): string {
  if (isDiscordForbidden(error)) {
    return (
      '⚠️ Nhắc điểm danh 9h không gửi được: bot không có quyền gửi tin vào kênh nhắc. ' +
      'Kiểm tra quyền Send Messages hoặc chạy lại /cau-hinh-kenh trong kênh muốn dùng, rồi /nhac-diem-danh.'
    );
  }

  return '⚠️ Nhắc điểm danh 9h thất bại (lỗi hệ thống). Xem log Vercel, rồi chạy /nhac-diem-danh để nhắc bù.';
}
