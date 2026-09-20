import type { BattleSession } from '@guild/shared/schemas';

import {
  MAX_CONTENT_LENGTH,
  MAX_EMBED_DESCRIPTION_LENGTH,
} from '../discord.constants';
import { buildReminder, type DueSession } from '../reminder';

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

/** One due battle day with two linked members missing. */
const GUILD_WAR: DueSession = {
  session: session(),
  missing: [
    { name: 'Mèo Béo', discordId: '111' },
    { name: 'Cún Con', discordId: '222' },
  ],
};

/** A second due battle day, a scrim, missing one of the same people. */
const SCRIM: DueSession = {
  session: session({ id: 's1', label: 'Thứ 5 · 20:30', isGuildWar: false }),
  missing: [{ name: 'Mèo Béo', discordId: '111' }],
};

describe('buildReminder', () => {
  // One message can cover a match closing today and one closing tomorrow morning, so the opening
  // line never names a day.
  it('câu mở đầu không nói hôm nay hay ngày mai', () => {
    expect(buildReminder([GUILD_WAR], WEB_ORIGIN).content).toMatch(
      /^⏰ \*\*Nhắc điểm danh\*\* - mấy ngày dưới đây sắp hết hạn điểm danh\.\n/,
    );
  });

  // Discord only notifies on mentions in the message text; a mention inside an embed wakes nobody.
  it('đặt mention trong content, không phải trong embed', () => {
    const payload = buildReminder([GUILD_WAR], WEB_ORIGIN);

    expect(payload.content).toContain('<@111>');
    expect(payload.content).toContain('<@222>');
    expect(payload.embeds?.[0].description).not.toContain('<@111>');
  });

  it('mỗi người chỉ mention một lần dù thiếu nhiều ngày', () => {
    const payload = buildReminder([GUILD_WAR, SCRIM], WEB_ORIGIN);

    expect(payload.content.match(/<@111>/g)).toHaveLength(1);
  });

  it('khoá allowed_mentions vào đúng những người được nhắc', () => {
    const payload = buildReminder([GUILD_WAR], WEB_ORIGIN);

    expect(payload.allowed_mentions).toEqual({ users: ['111', '222'] });
  });

  it('mỗi ngày đánh một heading riêng, icon theo loại', () => {
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

  it('người chưa liên kết Discord hiện tên nhưng không lọt vào mention', () => {
    const due: DueSession = {
      session: session(),
      missing: [
        { name: 'Mèo Béo', discordId: '111' },
        { name: 'Chim Sẻ', discordId: null },
      ],
    };

    const payload = buildReminder([due], WEB_ORIGIN);
    const description = payload.embeds?.[0].description as string;

    expect(payload.allowed_mentions).toEqual({ users: ['111'] });
    expect(description).toContain('Chưa liên kết Discord: Chim Sẻ');
    expect(description).toContain('Mèo Béo');
  });

  // The number is attendance progress, not how many people could be pinged.
  it('số đếm tính cả người chưa liên kết Discord', () => {
    const due: DueSession = {
      session: session(),
      missing: [
        { name: 'Mèo Béo', discordId: '111' },
        { name: 'Chim Sẻ', discordId: null },
      ],
    };

    expect(buildReminder([due], WEB_ORIGIN).embeds?.[0].description).toContain(
      'còn 2 người',
    );
  });

  it('bỏ hẳn dòng "chưa liên kết" khi mọi người đều có Discord ID', () => {
    expect(
      buildReminder([GUILD_WAR], WEB_ORIGIN).embeds?.[0].description,
    ).not.toContain('Chưa liên kết Discord');
  });

  it('mang cùng hàng nút với thông báo tuần', () => {
    const row = buildReminder([GUILD_WAR], WEB_ORIGIN).components?.[0];

    expect(row?.components).toHaveLength(2);
    expect(row?.components[1]).toMatchObject({
      url: `${WEB_ORIGIN}/dang-nhap?redirect=%2F`,
    });
  });

  describe('giới hạn ký tự của Discord', () => {
    /**
     * A match day missing a great many people, enough to overflow both limits.
     * @param count - How many people are still missing
     * @returns The match day together with its missing list
     */
    function crowded(count: number): DueSession {
      return {
        session: session(),
        missing: Array.from({ length: count }, (_, index) => ({
          // Names as long as the guild's real ones, not 'a'.
          name: `Thành Viên Số ${index} Tên Hơi Dài`,
          // String concatenation rather than addition: 1e17 is past Number.MAX_SAFE_INTEGER, so
          // adding to it gives several indexes the same id and shrinks the set of missing people.
          discordId: `10000000000${String(index).padStart(7, '0')}`,
        })),
      };
    }

    it('content không vượt 2000 ký tự dù bang đông đến đâu', () => {
      // A comment in reminder.ts named this exact risk while no line handled it: Discord answers
      // 400, DiscordApiError surfaces raw, and no nudge goes out that morning.
      const payload = buildReminder([crowded(300)], WEB_ORIGIN);

      expect(payload.content.length).toBeLessThanOrEqual(MAX_CONTENT_LENGTH);
      expect(payload.content).toContain('người nữa');
    });

    it('chỉ cho phép ping đúng những người thật sự được nhắc tới', () => {
      const payload = buildReminder([crowded(300)], WEB_ORIGIN);

      const mentioned = payload.allowed_mentions?.users ?? [];
      expect(mentioned.length).toBeGreaterThan(0);
      expect(mentioned.length).toBeLessThan(300);
      for (const id of mentioned) {
        expect(payload.content).toContain(`<@${id}>`);
      }
    });

    it('embed description không vượt 4096 ký tự', () => {
      const payload = buildReminder([crowded(300)], WEB_ORIGIN);

      expect(payload.embeds?.[0].description.length).toBeLessThanOrEqual(
        MAX_EMBED_DESCRIPTION_LENGTH,
      );
    });

    it('nhiều ngày dồn lại cũng không tràn', () => {
      const payload = buildReminder(
        [crowded(120), crowded(120), crowded(120)],
        WEB_ORIGIN,
      );

      expect(payload.content.length).toBeLessThanOrEqual(MAX_CONTENT_LENGTH);
      expect(payload.embeds?.[0].description.length).toBeLessThanOrEqual(
        MAX_EMBED_DESCRIPTION_LENGTH,
      );
    });
  });
});
