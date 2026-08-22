import { z } from 'zod';

import {
  SHOULD_VERIFY_RESPONSES,
  verifyResponse,
} from './response-verification';

const schema = z.object({ status: z.enum(['PRESENT', 'ABSENT']) });

/** Chính module này, nạp lại — cần một alias ngắn để câu `require` không bị bẻ dòng. */
type ResponseVerification = typeof import('./response-verification');

/**
 * Nạp lại module với một `NODE_ENV` khác — cờ được chốt lúc import nên đây là cách duy nhất
 * quan sát được nhánh production.
 *
 * @param nodeEnv - Giá trị `NODE_ENV` giả lập cho lần nạp này
 * @returns Module đã nạp lại
 */
function loadWithNodeEnv(nodeEnv: string): ResponseVerification {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;

  try {
    // `import` ở đầu file được hoist nên nó nạp module *trước* khi `NODE_ENV` bị đổi — đúng thứ
    // bài test này cần tránh. Nạp lại trong `isolateModules` là cách duy nhất thấy được nhánh kia;
    // `import()` động không chạy được vì Jest ở đây là CommonJS.
    let loaded!: ResponseVerification;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('./response-verification') as ResponseVerification;
    });

    return loaded;
  } finally {
    process.env.NODE_ENV = original;
  }
}

describe('verifyResponse', () => {
  it('bật ở môi trường test', () => {
    expect(SHOULD_VERIFY_RESPONSES).toBe(true);
  });

  it('trả lại giá trị hợp lệ', () => {
    expect(verifyResponse(schema, { status: 'PRESENT' as const })).toEqual({
      status: 'PRESENT',
    });
  });

  it('ném khi object không khớp contract — đây là lý do nó tồn tại', () => {
    expect(() =>
      // `as` mô phỏng đúng chỗ thủng: một giá trị enum lạ lọt qua biên dịch ở codec.
      verifyResponse(schema, { status: 'MAYBE' as 'PRESENT' }),
    ).toThrow(z.ZodError);
  });

  it('không parse ở production — giá trị đi qua nguyên vẹn', () => {
    const production = loadWithNodeEnv('production');

    expect(production.SHOULD_VERIFY_RESPONSES).toBe(false);
    expect(
      // Cùng giá trị lạ như trên, lần này phải chảy qua không một tiếng động.
      production.verifyResponse(schema, { status: 'MAYBE' as 'PRESENT' }),
    ).toEqual({ status: 'MAYBE' });
  });
});
