import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE, type JwtPayload } from '../../constants/auth.constant';
import { readBearerToken, readToken } from '../read-bearer-token';

/** A valid access token payload shared by every case. */
const ACCESS: JwtPayload = {
  sub: 'admin',
  role: GuildRole.ADMIN,
  type: TOKEN_TYPE.access,
};

/**
 * Build a fake verify function returning a given payload.
 * @param payload - Payload verify will return
 * @returns A verify function that always succeeds
 */
function verifiesAs(payload: JwtPayload) {
  return () => Promise.resolve(payload);
}

/** Fake verify that always throws — malformed, wrong signature, or expired. */
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
    // 'Bearer ' passes startsWith; the rejection comes from verify('') throwing.
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
