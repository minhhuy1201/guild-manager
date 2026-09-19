import {
  buildFormationAnnouncement,
  type FormationAnnouncementInput,
} from '../formation-announcement';

const LINKS = { guildRoleId: '999888777', baoBanChannelId: '111222333' };

/** 19/08/2026 20:30 Vietnam time. */
const SCRIM_AT_2030 = new Date('2026-08-19T13:30:00.000Z');

/** 19/08/2026 09:00 Vietnam time - the same day as the match above. */
const MORNING_OF_BATTLE = new Date('2026-08-19T02:00:00.000Z');

/**
 * The input for a 20:30 scrim, with the button pressed on the morning of the match.
 * @param overrides - The fields to change from the defaults
 * @returns A complete input for `buildFormationAnnouncement`
 */
function input(
  overrides: Partial<FormationAnnouncementInput> = {},
): FormationAnnouncementInput {
  return {
    isGuildWar: false,
    dateTime: SCRIM_AT_2030,
    matchCount: 2,
    now: MORNING_OF_BATTLE,
    ...overrides,
  };
}

describe('buildFormationAnnouncement — scrim', () => {
  it('suy ba mốc giờ từ giờ đánh: −45, −15, −45', () => {
    const { content } = buildFormationAnnouncement(input(), LINKS);

    expect(content).toContain('online *sớm trước 19:45*');
    expect(content).toContain('Sau 20:15 chưa online');
    expect(content).toContain('vào trễ *sau 19:45*');
  });

  it('tiêu đề mang loại trận, giờ, ngày và số trận', () => {
    const { content } = buildFormationAnnouncement(input(), LINKS);

    expect(content.split('\n')[0]).toBe('# SCRIM 20:30 19/08 TỐI NAY - 2 TRẬN');
  });
});

describe('buildFormationAnnouncement — bang chiến', () => {
  // Bang chiến is pinned to 20:00 on Saturday (architecture.md §6), so its three checkpoints are
  // fixed text rather than a set of offsets - 19:30 is -30 minutes, which does not match a scrim's
  // -45.
  it('in cứng 19:30 / 19:45 / 19:45', () => {
    const { content } = buildFormationAnnouncement(
      input({
        isGuildWar: true,
        dateTime: new Date('2026-08-08T13:00:00.000Z'),
        now: new Date('2026-08-08T02:00:00.000Z'),
      }),
      LINKS,
    );

    expect(content).toContain('online *sớm trước 19:30*');
    expect(content).toContain('Sau 19:45 chưa online');
    expect(content).toContain('vào trễ *sau 19:45*');
    expect(content.split('\n')[0]).toBe(
      '# BANG CHIẾN 20:00 08/08 TỐI NAY - 2 TRẬN',
    );
  });
});

describe('buildFormationAnnouncement — cụm ngày', () => {
  it('thông báo trước một ngày thì đọc là TỐI MAI', () => {
    const { content } = buildFormationAnnouncement(
      input({ now: new Date('2026-08-18T02:00:00.000Z') }),
      LINKS,
    );

    expect(content.split('\n')[0]).toContain('19/08 TỐI MAI -');
  });

  it('xa hơn ngày mai thì bỏ hẳn cụm ngày', () => {
    const { content } = buildFormationAnnouncement(
      input({ now: new Date('2026-08-15T02:00:00.000Z') }),
      LINKS,
    );

    expect(content.split('\n')[0]).toBe('# SCRIM 20:30 19/08 - 2 TRẬN');
  });

  // Midnight Vietnam time is 17:00 UTC the previous day: comparing dates in server time is off by
  // exactly one day.
  it('so ngày theo giờ Việt Nam, không theo UTC', () => {
    const { content } = buildFormationAnnouncement(
      input({ now: new Date('2026-08-18T17:30:00.000Z') }),
      LINKS,
    );

    expect(content.split('\n')[0]).toContain('TỐI NAY');
  });
});

describe('buildFormationAnnouncement — mention', () => {
  it('ping role bang và chỉ cho phép ping đúng role đó', () => {
    const payload = buildFormationAnnouncement(input(), LINKS);

    expect(payload.content.endsWith('<@&999888777>')).toBe(true);
    expect(payload.allowed_mentions).toEqual({ roles: ['999888777'] });
  });

  it('link tới channel báo bận thay vì chữ thường', () => {
    const { content } = buildFormationAnnouncement(input(), LINKS);

    expect(content).toContain('báo gấp vào <#111222333> .');
  });

  it('số trận đọc từ lịch đánh, không phải số ảnh', () => {
    const { content } = buildFormationAnnouncement(
      input({ matchCount: 1 }),
      LINKS,
    );

    expect(content.split('\n')[0]).toContain('- 1 TRẬN');
  });
});
