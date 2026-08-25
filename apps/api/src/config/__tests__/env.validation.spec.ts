import { validateEnv } from '../env.validation';

/** Minimal set of environment variables for validateEnv to pass. */
const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/guild',
  AUTH_SECRET: 'x'.repeat(32),
  DISCORD_CLIENT_ID: '1234567890',
  DISCORD_CLIENT_SECRET: 'secret',
  DISCORD_REDIRECT_URI: 'http://localhost:3001/api/auth/discord/callback',
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
});
