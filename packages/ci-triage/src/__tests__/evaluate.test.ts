import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MalformedAnswerError,
  ZDR_ENV_VAR,
  assertAnswerShape,
  buildGatewayOptions,
} from '../evaluate.ts';

describe('buildGatewayOptions', () => {
  it('always pins the provider, on every plan', () => {
    assert.deepEqual(buildGatewayOptions({}).only, ['typesafe-ai']);
  });

  it('leaves zero data retention out by default', () => {
    assert.ok(!('zeroDataRetention' in buildGatewayOptions({})));
  });

  it('opts in on "1" or "true", case-insensitively', () => {
    for (const value of ['1', 'true', 'TRUE']) {
      assert.equal(
        buildGatewayOptions({ [ZDR_ENV_VAR]: value }).zeroDataRetention,
        true,
        `not enabled for ${value}`,
      );
    }
  });

  it('stays out for anything else, including an empty or accidental value', () => {
    for (const value of ['', '0', 'false', 'yes']) {
      assert.ok(
        !('zeroDataRetention' in buildGatewayOptions({ [ZDR_ENV_VAR]: value })),
        `wrongly enabled for "${value}"`,
      );
    }
  });
});

describe('assertAnswerShape', () => {
  const valid = {
    category: { type: 'choice', choice: 'flaky' },
    ownerApp: { type: 'choice', choice: 'api' },
    rerunLikelyGreen: { type: 'boolean', probability: 0.5 },
    blastRadius: { type: 'score', score: 1 },
  };

  it('accepts the four answers the tool asks for', () => {
    assert.doesNotThrow(() => assertAnswerShape(valid));
  });

  it('names the question that is missing', () => {
    const withoutBlastRadius = { ...valid, blastRadius: undefined };

    assert.throws(() => assertAnswerShape(withoutBlastRadius), /blastRadius/);
  });

  it('rejects an answer of the wrong kind', () => {
    const wrong = { ...valid, category: { type: 'boolean', probability: 1 } };

    assert.throws(() => assertAnswerShape(wrong), /category/);
  });

  it('rejects a response that is not an object at all', () => {
    for (const value of [null, undefined, 'answers', 42]) {
      assert.throws(() => assertAnswerShape(value), MalformedAnswerError);
    }
  });
});
