import { SLOTS_PER_TEAM, TEAM_COUNT } from '@guild/shared/lib';
import {
  ANNOUNCEMENT_IMAGE_MAX_CHARS,
  MAX_NOTICES,
  NOTICE_CHARACTER_ID_MAX_CHARS,
  TEAM_IMAGE_MAX_CHARS,
} from '@guild/shared/schemas';

import { JSON_BODY_LIMIT } from '../app.config';

/**
 * Largest request body a Vercel Function accepts. Not a value this app sets — it is the platform's,
 * and the reason `JSON_BODY_LIMIT` cannot simply be raised until everything fits.
 */
const VERCEL_BODY_LIMIT = 4.5 * 1000 * 1000;

/** A day is played over at most 2 matches, so at most 2 announcement images and 2 matches of notices. */
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

/** JSON around one notice besides its id: `{"characterId":"","matchIndex":1},`. */
const NOTICE_OVERHEAD_CHARS = 40;

/** JSON around one team image besides its data URL: keys, quotes and the pair numbers. */
const TEAM_IMAGE_OVERHEAD_CHARS = 60;

describe('Giới hạn body của notify-members', () => {
  const imageCount = TEAM_COUNT * MAX_IMAGES;
  const largestBody =
    imageCount * (TEAM_IMAGE_MAX_CHARS + TEAM_IMAGE_OVERHEAD_CHARS) +
    MAX_NOTICES * (NOTICE_CHARACTER_ID_MAX_CHARS + NOTICE_OVERHEAD_CHARS);

  it('mỗi vị trí của mỗi trận có đúng một notice, không hơn', () => {
    expect(MAX_NOTICES).toBe(TEAM_COUNT * SLOTS_PER_TEAM * MAX_IMAGES);
  });

  // Same reasoning as the announcement: past the parser's ceiling the admin gets a bare 500
  // instead of the schema's sentence.
  it('body hợp lệ lớn nhất (mọi ảnh team đúng cỡ tối đa cùng mọi notice) nằm dưới JSON_BODY_LIMIT', () => {
    expect(largestBody).toBeLessThan(JSON_BODY_LIMIT);
  });

  it('còn dư ít nhất 5% để không sát trần', () => {
    expect(largestBody).toBeLessThan(JSON_BODY_LIMIT * 0.95);
  });
});
