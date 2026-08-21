import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ADMIN_ROLE, TOKEN_TYPE, type JwtPayload } from '../../../common';
import type { AppConfigService } from '../../../config';
import { AuthService } from '../auth.service';

const SECRET = 'secret-du-dai-cho-jwt-trong-test';
const PASSWORD = 'mat-khau-dung';

/** Giá trị của các biến môi trường mà AuthService đọc. */
const ENV: Record<string, string> = {
  ADMIN_USERNAMES: 'admin, Phó Hội',
  ADMIN_PASSWORD: PASSWORD,
};

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;

  beforeEach(() => {
    jwt = new JwtService({ secret: SECRET });
    const config = {
      get: (key: string) => ENV[key],
    } as unknown as AppConfigService;

    service = new AuthService(config, jwt);
  });

  describe('login', () => {
    it('trả cặp token và thông tin tài khoản khi đăng nhập đúng', async () => {
      const tokens = await service.login({
        username: 'admin',
        password: PASSWORD,
      });

      expect(tokens.user).toEqual({ username: 'admin', role: ADMIN_ROLE });

      const access = await jwt.verifyAsync<JwtPayload>(tokens.accessToken);
      const refresh = await jwt.verifyAsync<JwtPayload>(tokens.refreshToken);
      expect(access).toMatchObject({
        sub: 'admin',
        role: ADMIN_ROLE,
        type: TOKEN_TYPE.access,
      });
      expect(refresh).toMatchObject({
        sub: 'admin',
        type: TOKEN_TYPE.refresh,
      });
    });

    it('chuẩn hoá chữ thường nên tên đăng nhập khác hoa/thường vẫn vào được', async () => {
      const tokens = await service.login({
        username: '  PHÓ HỘI ',
        password: PASSWORD,
      });

      expect(tokens.user.username).toBe('phó hội');
    });

    it('dùng cùng một thông báo cho sai mật khẩu và sai tên đăng nhập', async () => {
      const wrongPassword = service.login({
        username: 'admin',
        password: 'mat-khau-sai',
      });
      const wrongUsername = service.login({
        username: 'khong-ton-tai',
        password: PASSWORD,
      });

      await expect(wrongPassword).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(wrongUsername).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(wrongPassword).rejects.toThrow(
        'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
      await expect(wrongUsername).rejects.toThrow(
        'Tên đăng nhập hoặc mật khẩu không đúng.',
      );
    });
  });

  describe('refresh', () => {
    it('đổi refresh token còn hạn lấy cặp token mới', async () => {
      const { refreshToken } = await service.login({
        username: 'admin',
        password: PASSWORD,
      });

      const tokens = await service.refresh({ refreshToken });

      expect(tokens.user).toEqual({ username: 'admin', role: ADMIN_ROLE });
      await expect(
        jwt.verifyAsync<JwtPayload>(tokens.accessToken),
      ).resolves.toMatchObject({ type: TOKEN_TYPE.access });
    });

    it('từ chối access token dùng thay refresh token', async () => {
      const { accessToken } = await service.login({
        username: 'admin',
        password: PASSWORD,
      });

      await expect(service.refresh({ refreshToken: accessToken })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('từ chối refresh token đã hết hạn', async () => {
      const expired = await jwt.signAsync(
        {
          sub: 'admin',
          role: ADMIN_ROLE,
          type: TOKEN_TYPE.refresh,
        } satisfies JwtPayload,
        { expiresIn: '-1s' },
      );

      await expect(service.refresh({ refreshToken: expired })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('từ chối tài khoản đã bị bỏ khỏi danh sách admin', async () => {
      const removed = await jwt.signAsync({
        sub: 'cuu-admin',
        role: ADMIN_ROLE,
        type: TOKEN_TYPE.refresh,
      } satisfies JwtPayload);

      await expect(service.refresh({ refreshToken: removed })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
