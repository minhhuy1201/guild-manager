import { MAX_CONTENT_LENGTH } from '../discord.constants';
import {
  hasUndelivered,
  reminderFailureText,
  reminderUndeliveredText,
  undeliveredLines,
} from '../reminder-alert';

describe('reminderFailureText', () => {
  it('chỉ cách nhắc bù và không nhắc tới kênh nhắc', () => {
    const text = reminderFailureText();

    expect(text).toContain('/nhac-diem-danh');
    expect(text).not.toContain('Send Messages');
  });
});

describe('undelivered groups', () => {
  const groups = {
    unlinked: ['Chim Sẻ'],
    blocked: ['Cún Con', 'Mèo Béo'],
    unsent: [],
  };

  it('chỉ liệt kê nhóm có người', () => {
    const lines = undeliveredLines(groups);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Chim Sẻ');
    expect(lines[1]).toContain('Cún Con, Mèo Béo');
  });

  it('hasUndelivered đúng khi có và không có người', () => {
    expect(hasUndelivered(groups)).toBe(true);
    expect(hasUndelivered({ unlinked: [], blocked: [], unsent: [] })).toBe(
      false,
    );
  });

  it('cắt theo giới hạn ký tự dù bang đông', () => {
    const names = Array.from(
      { length: 400 },
      (_, index) => `Thành Viên Số ${index} Tên Hơi Dài`,
    );

    const text = reminderUndeliveredText({
      unlinked: names,
      blocked: names,
      unsent: names,
    });

    expect(text.length).toBeLessThanOrEqual(MAX_CONTENT_LENGTH);
    expect(text).toContain('người nữa');
  });
});
