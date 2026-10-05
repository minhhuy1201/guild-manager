import { DiscordApiError } from '../discord-rest';
import {
  REMINDER_NO_CHANNEL_ALERT,
  reminderFailureText,
} from '../reminder-alert';

describe('reminderFailureText', () => {
  it('403 của Discord nói về quyền Send Messages', () => {
    expect(reminderFailureText(new DiscordApiError(403, '1', '{}'))).toContain(
      'Send Messages',
    );
  });

  it('lỗi khác không lộ message gốc', () => {
    const text = reminderFailureText(
      new Error('connect ECONNREFUSED 10.0.0.1:5432'),
    );

    expect(text).toContain('lỗi hệ thống');
    expect(text).not.toContain('ECONNREFUSED');
  });

  it('Discord 500 rơi vào nhánh lỗi khác', () => {
    expect(reminderFailureText(new DiscordApiError(500, '1', '{}'))).toContain(
      'lỗi hệ thống',
    );
  });
});

it('thiếu kênh nhắc chỉ cách sửa', () => {
  expect(REMINDER_NO_CHANNEL_ALERT).toContain('/cau-hinh-kenh');
});
