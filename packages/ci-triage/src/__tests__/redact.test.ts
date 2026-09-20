import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { redact } from '../redact.ts';

describe('redact', () => {
  it('removes the value of an explicitly named secret but keeps the variable name', () => {
    const out = redact('AUTH_SECRET=s3cr3t-value-that-is-long-enough-here');

    assert.ok(!out.includes('s3cr3t-value'), 'the secret value survived');
    assert.ok(
      out.includes('AUTH_SECRET'),
      'the variable name should stay readable',
    );
    assert.ok(out.includes('[redacted]'));
  });

  it('removes every secret shape from one realistic log block', () => {
    const log = [
      '2026-09-20T10:11:12.000Z ##[group]Run prisma migrate status',
      'DATABASE_URL=postgresql://guild:hunter2@db.supabase.co:5432/postgres?sslmode=require',
      'DIRECT_URL="postgres://guild:hunter2@db.supabase.co:5432/postgres"',
      'SONAR_TOKEN: sqp_9f2c4d8e1a7b3c5d6e0f1a2b3c4d5e6f7a8b9c0d',
      'VERCEL_TOKEN=abcdEFGH1234ijklMNOP5678qrstUVWX',
      'DISCORD_BOT_TOKEN=MTIzNDU2Nzg5.GaBcDe.FgHiJkLmNoPqRsTuVwXyZ012345',
      'authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      'connecting with postgres://someone:letmein@localhost:5432/guild',
    ].join('\n');

    const out = redact(log);

    for (const leak of [
      'hunter2',
      'sqp_9f2c4d8e1a7b3c5d6e0f1a2b3c4d5e6f7a8b9c0d',
      'abcdEFGH1234ijklMNOP5678qrstUVWX',
      'MTIzNDU2Nzg5.GaBcDe.FgHiJkLmNoPqRsTuVwXyZ012345',
      'dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      'letmein',
    ]) {
      assert.ok(!out.includes(leak), `leaked: ${leak}`);
    }
  });

  it('redacts a bare JWT anywhere in a line', () => {
    const out = redact(
      'token was eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9.abcDEF-123_xyz rejected',
    );

    assert.ok(!out.includes('eyJhbGciOiJIUzI1NiJ9'));
    assert.ok(out.includes('rejected'), 'surrounding words must survive');
  });

  it('leaves ordinary failure output untouched', () => {
    const log = [
      '  ● AttendanceService › marks a member present',
      '    expect(received).toBe(expected) // Object.is equality',
      '    Expected: true',
      '    Received: false',
      '      at Object.<anonymous> (src/modules/attendance/__tests__/attendance.service.spec.ts:42:31)',
      'Tests:       1 failed, 87 passed, 88 total',
      'error TS2345: Argument of type "string" is not assignable to parameter of type "number".',
    ].join('\n');

    assert.equal(redact(log), log);
  });

  it('is idempotent', () => {
    const once = redact('AUTH_SECRET=some-value-long-enough-to-matter');

    assert.equal(redact(once), once);
  });
});
