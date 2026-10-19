import { SLOTS_PER_TEAM } from '@guild/shared/lib';

import { MAX_CONTENT_LENGTH } from '../discord.constants';
import { buildTeamNotice } from '../team-notice';
import type { TeamNoticeInput, TeamNoticeSlot } from '../team-notice';

/** 19/08/2026 20:30 Vietnam time. */
const SCRIM_AT_2030 = new Date('2026-08-19T13:30:00.000Z');

/** A slot nobody stands in and nobody wrote on. */
const EMPTY: TeamNoticeSlot = { characterId: null, name: null, note: null };

/**
 * The six slots of a team, the given ones first and the rest empty.
 * @param filled - Slots from position 1 downwards
 * @returns Exactly `SLOTS_PER_TEAM` slots
 */
function slotsOf(...filled: TeamNoticeSlot[]): TeamNoticeSlot[] {
  return Array.from(
    { length: SLOTS_PER_TEAM },
    (_, index) => filled[index] ?? EMPTY,
  );
}

/**
 * The input for Kirito in team 3 of the first of two scrim matches.
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
    recipientId: 'kirito',
    slots: slotsOf(
      { characterId: 'meo', name: 'Mèo Mập', note: null },
      { characterId: 'kirito', name: 'Kirito', note: null },
    ),
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

  it('nhắc giờ online bằng đúng mốc của tin channel: 45 phút trước giờ đánh', () => {
    const { content } = buildTeamNotice(input());

    expect(content).toContain('Online trước 19:45.');
  });

  it('Guild War nhắc 19:30', () => {
    const { content } = buildTeamNotice(input({ isGuildWar: true }));

    expect(content).toContain('Online trước 19:30.');
  });

  it('liệt kê đủ 6 vị trí theo thứ tự, ô trống ghi (trống)', () => {
    const { content } = buildTeamNotice(input());

    expect(content.split('\n').slice(-SLOTS_PER_TEAM)).toEqual([
      '1. Mèo Mập',
      '2. **Kirito** ← bạn',
      '3. (trống)',
      '4. (trống)',
      '5. (trống)',
      '6. (trống)',
    ]);
  });

  it('ghi note sau dấu gạch, kể cả trên ô trống', () => {
    const { content } = buildTeamNotice(
      input({
        slots: slotsOf(
          { characterId: 'meo', name: 'Mèo Mập', note: 'đánh boss phụ' },
          { characterId: 'kirito', name: 'Kirito', note: 'tank' },
          { characterId: null, name: null, note: 'giữ chỗ cho Asuna' },
        ),
      }),
    );

    expect(content).toContain('1. Mèo Mập - đánh boss phụ');
    expect(content).toContain('2. **Kirito** ← bạn - tank');
    expect(content).toContain('3. (trống) - giữ chỗ cho Asuna');
  });

  it('không cho tin ping ai, kể cả khi note có @everyone', () => {
    const payload = buildTeamNotice(
      input({
        slots: slotsOf({
          characterId: 'kirito',
          name: 'Kirito',
          note: '@everyone <@&123>',
        }),
      }),
    );

    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it('dưới giới hạn 2000 ký tự của Discord với tên 50 ký tự và note 60 ký tự', () => {
    const longSlot = (id: string): TeamNoticeSlot => ({
      characterId: id,
      name: 'n'.repeat(50),
      note: 'x'.repeat(60),
    });
    const { content } = buildTeamNotice(
      input({
        teamName: 'T'.repeat(24),
        recipientId: 'a',
        slots: slotsOf(
          longSlot('a'),
          longSlot('b'),
          longSlot('c'),
          longSlot('d'),
          longSlot('e'),
          longSlot('f'),
        ),
      }),
    );

    expect(content.length).toBeLessThan(MAX_CONTENT_LENGTH);
  });
});
