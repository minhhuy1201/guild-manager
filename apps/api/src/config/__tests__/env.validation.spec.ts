import { validateEnv } from '../env.validation';

/** Minimal set of environment variables for validateEnv to pass. */
const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/guild',
  AUTH_SECRET: 'x'.repeat(32),
  DISCORD_CLIENT_ID: '1234567890',
  DISCORD_CLIENT_SECRET: 'secret',
  DISCORD_REDIRECT_URI: 'http://localhost:3001/api/auth/discord/callback',
  DISCORD_PUBLIC_KEY: 'a'.repeat(64),
  DISCORD_GUILD_ROLE_ID: '999888777666555444',
};

describe('validateEnv', () => {
  it('nhận cấu hình Discord hợp lệ và mặc định DISCORD_ADMIN_IDS rỗng', () => {
    const env = validateEnv(base);

    expect(env.DISCORD_CLIENT_ID).toBe('1234567890');
    expect(env.DISCORD_ADMIN_IDS).toBe('');
  });

  it('chết ngay khi thiếu DISCORD_CLIENT_SECRET', () => {
    const withoutSecret: Partial<typeof base> = { ...base };
    delete withoutSecret.DISCORD_CLIENT_SECRET;

    expect(() => validateEnv(withoutSecret)).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });

  it('chết khi DISCORD_PUBLIC_KEY không phải 64 ký tự hex', () => {
    expect(() =>
      validateEnv({ ...base, DISCORD_PUBLIC_KEY: 'khoá-sai' }),
    ).toThrow(/Biến môi trường không hợp lệ/);
  });

  it('chết khi thiếu hẳn DISCORD_PUBLIC_KEY', () => {
    const withoutKey: Partial<typeof base> = { ...base };
    delete withoutKey.DISCORD_PUBLIC_KEY;

    expect(() => validateEnv(withoutKey)).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });

  it('chết khi thiếu DISCORD_GUILD_ROLE_ID', () => {
    const withoutRole: Partial<typeof base> = { ...base };
    delete withoutRole.DISCORD_GUILD_ROLE_ID;

    expect(() => validateEnv(withoutRole)).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });
});
