import {
  decodeAttendanceButtonId,
  encodeAttendanceButtonId,
} from '../custom-id';

describe('custom_id của nút điểm danh', () => {
  it('mã hoá rồi giải mã ra đúng ba mảnh', () => {
    const value = {
      sessionId: 'gw-2026-08-31',
      characterId: 'meo-beo-k7ma3x',
      isPresent: true,
    };

    expect(decodeAttendanceButtonId(encodeAttendanceButtonId(value))).toEqual(
      value,
    );
  });

  it('phân biệt Có với Không', () => {
    const no = encodeAttendanceButtonId({
      sessionId: 'gw-2026-08-31',
      characterId: 'meo-beo-k7ma3x',
      isPresent: false,
    });

    expect(decodeAttendanceButtonId(no)?.isPresent).toBe(false);
  });

  it('giải mã ra null khi custom_id không phải của nút điểm danh', () => {
    // Tin nhắn khác của bot sau này cũng gửi custom_id qua cùng một endpoint.
    expect(decodeAttendanceButtonId('something-else')).toBeNull();
    expect(decodeAttendanceButtonId('dd:chi-co-hai-manh')).toBeNull();
    expect(decodeAttendanceButtonId('dd:a:b:9')).toBeNull();
  });

  it('ném lỗi thay vì dựng một custom_id quá dài', () => {
    // Discord từ chối cả tin nhắn chứ không riêng cái nút, nên phải nổ ngay lúc dựng.
    expect(() =>
      encodeAttendanceButtonId({
        sessionId: 'x'.repeat(60),
        characterId: 'y'.repeat(60),
        isPresent: true,
      }),
    ).toThrow();
  });
});
