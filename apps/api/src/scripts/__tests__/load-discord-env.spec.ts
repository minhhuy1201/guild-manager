import {
  DEFAULT_DISCORD_ENV_FILE,
  resolveDiscordEnvFile,
} from '../load-discord-env';

/**
 * Build an `exists` probe that only knows about the given files.
 * @param present - Paths that should report as existing
 * @returns A predicate for `resolveDiscordEnvFile`
 */
function existsAmong(...present: string[]): (path: string) => boolean {
  return (path) => present.includes(path);
}

describe('resolveDiscordEnvFile', () => {
  it('mặc định đọc .env khi không ai chỉ định file', () => {
    expect(
      resolveDiscordEnvFile(undefined, existsAmong(DEFAULT_DISCORD_ENV_FILE)),
    ).toBe(DEFAULT_DISCORD_ENV_FILE);
  });

  it('đọc đúng file được chỉ định', () => {
    expect(
      resolveDiscordEnvFile('.env.production', existsAmong('.env.production')),
    ).toBe('.env.production');
  });

  it('ném lỗi nêu tên file khi file được chỉ định không tồn tại', () => {
    // Im lặng rơi về .env là cách đăng ký lệnh của production lên nhầm application dev mà không ai
    // nhận ra — đúng thứ PRISMA_ENV_FILE đã chặn cho các lệnh database.
    expect(() =>
      resolveDiscordEnvFile('.env.production', existsAmong('.env')),
    ).toThrow('.env.production');
  });

  it('không rơi về .env khi file được chỉ định thiếu, dù .env đang có', () => {
    expect(() =>
      resolveDiscordEnvFile('.env.staging', existsAmong('.env')),
    ).toThrow();
  });

  it('trả null để dùng biến môi trường có sẵn khi không có file nào', () => {
    expect(resolveDiscordEnvFile(undefined, existsAmong())).toBeNull();
  });
});
