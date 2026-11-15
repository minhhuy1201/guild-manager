import type { BattleSession } from '@guild/shared/schemas';

import { MAX_EMBED_DESCRIPTION_LENGTH } from '../discord.constants';
import { buildReminder } from '../reminder';

const WEB_ORIGIN = 'https://mmgh-nth.vercel.app';

/**
 * A battle session carrying the fields the reminder reads.
 * @param overrides - Fields to change
 * @returns A session shaped like the API returns one
 */
function session(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 'gw-2026-09-05',
    label: 'Thứ 7 · 20:00 · Bang Chiến',
    dateTime: '2026-09-05T13:00:00.000Z',
    // 17:00 Vietnam time on Thursday 03/09.
    deadline: '2026-09-03T10:00:00.000Z',
    isAttendanceClosed: false,
    canReopenAttendance: false,
    isGuildWar: true,
    opponent: null,
    weekStart: '2026-08-30T17:00:00.000Z',
    attendanceCount: 0,
    matchCount: 2,
    formationMatchCount: 0,
    ...overrides,
  };
}

const GUILD_WAR = session();

const SCRIM = session({
  id: 's1',
  label: 'Thứ 5 · 20:30',
  isGuildWar: false,
});

describe('buildReminder', () => {
  it('mỗi ngày thiếu một heading riêng, icon theo loại', () => {
    const description = buildReminder([GUILD_WAR, SCRIM], WEB_ORIGIN)
      .embeds?.[0].description as string;

    expect(description).toContain('### 🛡️ Thứ 7 · 20:00 · Bang Chiến');
    expect(description).toContain('### ⚔️ Thứ 5 · 20:30');
  });

  it('in hạn chót đã dựng thành chữ', () => {
    const description = buildReminder([GUILD_WAR], WEB_ORIGIN).embeds?.[0]
      .description as string;

    expect(description).toContain('17:00 · Thứ 5 (03/09)');
  });

  // A DM reaches only its recipient, and the label is data from the database.
  it('không mention ai và đóng mọi loại mention', () => {
    const payload = buildReminder([GUILD_WAR, SCRIM], WEB_ORIGIN);

    expect(payload.content).not.toMatch(/<@/);
    expect(payload.embeds?.[0].description).not.toMatch(/<@/);
    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it('không liệt kê tên người khác hay số người còn thiếu', () => {
    const description = buildReminder([GUILD_WAR], WEB_ORIGIN).embeds?.[0]
      .description as string;

    expect(description).not.toContain('người');
    expect(description).not.toContain('Chưa liên kết');
  });

  it('mang cùng hàng nút với thông báo tuần', () => {
    const row = buildReminder([GUILD_WAR], WEB_ORIGIN).components?.[0];

    expect(row?.components).toHaveLength(4);
    expect(row?.components[3]).toMatchObject({
      url: `${WEB_ORIGIN}/dang-nhap?redirect=%2F`,
    });
  });

  it('embed description không vượt 4096 ký tự dù nhiều ngày', () => {
    const many = Array.from({ length: 400 }, (_, index) =>
      session({ id: `s${index}`, label: `Ngày số ${index} · 20:30` }),
    );

    const description = buildReminder(many, WEB_ORIGIN).embeds?.[0]
      .description as string;

    expect(description.length).toBeLessThanOrEqual(
      MAX_EMBED_DESCRIPTION_LENGTH,
    );
    expect(description).toContain('ngày đánh nữa');
  });
});
