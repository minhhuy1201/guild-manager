import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import type { ESLint, Linter } from 'eslint';

/** Root of `apps/api` — where `eslint.config.mjs` and `tsconfig.json` live. */
const API_ROOT = join(__dirname, '..', '..');

const BOUNDARY_RULE = 'boundaries/dependencies';

/** Running ESLint takes a few seconds; Jest's 5s default is not enough. */
const LINT_TIMEOUT_MS = 60_000;

/** A deliberate violation, from one module into a sibling, one directory deeper than any real file. */
const SIBLING_MODULE_FIXTURE = join(
  API_ROOT,
  'src/modules/attendance/__tests__/fixtures/module-boundary-violation.ts',
);

/** A deliberate violation, crossing in from outside `modules/`. */
const OUTSIDE_MODULE_FIXTURE = join(
  __dirname,
  'fixtures',
  'outside-module-violation.ts',
);

/** A deliberate violation whose target sits deeper than the module root. */
const NESTED_TARGET_FIXTURE = join(
  __dirname,
  'fixtures',
  'nested-target-violation.ts',
);

/** A real file importing a sibling module through its `.public` seam. */
const COMPLIANT_FILE = join(
  API_ROOT,
  'src/modules/attendance/attendance.service.ts',
);

/**
 * Run the real ESLint over one file and return its module boundary errors.
 *
 * Run as a child process rather than through `new ESLint()`: `eslint.config.mjs` is ESM, and Jest in
 * CommonJS mode cannot use a dynamic `import()`. `--no-ignore` lints the fixtures, which the config's
 * `ignores` would otherwise skip.
 *
 * @param filePath - Absolute path of the file to lint
 * @returns The module boundary rule messages for that file
 */
function lintBoundaryErrors(filePath: string): Linter.LintMessage[] {
  const { stdout, status } = spawnSync(
    join(API_ROOT, 'node_modules', '.bin', 'eslint'),
    ['--no-ignore', '--format', 'json', filePath],
    { cwd: API_ROOT, encoding: 'utf8' },
  );

  // ESLint exits 0 when clean and 1 on lint errors; any other code means it died before linting.
  if (status !== 0 && status !== 1) {
    throw new Error(`ESLint không chạy được (exit ${String(status)})`);
  }

  const results = JSON.parse(stdout) as ESLint.LintResult[];
  const [result] = results;
  if (!result) {
    throw new Error(`ESLint không trả kết quả nào cho ${filePath}`);
  }

  return result.messages.filter((message) => message.ruleId === BOUNDARY_RULE);
}

/**
 * A module boundary fence is only worth having while it is still in force. The old rule keyed off
 * directory depth: one extra level and it silently stopped checking. The three tests below lock that
 * down — two fixtures on either side of the boundary, both deeper than any real file, plus a control
 * so the rule cannot be "right" by forbidding everything.
 */
describe('ranh giới module (eslint.config.mjs)', () => {
  jest.setTimeout(LINT_TIMEOUT_MS);

  it('báo lỗi khi một module đụng file nội bộ của module bên cạnh', () => {
    expect(lintBoundaryErrors(SIBLING_MODULE_FIXTURE)).toHaveLength(1);
  });

  it('báo lỗi khi một file ngoài modules/ đụng file nội bộ của module', () => {
    expect(lintBoundaryErrors(OUTSIDE_MODULE_FIXTURE)).toHaveLength(1);
  });

  it('báo lỗi khi file bị đụng nằm sâu hơn gốc module', () => {
    expect(lintBoundaryErrors(NESTED_TARGET_FIXTURE)).toHaveLength(1);
  });

  it('không báo lỗi khi module bên cạnh được import qua file .public', () => {
    expect(lintBoundaryErrors(COMPLIANT_FILE)).toHaveLength(0);
  });
});
