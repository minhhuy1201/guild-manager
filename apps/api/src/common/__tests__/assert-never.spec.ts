import { assertNever } from '../assert-never';

describe('assertNever', () => {
  it('ném lỗi kèm chính giá trị không xử lý được', () => {
    // Cast qua unknown: đây đúng là tình huống dữ liệu ngoài process mang tag mà kiểu hứa là không
    // thể có — thứ duy nhất assertNever còn tác dụng lúc chạy.
    const unhandled = { type: 99 } as unknown as never;

    expect(() =>
      assertNever(unhandled, 'Interaction type ngoài dự kiến'),
    ).toThrow('Interaction type ngoài dự kiến: {"type":99}');
  });
});
