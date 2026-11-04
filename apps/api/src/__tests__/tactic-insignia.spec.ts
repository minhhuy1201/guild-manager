import { TACTIC_INSIGNIA_KEYS } from '@guild/shared/enums';
import {
  NUMBERED_TEAM_COUNT,
  TACTIC_INSIGNIA,
  numberedTeamLabel,
} from '@guild/shared/lib';

describe('tactic Insignia', () => {
  it('có đủ 7 Quân hiệu theo thứ tự của enum key', () => {
    expect(TACTIC_INSIGNIA).toHaveLength(7);
    expect(TACTIC_INSIGNIA.map((insignia) => insignia.key)).toEqual([
      ...TACTIC_INSIGNIA_KEYS,
    ]);
  });

  it('key là duy nhất', () => {
    expect(new Set(TACTIC_INSIGNIA_KEYS).size).toBe(
      TACTIC_INSIGNIA_KEYS.length,
    );
  });

  it('tên mặc định và icon giữ đúng thứ tự cũ', () => {
    expect(
      TACTIC_INSIGNIA.map(({ defaultLabel, icon }) => [defaultLabel, icon]),
    ).toEqual([
      ['Đội công', 'swords'],
      ['Đội thủ', 'shield'],
      ['Cơ động', 'footprints'],
      ['Trinh sát', 'eye'],
      ['Tập kết', 'flag'],
      ['Đội trụ', 'castle'],
      ['Bảo tiêu', 'truck'],
    ]);
  });

  it('đặt nhãn "Đội N" cho 10 đội', () => {
    expect(NUMBERED_TEAM_COUNT).toBe(10);
    expect(numberedTeamLabel(3)).toBe('Đội 3');
  });
});
