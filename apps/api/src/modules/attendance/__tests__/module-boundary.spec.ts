import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import type { ESLint, Linter } from 'eslint';

/** Thư mục gốc của `apps/api` — nơi `eslint.config.mjs` và `tsconfig.json` nằm. */
const API_ROOT = join(__dirname, '..', '..', '..', '..');

const BOUNDARY_RULE = 'boundaries/dependencies';

/** Vi phạm cố ý; `eslint.config.mjs` loại nó khỏi lượt lint thường. */
const VIOLATING_FIXTURE = join(
  __dirname,
  'fixtures',
  'module-boundary-violation.ts',
);

/** File thật, import module bên cạnh qua đúng seam `.public`. */
const COMPLIANT_FILE = join(__dirname, '..', 'attendance.service.ts');

/**
 * Chạy ESLint thật lên một file và trả về các lỗi ranh giới module.
 *
 * Chạy qua tiến trình con chứ không qua `new ESLint()`: `eslint.config.mjs` là ESM, mà Jest ở chế
 * độ CommonJS không `import()` động được. `--no-ignore` để lint cả fixture, vốn bị `ignores` của
 * cấu hình bỏ qua.
 *
 * @param filePath - Đường dẫn tuyệt đối tới file cần lint
 * @returns Danh sách message của luật ranh giới module trong file đó
 */
function lintBoundaryErrors(filePath: string): Linter.LintMessage[] {
  const { stdout, status } = spawnSync(
    join(API_ROOT, 'node_modules', '.bin', 'eslint'),
    ['--no-ignore', '--format', 'json', filePath],
    { cwd: API_ROOT, encoding: 'utf8' },
  );

  // ESLint trả 0 khi sạch, 1 khi có lỗi lint; mọi mã khác là nó chết trước khi lint được.
  if (status !== 0 && status !== 1) {
    throw new Error(`ESLint không chạy được (exit ${String(status)})`);
  }

  const [result] = JSON.parse(stdout) as ESLint.LintResult[];

  return result.messages.filter((message) => message.ruleId === BOUNDARY_RULE);
}

/**
 * Hàng rào ranh giới module chỉ có giá trị khi nó còn hiệu lực. Luật cũ khoá theo độ sâu thư mục:
 * thêm một cấp là nó ngừng kiểm tra ở cấp đó mà không báo gì. Hai bài test dưới đây khoá lại điều
 * đó — fixture nằm sâu hơn mọi file thật một cấp, ở đúng chỗ luật cũ bỏ lọt.
 */
describe('ranh giới module (eslint.config.mjs)', () => {
  jest.setTimeout(60_000);

  it('báo lỗi khi một file nội bộ của module khác bị import, kể cả ở thư mục sâu hơn', () => {
    expect(lintBoundaryErrors(VIOLATING_FIXTURE)).toHaveLength(1);
  });

  it('không báo lỗi khi module bên cạnh được import qua file .public', () => {
    expect(lintBoundaryErrors(COMPLIANT_FILE)).toHaveLength(0);
  });
});
