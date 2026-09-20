import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ZDR_ENV_VAR, buildGatewayOptions } from '../evaluate.ts';

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
