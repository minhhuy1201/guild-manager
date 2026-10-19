import {
  SLOTS_PER_TEAM,
  TEAM_COUNT,
  buildSlotId,
  parseSlotId,
} from '@guild/shared/lib';

describe('slot id của lưới đội hình', () => {
  it('lưới có 10 team, mỗi team 6 ô', () => {
    expect(TEAM_COUNT).toBe(10);
    expect(SLOTS_PER_TEAM).toBe(6);
  });

  it('viết slot id theo dạng team-N-pos-M', () => {
    expect(buildSlotId(3, 2)).toBe('team-3-pos-2');
  });

  it('đọc ngược được mọi ô của lưới', () => {
    for (let team = 1; team <= TEAM_COUNT; team += 1) {
      for (let position = 1; position <= SLOTS_PER_TEAM; position += 1) {
        expect(parseSlotId(buildSlotId(team, position))).toEqual({
          team,
          position,
        });
      }
    }
  });

  it.each([
    ['chuỗi rỗng', ''],
    ['sai tiền tố', 'squad-1-pos-1'],
    ['thiếu vị trí', 'team-1'],
    ['thừa đuôi', 'team-1-pos-1-x'],
    ['thừa đầu', 'x-team-1-pos-1'],
    ['số 0', 'team-0-pos-1'],
    ['số 0 đứng đầu', 'team-01-pos-1'],
    ['team vượt lưới', 'team-11-pos-1'],
    ['vị trí vượt lưới', 'team-1-pos-7'],
    ['số âm', 'team--1-pos-1'],
  ])('trả về null cho %s', (_label, slotId) => {
    expect(parseSlotId(slotId)).toBeNull();
  });
});
