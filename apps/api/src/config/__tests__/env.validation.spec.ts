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
  DISCORD_BANG_CHIEN_CHANNEL_ID: '111222333444555666',
  DISCORD_NGHICH_THUY_HAN_CHANNEL_ID: '222333444555666777',
  DISCORD_KHAM_ACC_CHANNEL_ID: '333444555666777888',
  DISCORD_BOT_TOKEN: 'bot-token-value',
  CRON_SECRET: 'c'.repeat(32),
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

  // The bot token used to be read only by `discord:register`, outside the app. It became a runtime
  // requirement when the bot started posting the reminder by itself.
  it('chết khi thiếu DISCORD_BOT_TOKEN', () => {
    const withoutToken: Partial<typeof base> = { ...base };
    delete withoutToken.DISCORD_BOT_TOKEN;

    expect(() => validateEnv(withoutToken)).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });

  it('chết khi thiếu CRON_SECRET', () => {
    const withoutCronSecret: Partial<typeof base> = { ...base };
    delete withoutCronSecret.CRON_SECRET;

    expect(() => validateEnv(withoutCronSecret)).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });

  it('chết khi CRON_SECRET ngắn hơn 32 ký tự', () => {
    expect(() => validateEnv({ ...base, CRON_SECRET: 'ngan' })).toThrow(
      /Biến môi trường không hợp lệ/,
    );
  });

  it('chết khi thiếu một trong ba channel id của /chao-mung', () => {
    // Thiếu biến thì lời chào sẽ trỏ vào <#undefined>. Chết lúc boot rẻ hơn nhiều.
    for (const key of [
      'DISCORD_BANG_CHIEN_CHANNEL_ID',
      'DISCORD_NGHICH_THUY_HAN_CHANNEL_ID',
      'DISCORD_KHAM_ACC_CHANNEL_ID',
    ] as const) {
      const incomplete: Partial<typeof base> = { ...base };
      delete incomplete[key];

      expect(() => validateEnv(incomplete)).toThrow(
        /Biến môi trường không hợp lệ/,
      );
    }
  });
});
