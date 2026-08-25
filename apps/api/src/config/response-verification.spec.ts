import { z } from 'zod';

import {
  SHOULD_VERIFY_RESPONSES,
  verifyResponse,
} from './response-verification';

const schema = z.object({ status: z.enum(['PRESENT', 'ABSENT']) });

/** This module, reloaded — a short alias keeps the `require` call on one line. */
type ResponseVerification = typeof import('./response-verification');

/**
 * Reload the module under a different `NODE_ENV` — the flag is fixed at import time, so this is
 * the only way to observe the production branch.
 *
 * @param nodeEnv - `NODE_ENV` value to simulate for this load
 * @returns The reloaded module
 */
function loadWithNodeEnv(nodeEnv: string): ResponseVerification {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;

  try {
    // The top-of-file `import` is hoisted, so it loads the module *before* `NODE_ENV` changes —
    // exactly what this test must avoid. Reloading inside `isolateModules` is the only way to see
    // the other branch; a dynamic `import()` will not work because Jest runs CommonJS here.
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
      // The `as` reproduces the actual hole: an unknown enum value passing compilation in a codec.
      verifyResponse(schema, { status: 'MAYBE' as 'PRESENT' }),
    ).toThrow(z.ZodError);
  });

  it('không parse ở production — giá trị đi qua nguyên vẹn', () => {
    const production = loadWithNodeEnv('production');

    expect(production.SHOULD_VERIFY_RESPONSES).toBe(false);
    expect(
      // Same unknown value as above, this time it must flow through silently.
      production.verifyResponse(schema, { status: 'MAYBE' as 'PRESENT' }),
    ).toEqual({ status: 'MAYBE' });
  });
});
