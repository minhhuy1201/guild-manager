import { ANNOUNCEMENT_IMAGE_MAX_CHARS } from '@guild/shared/schemas';

import { JSON_BODY_LIMIT } from '../app.config';

/**
 * Largest request body a Vercel Function accepts. Not a value this app sets — it is the platform's,
 * and the reason `JSON_BODY_LIMIT` cannot simply be raised until everything fits.
 */
const VERCEL_BODY_LIMIT = 4.5 * 1000 * 1000;

/** The announcement carries at most one image per match, and a day is played over at most 2. */
const MAX_IMAGES = 2;

// Express accepts only 100kb by default, so a formation announcement - carrying one or two base64
// images - died in the parser, before any guard, and came back as a 500 "Lỗi hệ thống" that said
// nothing. The three invariants below keep the three numbers from drifting apart again.
describe('Giới hạn body JSON', () => {
  it('đủ chỗ cho hai ảnh đúng cỡ tối đa', () => {
    expect(ANNOUNCEMENT_IMAGE_MAX_CHARS * MAX_IMAGES).toBeLessThan(
      JSON_BODY_LIMIT,
    );
  });

  // The parser's ceiling has to sit above the largest valid payload: when an image is too big, the
  // user needs the schema's Vietnamese sentence, not a bare 500.
  it('nằm trên cỡ hợp lệ lớn nhất, không phải dưới', () => {
    expect(JSON_BODY_LIMIT).toBeGreaterThan(
      ANNOUNCEMENT_IMAGE_MAX_CHARS * MAX_IMAGES,
    );
  });

  it('không vượt trần body của Vercel Function', () => {
    expect(JSON_BODY_LIMIT).toBeLessThanOrEqual(VERCEL_BODY_LIMIT);
  });
});
