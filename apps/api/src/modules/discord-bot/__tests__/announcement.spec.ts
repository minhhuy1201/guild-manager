import type { BattleSession } from '@guild/shared/schemas';

import { buildAnnouncement } from '../announcement';
import { ANNOUNCEMENT_ATTENDANCE_ID } from '../custom-id';
import { BUTTON_STYLE } from '../discord.constants';

const LINKS = {
  webOrigin: 'https://mmgh-nth.vercel.app',
  guildRoleId: '999888777',
};

/** Monday 2026-08-31 00:00 VN — the week every fixture below belongs to. */
const WEEK_START = '2026-08-30T17:00:00.000Z';

/**
 * One battle session, with only the fields the announcement reads spelled out.
 * @param overrides - Fields to override on top of a Thursday scrim
 * @returns A session shaped like the API returns it
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'a',
    label: 'Thứ 5 · 20:30',
    dateTime: '2026-09-03T13:30:00.000Z',
    deadline: '2026-09-03T03:00:00.000Z',
    isDeadlinePassed: false,
    isGuildWar: false,
    opponent: 'Moonlight',
    weekStart: WEEK_START,
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
    ...overrides,
  };
}

describe('buildAnnouncement', () => {
  it('mention role bang, và chỉ cho phép ping đúng role đó', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.content).toBe('<@&999888777>');
    expect(payload.allowed_mentions).toEqual({ roles: ['999888777'] });
  });

  it('mỗi ngày đánh một field, kèm ngày và số trận', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const [field] = payload.embeds![0].fields;

    expect(field.name).toBe('⚔️ Thứ 5 · 20:30');
    expect(field.value).toContain('📅 03/09');
    expect(field.value).toContain('🎮 2 trận');
    expect(field.inline).toBe(true);
  });

  it('Bang Chiến đổi icon và không có dòng đối thủ', () => {
    const payload = buildAnnouncement(
      [
        session({
          label: 'Thứ 7 · 20:00 · Bang Chiến',
          isGuildWar: true,
          opponent: null,
          dateTime: '2026-09-05T13:00:00.000Z',
        }),
      ],
      LINKS,
    );
    const [field] = payload.embeds![0].fields;

    expect(field.name).toBe('🛡️ Thứ 7 · 20:00 · Bang Chiến');
    expect(field.value).not.toContain('🆚');
  });

  it('scrim có đối thủ thì hiện tên bang', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.embeds![0].fields[0].value).toContain('🆚 Moonlight');
  });

  it('scrim chưa chốt đối thủ thì bỏ hẳn dòng đó', () => {
    const payload = buildAnnouncement([session({ opponent: null })], LINKS);

    expect(payload.embeds![0].fields[0].value).not.toContain('🆚');
  });

  it('mô tả khoảng tuần từ thứ 2 đến thứ 7', () => {
    const payload = buildAnnouncement([session()], LINKS);

    expect(payload.embeds![0].description).toBe('31/08 – 05/09');
  });

  it('ghi chú hướng dẫn là field cuối, không inline', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const { fields } = payload.embeds![0];
    const last = fields[fields.length - 1];

    expect(fields).toHaveLength(2);
    expect(last.name).toBe('✅ Điểm danh');
    expect(last.value).toContain('/diem-danh');
    expect(last.inline).toBe(false);
  });

  it('tuần rỗng thì nói rõ, và chỉ còn lại ghi chú', () => {
    const payload = buildAnnouncement([], LINKS);

    expect(payload.embeds![0].description).toBe(
      'Tuần này chưa có ngày đánh nào.',
    );
    expect(payload.embeds![0].fields).toHaveLength(1);
  });

  it('hai nút: điểm danh mang custom_id hằng số, mở web là link button', () => {
    const payload = buildAnnouncement([session()], LINKS);
    const [attendance, website] = payload.components![0].components;

    expect(attendance).toEqual({
      type: 2,
      style: BUTTON_STYLE.primary,
      label: '✅ Điểm danh ngay',
      custom_id: ANNOUNCEMENT_ATTENDANCE_ID,
    });
    expect(website).toEqual({
      type: 2,
      style: BUTTON_STYLE.link,
      label: '🌐 Mở website',
      url: 'https://mmgh-nth.vercel.app',
    });
  });

  it('thông báo không ephemeral — cả bang phải thấy', () => {
    expect(buildAnnouncement([session()], LINKS).flags).toBeUndefined();
  });
});
