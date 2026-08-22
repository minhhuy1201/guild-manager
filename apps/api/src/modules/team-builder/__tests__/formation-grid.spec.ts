import type { MatchFormation } from '@guild/shared/schemas';

import { decodeMatch, encodeMatch, isSessionLocked } from '../formation-grid';

/**
 * Sắp các hàng theo slotId để so sánh không phụ thuộc thứ tự duyệt của Set.
 * @param rows - Các hàng cần sắp
 * @returns Bản sao đã sắp theo slotId tăng dần
 */
function bySlotId<T extends { slotId: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) =>
    left.slotId.localeCompare(right.slotId),
  );
}

describe('encodeMatch', () => {
  it('ô chỉ có ghi chú vẫn thành một hàng, characterId null', () => {
    const rows = encodeMatch({
      slots: {},
      notes: { 'team-1-pos-4': 'chừa cho X' },
    });

    expect(rows).toEqual([
      { slotId: 'team-1-pos-4', characterId: null, note: 'chừa cho X' },
    ]);
  });

  it('ô vừa có người vừa có ghi chú chỉ tạo một hàng', () => {
    const rows = encodeMatch({
      slots: { 'team-1-pos-1': 'char-1' },
      notes: { 'team-1-pos-1': 'giữ buồng' },
    });

    expect(rows).toEqual([
      { slotId: 'team-1-pos-1', characterId: 'char-1', note: 'giữ buồng' },
    ]);
  });

  it('ô có người mà không ghi chú thì note null', () => {
    const rows = encodeMatch({
      slots: { 'team-1-pos-1': 'char-1' },
      notes: {},
    });

    expect(rows).toEqual([
      { slotId: 'team-1-pos-1', characterId: 'char-1', note: null },
    ]);
  });

  it('trận rỗng không sinh hàng nào', () => {
    expect(encodeMatch({ slots: {}, notes: {} })).toEqual([]);
  });
});

describe('decodeMatch', () => {
  it('hàng chỉ có ghi chú không lọt vào slots', () => {
    const match = decodeMatch([
      { slotId: 'team-1-pos-4', characterId: null, note: 'chừa cho X' },
    ]);

    expect(match.slots).not.toHaveProperty('team-1-pos-4');
    expect(match.notes).toEqual({ 'team-1-pos-4': 'chừa cho X' });
  });

  it('không có hàng nào cho đội hình rỗng, không phải undefined', () => {
    expect(decodeMatch([])).toEqual({ slots: {}, notes: {} });
  });

  it('bỏ qua field thừa của hàng đọc từ database', () => {
    // Hàng Prisma mang thêm matchId; codec chỉ đọc ba cột nó quan tâm.
    const row = {
      slotId: 'team-1-pos-1',
      characterId: 'char-1',
      note: null,
      matchId: 'match-1',
    };

    const match = decodeMatch([row]);

    expect(match).toEqual({ slots: { 'team-1-pos-1': 'char-1' }, notes: {} });
  });
});

describe('round-trip encode → decode', () => {
  const cases: [string, MatchFormation][] = [
    // Ca đầu tiên là ca mà việc lấy hợp hai tập khoá sinh ra để cứu.
    [
      'ô chỉ có ghi chú',
      { slots: {}, notes: { 'team-1-pos-4': 'chừa cho X' } },
    ],
    ['ô chỉ có người', { slots: { 'team-1-pos-1': 'char-1' }, notes: {} }],
    [
      'ô có cả hai',
      {
        slots: { 'team-1-pos-1': 'char-1' },
        notes: { 'team-1-pos-1': 'giữ buồng' },
      },
    ],
    [
      'lưới trộn cả ba loại ô',
      {
        slots: { 'team-1-pos-1': 'char-1', 'team-2-pos-3': 'char-2' },
        notes: { 'team-1-pos-1': 'giữ buồng', 'team-1-pos-4': 'chừa cho X' },
      },
    ],
    ['trận rỗng', { slots: {}, notes: {} }],
  ];

  it.each(cases)('%s', (_name, match) => {
    expect(decodeMatch(encodeMatch(match))).toEqual(match);
  });
});

describe('round-trip decode → encode', () => {
  it('các hàng đọc lên rồi ghi lại giữ nguyên nội dung', () => {
    const rows = [
      { slotId: 'team-1-pos-1', characterId: 'char-1', note: 'giữ buồng' },
      { slotId: 'team-1-pos-4', characterId: null, note: 'chừa cho X' },
      { slotId: 'team-2-pos-3', characterId: 'char-2', note: null },
    ];

    expect(bySlotId(encodeMatch(decodeMatch(rows)))).toEqual(bySlotId(rows));
  });
});

describe('isSessionLocked', () => {
  const dateTime = new Date('2026-07-23T13:30:00Z');

  it('trước giờ đánh thì chưa khoá', () => {
    expect(isSessionLocked(dateTime, new Date('2026-07-23T13:29:59Z'))).toBe(
      false,
    );
  });

  it('đúng giờ đánh vẫn chưa khoá', () => {
    expect(isSessionLocked(dateTime, new Date(dateTime))).toBe(false);
  });

  it('sau giờ đánh thì khoá', () => {
    expect(isSessionLocked(dateTime, new Date('2026-07-23T13:30:01Z'))).toBe(
      true,
    );
  });
});
