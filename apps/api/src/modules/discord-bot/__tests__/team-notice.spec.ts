import { MAX_CONTENT_LENGTH } from '../discord.constants';
import { buildTeamNotice } from '../team-notice';
import type { TeamNoticeInput } from '../team-notice';

/** 19/08/2026 20:30 Vietnam time. */
const SCRIM_AT_2030 = new Date('2026-08-19T13:30:00.000Z');

/** 08/08/2026 20:00 Vietnam time, a Saturday. */
const GUILD_WAR_AT_2000 = new Date('2026-08-08T13:00:00.000Z');

/** Id of the guild war channel the no-image variant points at. */
const CHANNEL_ID = '777000111';

/**
 * The input for team 3 of the first of two scrim matches, without an image.
 * @param overrides - The fields to change from the defaults
 * @returns A complete input for `buildTeamNotice`
 */
function input(overrides: Partial<TeamNoticeInput> = {}): TeamNoticeInput {
  return {
    isGuildWar: false,
    dateTime: SCRIM_AT_2030,
    matchIndex: 1,
    matchCount: 2,
    team: 3,
    teamName: 'Hổ Báo',
    hasImage: false,
    bangChienChannelId: CHANNEL_ID,
    note: null,
    ...overrides,
  };
}

describe('buildTeamNotice', () => {
  it('tiêu đề mang loại trận, giờ, ngày và trận thứ mấy', () => {
    const { content } = buildTeamNotice(input());

    expect(content.split('\n')[0]).toBe('**SCRIM 20:30 19/08 - Trận 1/2**');
  });

  it('Guild War ghi BANG CHIẾN', () => {
    const { content } = buildTeamNotice(input({ isGuildWar: true }));

    expect(content.split('\n')[0]).toContain('**BANG CHIẾN ');
  });

  it('nói người nhận ở team nào, tên team in đậm kèm số team', () => {
    const { content } = buildTeamNotice(input());

    expect(content).toContain('Bạn ở **Hổ Báo** (team 3)');
  });

  it('team chưa đặt tên thì gọi là Team N', () => {
    const { content } = buildTeamNotice(input({ teamName: null }));

    expect(content).toContain('Bạn ở **Team 3**');
    expect(content).not.toContain('(team 3)');
  });

  it('nhắc giờ online bằng đúng mốc của tin channel: 30 phút trước giờ đánh', () => {
    const { content } = buildTeamNotice(input());

    expect(content).toContain('Online trước 20:00.');
  });

  it('Guild War 20:00 nhắc 19:30', () => {
    const { content } = buildTeamNotice(
      input({
        isGuildWar: true,
        dateTime: GUILD_WAR_AT_2000,
      }),
    );

    expect(content).toContain('Online trước 19:30.');
  });

  it('có ảnh thì chỉ có hai dòng: tiêu đề, và tên team kèm giờ online', () => {
    const { content } = buildTeamNotice(input({ hasImage: true }));

    expect(content.split('\n')).toEqual([
      '**SCRIM 20:30 19/08 - Trận 1/2**',
      'Bạn ở **Hổ Báo** (team 3). Online trước 20:00.',
    ]);
  });

  it('không ảnh thì thêm dòng trỏ về channel bang chiến', () => {
    const { content } = buildTeamNotice(input());

    expect(content.split('\n')).toEqual([
      '**SCRIM 20:30 19/08 - Trận 1/2**',
      'Bạn ở **Hổ Báo** (team 3). Online trước 20:00.',
      `Xem đội hình trong <#${CHANNEL_ID}>.`,
    ]);
  });

  it('có ảnh thì không nhắc channel', () => {
    const { content } = buildTeamNotice(input({ hasImage: true }));

    expect(content).not.toContain('<#');
  });

  it('không liệt kê vị trí hay note: ảnh đã có, link channel đã đủ để xem', () => {
    const { content } = buildTeamNotice(input());

    expect(content).not.toContain('←');
    expect(content).not.toMatch(/^\d\./m);
  });

  it('không cho tin ping ai, kể cả khi tên team có @everyone', () => {
    const payload = buildTeamNotice(input({ teamName: '@everyone <@&123>' }));

    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it('dưới giới hạn 2000 ký tự của Discord với tên team 24 ký tự', () => {
    const { content } = buildTeamNotice(input({ teamName: 'T'.repeat(24) }));

    expect(content.length).toBeLessThan(MAX_CONTENT_LENGTH);
  });
});

describe('buildTeamNotice — lưu ý thêm', () => {
  it('lưu ý nằm ngay dưới tiêu đề, trên dòng "Bạn ở", dạng quote', () => {
    const { content } = buildTeamNotice(input({ note: 'Mang giáp\nVào sớm' }));

    expect(content.split('\n').slice(0, 4)).toEqual([
      '**SCRIM 20:30 19/08 - Trận 1/2**',
      '> Mang giáp',
      '> Vào sớm',
      'Bạn ở **Hổ Báo** (team 3). Online trước 20:00.',
    ]);
  });

  it('không có lưu ý thì không có dòng quote nào', () => {
    const { content } = buildTeamNotice(input());

    expect(content.split('\n').some((line) => line.startsWith('>'))).toBe(
      false,
    );
  });

  it('lưu ý không mở mention nào', () => {
    const payload = buildTeamNotice(input({ note: '@everyone <@123>' }));

    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });
});
