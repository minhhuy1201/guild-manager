import { weekStartQuerySchema } from '@guild/shared/schemas';

describe('weekStartQuerySchema', () => {
  it('không gửi weekStart là hợp lệ', () => {
    expect(weekStartQuerySchema.parse({})).toEqual({});
  });

  it('?weekStart= (chuỗi rỗng) cư xử như bỏ trống', () => {
    expect(weekStartQuerySchema.parse({ weekStart: '' })).toEqual({
      weekStart: undefined,
    });
  });

  it('nhận chuỗi ISO dạng Z', () => {
    const value = '2026-07-20T00:00:00.000Z';

    expect(weekStartQuerySchema.parse({ weekStart: value }).weekStart).toBe(
      value,
    );
  });

  it('nhận chuỗi ISO kèm offset +07:00', () => {
    const value = '2026-07-20T00:00:00+07:00';

    expect(weekStartQuerySchema.parse({ weekStart: value }).weekStart).toBe(
      value,
    );
  });

  it('từ chối chuỗi không phải ISO, thông báo tiếng Việt', () => {
    const result = weekStartQuerySchema.safeParse({ weekStart: 'xyz' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Tuần không hợp lệ.');
  });

  it('từ chối chuỗi chỉ có ngày', () => {
    expect(
      weekStartQuerySchema.safeParse({ weekStart: '2026-07-20' }).success,
    ).toBe(false);
  });
});
