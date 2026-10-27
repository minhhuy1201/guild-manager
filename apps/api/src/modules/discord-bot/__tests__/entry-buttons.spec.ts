import {
  ANNOUNCEMENT_AUTO_ATTEND_ID,
  ANNOUNCEMENT_LEAVE_ID,
} from '../custom-id';
import { buildEntryButtons } from '../entry-buttons';
import { BUTTON_STYLE } from '../discord.constants';

describe('buildEntryButtons', () => {
  it('có bốn nút, nút thứ hai mở modal xin nghỉ', () => {
    const { components } = buildEntryButtons('https://example.test');

    expect(components).toHaveLength(4);
    expect(components[1]).toEqual({
      type: 2,
      style: BUTTON_STYLE.secondary,
      label: '🏖️ Xin nghỉ',
      custom_id: ANNOUNCEMENT_LEAVE_ID,
    });
    expect(ANNOUNCEMENT_LEAVE_ID).toBe('ann:nghi-phep');
  });

  it('nút thứ ba mở bảng tự động điểm danh', () => {
    const { components } = buildEntryButtons('https://example.test');

    expect(components[2]).toEqual({
      type: 2,
      style: BUTTON_STYLE.secondary,
      label: '🔁 Tự động điểm danh',
      custom_id: ANNOUNCEMENT_AUTO_ATTEND_ID,
    });
    expect(ANNOUNCEMENT_AUTO_ATTEND_ID).toBe('ann:tu-dong');
  });

  it('nút cuối vẫn là link mở website', () => {
    const { components } = buildEntryButtons('https://example.test');

    expect(components[3]).toMatchObject({
      style: BUTTON_STYLE.link,
      label: '🌐 Mở website',
    });
  });
});
