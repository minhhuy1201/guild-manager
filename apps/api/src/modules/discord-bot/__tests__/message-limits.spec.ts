import { takeWithinLimit } from '../message-limits';

/** Đuôi dùng chung cho các ca dưới đây. */
const more = (count: number) => `+${count} nữa`;

describe('takeWithinLimit', () => {
  it('giữ nguyên khi vừa ngân sách', () => {
    const { kept, text } = takeWithinLimit(['aaa', 'bbb'], {
      separator: ' ',
      limit: 100,
      more,
    });

    expect(kept).toEqual(['aaa', 'bbb']);
    expect(text).toBe('aaa bbb');
  });

  it('cắt bớt và nói còn bao nhiêu, không bao giờ vượt ngân sách', () => {
    const items = Array.from({ length: 20 }, (_, index) => `muc-${index}`);

    const { kept, text } = takeWithinLimit(items, {
      separator: ' ',
      limit: 40,
      more,
    });

    expect(text.length).toBeLessThanOrEqual(40);
    expect(kept.length).toBeLessThan(items.length);
    expect(text).toContain(`+${items.length - kept.length} nữa`);
    // Phần giữ lại luôn là khúc đầu, nên caller map ngược về dữ liệu gốc được bằng độ dài.
    expect(text.startsWith(kept.join(' '))).toBe(true);
  });

  it('danh sách rỗng ra chuỗi rỗng, không ra đuôi "+0 nữa"', () => {
    expect(takeWithinLimit([], { separator: ' ', limit: 10, more })).toEqual({
      kept: [],
      text: '',
    });
  });

  it('ngân sách nhỏ hơn cả một mục thì vẫn không vượt', () => {
    const { kept, text } = takeWithinLimit(['mot-muc-rat-dai'], {
      separator: ' ',
      limit: 5,
      more,
    });

    expect(kept).toEqual([]);
    expect(text.length).toBeLessThanOrEqual(5);
  });
});
