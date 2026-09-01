import { interactionSchema } from '../interaction.schema';

describe('interactionSchema', () => {
  it('đọc được gói PING Discord dùng để kiểm tra endpoint', () => {
    const parsed = interactionSchema.parse({ type: 1 });

    expect(parsed).toEqual({ type: 1 });
  });

  it('đọc được một lệnh và giữ lại tên lệnh', () => {
    const parsed = interactionSchema.parse({
      type: 2,
      data: { name: 'ping', id: '123' },
    });

    expect(parsed).toEqual({ type: 2, data: { name: 'ping' } });
  });

  it('từ chối type không nằm trong hai loại đang xử lý', () => {
    // 3 = MESSAGE_COMPONENT (bấm nút). Chưa hỗ trợ, và im lặng nhận vào là tệ hơn từ chối.
    expect(() => interactionSchema.parse({ type: 3 })).toThrow();
  });

  it('từ chối một lệnh không có tên', () => {
    expect(() => interactionSchema.parse({ type: 2, data: {} })).toThrow();
  });
});
