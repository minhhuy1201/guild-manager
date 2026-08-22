import { FixedClock, SystemClock } from '../clock';

describe('SystemClock', () => {
  it('trả về thời điểm hiện tại của máy', () => {
    const before = Date.now();
    const instant = new SystemClock().now();

    expect(instant).toBeInstanceOf(Date);
    expect(instant.getTime()).toBeGreaterThanOrEqual(before);
    expect(instant.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('FixedClock', () => {
  it('luôn trả về đúng mốc đã bơm, không đổi giữa các lần gọi', () => {
    const instant = new Date('2026-07-22T05:00:00.000Z');
    const clock = new FixedClock(instant);

    expect(clock.now()).toEqual(instant);
    expect(clock.now()).toEqual(instant);
  });
});
