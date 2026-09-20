import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildState, parseRunLog, truncateTail } from '../collect.ts';
import { MAX_LINES_PER_JOB, MAX_STATE_CHARS } from '../questions.ts';

describe('truncateTail', () => {
  it('keeps the end of the log, not the beginning', () => {
    const log = Array.from({ length: 5000 }, (_, i) => `line ${i}`).join('\n');

    const out = truncateTail(log, MAX_LINES_PER_JOB, MAX_STATE_CHARS);

    assert.ok(
      out.includes('line 4999'),
      'the last line must survive - it holds the cause',
    );
    assert.ok(!out.includes('line 0\n'), 'the head should be dropped');
    assert.ok(
      out.split('\n').length <= MAX_LINES_PER_JOB + 1,
      'line budget exceeded',
    );
    assert.ok(out.length <= MAX_STATE_CHARS + 64, 'char budget exceeded');
  });

  it('marks how many lines it dropped', () => {
    const log = Array.from({ length: 300 }, (_, i) => `line ${i}`).join('\n');

    assert.match(
      truncateTail(log, 100, 10_000),
      /^… earlier output omitted \(200 lines, \d+ characters\) …/,
    );
  });

  it('still reports the cut when only the character limit bit', () => {
    // One very long line drops no lines at all. A marker saying "0 lines" with no character
    // count would tell Jev - and a human reading --json - that nothing was removed.
    const out = truncateTail('x'.repeat(5_000), 100, 1_000);

    assert.match(
      out,
      /^… earlier output omitted \(0 lines, 4000 characters\) …/,
    );
  });

  it('returns a short log unchanged', () => {
    assert.equal(truncateTail('one\ntwo', 100, 10_000), 'one\ntwo');
  });

  it('respects the character ceiling even when the line count fits', () => {
    const log = 'x'.repeat(5_000);
    const out = truncateTail(log, 100, 1_000);

    // The budget covers the kept text; the marker line sits on top of it and is short.
    assert.ok(out.split('\n').at(-1)!.length <= 1_000);
  });
});

describe('buildState', () => {
  const job = (name: string, log: string) => ({
    name,
    conclusion: 'failure',
    log,
  });

  it('redacts before truncating, so nothing secret reaches the tail', () => {
    const noise = Array.from({ length: 1000 }, (_, i) => `step ${i}`).join(
      '\n',
    );
    const log = `${noise}\nDATABASE_URL=postgres://guild:hunter2@db/postgres\nFAILED`;

    const state = buildState([job('Backend test', log)], []);

    assert.ok(!state.logTail.includes('hunter2'));
    assert.ok(state.logTail.includes('FAILED'), 'the tail itself must survive');
  });

  it('labels each job section and carries the job list through', () => {
    const state = buildState(
      [job('Backend test', 'boom'), job('Build web', 'crash')],
      ['a.ts'],
    );

    assert.ok(state.logTail.includes('### Backend test'));
    assert.ok(state.logTail.includes('### Build web'));
    assert.deepEqual(
      state.failedJobs.map((j) => j.name),
      ['Backend test', 'Build web'],
    );
    assert.deepEqual(state.changedFiles, ['a.ts']);
  });

  it('stays inside the total character budget with many failed jobs', () => {
    const jobs = Array.from({ length: 7 }, (_, i) =>
      job(`Job ${i}`, 'y'.repeat(100_000)),
    );

    assert.ok(buildState(jobs, []).logTail.length <= MAX_STATE_CHARS);
  });

  it('keeps every job header intact when all seven CI jobs fail at once', () => {
    // The final slice trims from the front, so a budget that ignored the `### <name>` headers
    // would shear the first one and hand Jev a fragment instead of a section.
    const jobs = Array.from({ length: 7 }, (_, i) =>
      job(`Job ${i}`, 'y'.repeat(100_000)),
    );

    const { logTail } = buildState(jobs, []);

    for (let i = 0; i < 7; i += 1) {
      assert.ok(
        logTail.includes(`### Job ${i}`),
        `header ${i} was sheared off`,
      );
    }
  });
});

describe('parseRunLog', () => {
  it('groups tab-prefixed lines by job name', () => {
    const raw = [
      'Backend test\tRun tests\tFAIL attendance.service.spec.ts',
      'Backend test\tRun tests\t  Expected: true',
      'Build web\tBuild\tType error in page.tsx',
    ].join('\n');

    const jobs = parseRunLog(raw);

    assert.deepEqual(
      jobs.map((j) => j.name),
      ['Backend test', 'Build web'],
    );
    assert.ok(jobs[0]!.log.includes('Expected: true'));
    assert.ok(
      !jobs[0]!.log.includes('Backend test\t'),
      'the job prefix should be stripped',
    );
    assert.equal(jobs[1]!.conclusion, 'failure');
  });
});
