import { hashPassword, verifyPassword } from '../password.util';

describe('password.util', () => {
  it('verify đúng mật khẩu đã hash', async () => {
    const hash = await hashPassword('pass10001');

    await expect(verifyPassword('pass10001', hash)).resolves.toBe(true);
    await expect(verifyPassword('pass10002', hash)).resolves.toBe(false);
  });

  it('mỗi lần hash ra chuỗi khác nhau nhờ salt ngẫu nhiên', async () => {
    const [first, second] = await Promise.all([
      hashPassword('pass10001'),
      hashPassword('pass10001'),
    ]);

    expect(first).not.toBe(second);
  });

  it('trả false với hash sai định dạng thay vì ném lỗi', async () => {
    await expect(verifyPassword('pass10001', 'khong-phai-hash')).resolves.toBe(
      false,
    );
  });
});
