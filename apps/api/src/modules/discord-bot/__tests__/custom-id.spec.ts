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
    // Other bot messages will send their custom_id through this same endpoint later on.
    expect(decodeAttendanceButtonId('something-else')).toBeNull();
    expect(decodeAttendanceButtonId('dd:chi-co-hai-manh')).toBeNull();
    expect(decodeAttendanceButtonId('dd:a:b:9')).toBeNull();
  });

  it('ném lỗi thay vì dựng một custom_id quá dài', () => {
    // Discord rejects the whole message rather than just the button, so this has to blow up at
    // build time.
    expect(() =>
      encodeAttendanceButtonId({
        sessionId: 'x'.repeat(60),
        characterId: 'y'.repeat(60),
        isPresent: true,
      }),
    ).toThrow();
  });
});
