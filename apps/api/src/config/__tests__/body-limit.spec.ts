import { ANNOUNCEMENT_IMAGE_MAX_CHARS } from '@guild/shared/schemas';

import { JSON_BODY_LIMIT } from '../app.config';

/**
 * Largest request body a Vercel Function accepts. Not a value this app sets — it is the platform's,
 * and the reason `JSON_BODY_LIMIT` cannot simply be raised until everything fits.
 */
const VERCEL_BODY_LIMIT = 4.5 * 1000 * 1000;

/** The announcement carries at most one image per match, and a day is played over at most 2. */
const MAX_IMAGES = 2;

// Express mặc định chỉ nhận 100kb, nên thông báo đội hình — mang 1-2 ảnh base64 — chết ngay ở tầng
// parser, trước cả guard, và trả về 500 "Lỗi hệ thống" không nói được gì. Ba bất biến dưới đây giữ
// cho ba con số không lệch khỏi nhau lần nữa.
describe('Giới hạn body JSON', () => {
  it('đủ chỗ cho hai ảnh đúng cỡ tối đa', () => {
    expect(ANNOUNCEMENT_IMAGE_MAX_CHARS * MAX_IMAGES).toBeLessThan(
      JSON_BODY_LIMIT,
    );
  });

  // Trần của parser phải nằm trên cỡ hợp lệ lớn nhất: khi ảnh quá to, người dùng cần câu tiếng Việt
  // của schema chứ không phải một cái 500 trần trụi.
  it('nằm trên cỡ hợp lệ lớn nhất, không phải dưới', () => {
    expect(JSON_BODY_LIMIT).toBeGreaterThan(
      ANNOUNCEMENT_IMAGE_MAX_CHARS * MAX_IMAGES,
    );
  });

  it('không vượt trần body của Vercel Function', () => {
    expect(JSON_BODY_LIMIT).toBeLessThanOrEqual(VERCEL_BODY_LIMIT);
  });
});
