import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import { createCorsOptions } from './cors';

const WEB_ORIGIN = 'https://guild-manager-web.vercel.app';
const PREVIEW_PROJECT = 'guild-manager-web';

type OriginChecker = (
  origin: string | undefined,
  callback: (error: Error | null, allowed?: boolean) => void,
) => void;

/** Call the CorsOptions origin callback and reduce the result to a boolean. */
function isAllowed(options: CorsOptions, origin: string | undefined): boolean {
  let allowed = false;

  (options.origin as OriginChecker)(origin, (error, result) => {
    allowed = !error && result === true;
  });

  return allowed;
}

describe('createCorsOptions', () => {
  const options = createCorsOptions(WEB_ORIGIN, PREVIEW_PROJECT);

  it('cho phép origin production', () => {
    expect(isAllowed(options, WEB_ORIGIN)).toBe(true);
  });

  it('cho phép request không có header Origin (curl, same-origin)', () => {
    expect(isAllowed(options, undefined)).toBe(true);
  });

  it('cho phép domain preview của đúng project web', () => {
    expect(
      isAllowed(options, 'https://guild-manager-web-abc123-huy.vercel.app'),
    ).toBe(true);
    expect(
      isAllowed(options, 'https://guild-manager-web-git-main-huy.vercel.app'),
    ).toBe(true);
  });

  it('chặn project khác trên vercel.app', () => {
    expect(isAllowed(options, 'https://ke-tan-cong-xyz.vercel.app')).toBe(
      false,
    );
  });

  it('chặn domain chỉ mượn tên project làm tiền tố của domain khác', () => {
    expect(
      isAllowed(options, 'https://guild-manager-web-abc.ke-tan-cong.com'),
    ).toBe(false);
  });

  it('chặn subdomain lồng dưới domain preview', () => {
    expect(
      isAllowed(options, 'https://guild-manager-web-abc.evil.vercel.app'),
    ).toBe(false);
  });

  it('chặn http khi production là https', () => {
    expect(isAllowed(options, 'http://guild-manager-web-abc.vercel.app')).toBe(
      false,
    );
  });

  it('không nhận domain preview nào khi bỏ trống WEB_PREVIEW_PROJECT', () => {
    const strict = createCorsOptions(WEB_ORIGIN);

    expect(isAllowed(strict, WEB_ORIGIN)).toBe(true);
    expect(
      isAllowed(strict, 'https://guild-manager-web-abc123-huy.vercel.app'),
    ).toBe(false);
  });
});
