import { ANNOUNCEMENT_LEAVE_ID } from '../custom-id';
import { buildEntryButtons } from '../entry-buttons';
import { BUTTON_STYLE } from '../discord.constants';

describe('buildEntryButtons', () => {
  it('có ba nút, nút giữa mở modal xin nghỉ', () => {
    const { components } = buildEntryButtons('https://example.test');

    expect(components).toHaveLength(3);
    expect(components[1]).toEqual({
      type: 2,
      style: BUTTON_STYLE.secondary,
      label: '🏖️ Xin nghỉ',
      custom_id: ANNOUNCEMENT_LEAVE_ID,
    });
    expect(ANNOUNCEMENT_LEAVE_ID).toBe('ann:nghi-phep');
  });
});
