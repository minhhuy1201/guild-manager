import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TriageResult } from '../evaluate.ts';
import { renderHuman, renderJson, type TriageReport } from '../render.ts';

/**
 * Builds a report with one dial - the probability of the chosen category - so each test varies
 * only the thing it is about.
 */
function report(categoryProbability: number): TriageReport {
  // The remainder is split unevenly so `flaky` stays the top label even at a low probability -
  // an even split would make some other label the winner, which Jev would never return.
  const rest = 1 - categoryProbability;
  const result = {
    answers: {
      category: {
        type: 'choice',
        choice: 'flaky',
        probabilities: {
          flaky: categoryProbability,
          infra: rest * 0.4,
          real_regression: rest * 0.35,
          lint_format: rest * 0.25,
        },
      },
      ownerApp: {
        type: 'choice',
        choice: 'api',
        probabilities: { api: 0.91, web: 0.09 },
      },
      rerunLikelyGreen: { type: 'boolean', probability: 0.74 },
      blastRadius: { type: 'score', score: 1.2, probabilities: { '1': 0.8 } },
    },
    inputTokens: 9812,
    cost: '0.00041',
  } as unknown as TriageResult;

  return {
    runId: 1234567890,
    branch: 'feat/jev-ci-triage',
    failedJobs: ['Backend test'],
    result,
  };
}

describe('renderHuman', () => {
  it('prints the label with a suggestion when the model is confident', () => {
    const out = renderHuman(report(0.9));

    assert.match(out, /Loại lỗi\s+flaky \(0\.90\)/);
    assert.match(out, /Gợi ý/);
  });

  it('marks a middling answer as uncertain and withholds the suggestion', () => {
    const out = renderHuman(report(0.55));

    assert.match(out, /flaky \(0\.55\) — không chắc/);
    assert.ok(
      !out.includes('Gợi ý'),
      'no action should be suggested below the confidence bar',
    );
  });

  it('refuses to name a label at all when the distribution is flat', () => {
    const out = renderHuman(report(0.3));

    assert.match(out, /không kết luận được — flaky \(0\.30\), infra \(0\.28\)/);
    assert.ok(!out.includes('Gợi ý'));
  });

  it('always shows a probability beside every label', () => {
    const out = renderHuman(report(0.9));

    for (const line of out.split('\n')) {
      if (line.includes('Loại lỗi') || line.includes('Nửa hỏng')) {
        assert.match(line, /\(\d\.\d\d\)/, `label printed bare: ${line}`);
      }
    }
  });

  it('reports usage and cost', () => {
    assert.match(renderHuman(report(0.9)), /\$0\.000410 · 9812 input token/);
  });
});

describe('renderJson', () => {
  it('parses back with every key CI and Claude Code read', () => {
    const parsed = JSON.parse(renderJson(report(0.9))) as Record<
      string,
      unknown
    >;

    assert.deepEqual(Object.keys(parsed).sort(), [
      'answers',
      'branch',
      'cost',
      'failedJobs',
      'runId',
      'usage',
    ]);
    assert.equal(parsed['runId'], 1234567890);
  });

  it('passes the SDK answer shape through unchanged', () => {
    const parsed = JSON.parse(renderJson(report(0.9))) as {
      answers: { category: { type: string; choice: string } };
    };

    assert.equal(parsed.answers.category.type, 'choice');
    assert.equal(parsed.answers.category.choice, 'flaky');
  });
});
