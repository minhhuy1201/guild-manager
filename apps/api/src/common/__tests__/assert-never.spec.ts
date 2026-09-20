import { assertNever } from '../assert-never';

describe('assertNever', () => {
  it('ném lỗi kèm chính giá trị không xử lý được', () => {
    // Cast through unknown: this is exactly the case of data from outside the process carrying a
    // tag the type swears cannot exist - the one situation where assertNever still does anything at
    // runtime.
    const unhandled = { type: 99 } as unknown as never;

    expect(() =>
      assertNever(unhandled, 'Interaction type ngoài dự kiến'),
    ).toThrow('Interaction type ngoài dự kiến: {"type":99}');
  });
});
