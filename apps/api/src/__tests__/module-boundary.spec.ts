import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import type { ESLint, Linter } from 'eslint';

/** Thư mục gốc của `apps/api` — nơi `eslint.config.mjs` và `tsconfig.json` nằm. */
const API_ROOT = join(__dirname, '..', '..');

const BOUNDARY_RULE = 'boundaries/dependencies';

/** Chạy ESLint tốn vài giây; mặc định 5s của Jest không đủ. */
const LINT_TIMEOUT_MS = 60_000;

/** Vi phạm cố ý, từ một module sang module bên cạnh, ở thư mục sâu hơn mọi file thật một cấp. */
const SIBLING_MODULE_FIXTURE = join(
  API_ROOT,
  'src/modules/attendance/__tests__/fixtures/module-boundary-violation.ts',
);

/** Vi phạm cố ý, từ ngoài `modules/` đi vào. */
const OUTSIDE_MODULE_FIXTURE = join(
  __dirname,
  'fixtures',
  'outside-module-violation.ts',
);

/** File thật, import module bên cạnh qua đúng seam `.public`. */
const COMPLIANT_FILE = join(
  API_ROOT,
  'src/modules/attendance/attendance.service.ts',
);

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

  const results = JSON.parse(stdout) as ESLint.LintResult[];
  const [result] = results;
  if (!result) {
    throw new Error(`ESLint không trả kết quả nào cho ${filePath}`);
  }

  return result.messages.filter((message) => message.ruleId === BOUNDARY_RULE);
}

/**
 * Hàng rào ranh giới module chỉ có giá trị khi nó còn hiệu lực. Luật cũ khoá theo độ sâu thư mục:
 * thêm một cấp là nó ngừng kiểm tra ở cấp đó mà không báo gì. Ba bài test dưới đây khoá lại điều
 * đó — hai fixture nằm ở hai phía của ranh giới, cả hai sâu hơn mọi file thật, và một đối chứng để
 * luật không thể "đúng" bằng cách cấm tất cả.
 */
describe('ranh giới module (eslint.config.mjs)', () => {
  jest.setTimeout(LINT_TIMEOUT_MS);

  it('báo lỗi khi một module đụng file nội bộ của module bên cạnh', () => {
    expect(lintBoundaryErrors(SIBLING_MODULE_FIXTURE)).toHaveLength(1);
  });

  it('báo lỗi khi một file ngoài modules/ đụng file nội bộ của module', () => {
    expect(lintBoundaryErrors(OUTSIDE_MODULE_FIXTURE)).toHaveLength(1);
  });

  it('không báo lỗi khi module bên cạnh được import qua file .public', () => {
    expect(lintBoundaryErrors(COMPLIANT_FILE)).toHaveLength(0);
  });
});
