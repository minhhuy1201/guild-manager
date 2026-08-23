import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE, type JwtPayload } from '../../constants/auth.constant';
import { readBearerToken, readToken } from '../read-bearer-token';

/** Payload access token hợp lệ dùng chung cho mọi ca. */
const ACCESS: JwtPayload = {
  sub: 'admin',
  role: GuildRole.ADMIN,
  type: TOKEN_TYPE.access,
};

/**
 * Dựng một hàm verify giả trả payload cho trước.
 * @param payload - Payload mà verify sẽ trả về
 * @returns Hàm verify luôn thành công
 */
function verifiesAs(payload: JwtPayload) {
  return () => Promise.resolve(payload);
}

/** Verify giả luôn ném — token hỏng, sai chữ ký, hoặc hết hạn. */
const rejects = () => Promise.reject(new Error('jwt expired'));

describe('readBearerToken', () => {
  it('không có header thì null', async () => {
    await expect(
      readBearerToken(undefined, verifiesAs(ACCESS), TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('scheme khác Bearer thì null', async () => {
    await expect(
      readBearerToken('Token abc', verifiesAs(ACCESS), TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('đúng prefix nhưng token rỗng thì null', async () => {
    // 'Bearer ' lọt startsWith; chặn nằm ở verify('') ném.
    await expect(
      readBearerToken('Bearer ', rejects, TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('token hỏng hoặc hết hạn thì null', async () => {
    await expect(
      readBearerToken('Bearer abc', rejects, TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('access token hợp lệ thì trả payload', async () => {
    await expect(
      readBearerToken('Bearer abc', verifiesAs(ACCESS), TOKEN_TYPE.access),
    ).resolves.toEqual(ACCESS);
  });
});

describe('readToken', () => {
  it('refresh token gửi vào chỗ đợi access thì null', async () => {
    const refresh: JwtPayload = { ...ACCESS, type: TOKEN_TYPE.refresh };

    await expect(
      readToken('abc', verifiesAs(refresh), TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });

  it('access token gửi vào chỗ đợi refresh thì null', async () => {
    await expect(
      readToken('abc', verifiesAs(ACCESS), TOKEN_TYPE.refresh),
    ).resolves.toBeNull();
  });

  it('đúng loại thì trả payload', async () => {
    const refresh: JwtPayload = { ...ACCESS, type: TOKEN_TYPE.refresh };

    await expect(
      readToken('abc', verifiesAs(refresh), TOKEN_TYPE.refresh),
    ).resolves.toEqual(refresh);
  });

  it('payload thiếu type thì null', async () => {
    const noType = { sub: 'admin', role: GuildRole.ADMIN } as JwtPayload;

    await expect(
      readToken('abc', verifiesAs(noType), TOKEN_TYPE.access),
    ).resolves.toBeNull();
  });
});
