# SonarQube Cloud — cổng chất lượng code thứ chín — Implementation Plan

**Goal:** một required check mới tên `SonarQube` trong `ci.yml`, chạy SonarQube Cloud (free plan) với
coverage của cả `apps/api` và `apps/web`, đỏ khi quality gate đỏ.

**Architecture:** một job trong `.github/workflows/ci.yml` (chất lượng code ở cùng chỗ với lint và
test), cấu hình phân tích trong `sonar-project.properties` ở root, coverage sinh ra bởi script
`test:cov` của từng app. Không code sản phẩm nào đổi.

**Spec:** [`docs/custom-spec/2026-09-17-sonarqube-cloud-gate-design.md`](../custom-spec/2026-09-17-sonarqube-cloud-gate-design.md)

## Bốn điểm phải làm đúng

1. **`fetch-depth: 0` ở bước checkout của job Sonar.** Shallow clone không có lịch sử git, Sonar
   không xác định được code nào là "mới" → mọi điều kiện "on New Code" của quality gate tính sai.
   Các job khác trong `ci.yml` không cần, chỉ job này cần.
2. **Đường dẫn lcov phải đúng tuyệt đối theo cấu hình hiện có.** Jest của `apps/api` đặt
   `rootDir: "src"` và `coverageDirectory: "../coverage"` → file nằm ở `apps/api/coverage/lcov.info`,
   **không** phải `coverage/lcov.info`. Sai đường dẫn không làm scanner đỏ, nó chỉ âm thầm báo 0%
   coverage — đúng cái kiểu hỏng khó phát hiện nhất.
3. **`sonar.tests` và `sonar.sources` phải tách nhau bằng `sonar.test.inclusions` *và*
   `sonar.exclusions`,** nếu không scanner từ chối chạy vì một file vừa là source vừa là test.
   `sonar.exclusions` chỉ lọc tập file main, nó không đụng tập test, nên hai pattern
   `**/*.spec.ts` và `**/__tests__/**` phải xuất hiện ở cả hai key.
4. **Automatic Analysis phải tắt trong Sonar UI trước khi job chạy lần đầu**, nếu không scanner fail
   với thông báo không nói ra nguyên nhân thật.

## Global Constraints

- Không đụng code sản phẩm: `apps/api/src`, `apps/web/features|app|components`, `packages/shared`.
- Không thêm workflow file mới. Không thêm biến môi trường runtime.
- Comment trong YAML và file cấu hình: tiếng Anh hay tiếng Việt đều theo file đang có —
  `ci.yml` đang dùng tiếng Việt, giữ tiếng Việt; `sonar-project.properties` là file mới, dùng tiếng
  Anh theo quy tắc gốc.
- `SONAR_TOKEN` là secret; không giá trị thật nào vào git.
- Nhánh: `claude/eager-knuth-dzdu4i`.
- Lệnh kiểm tại chỗ: `pnpm --filter api test:cov`, `pnpm --filter web test:cov`, và xác nhận hai file
  lcov tồn tại đúng đường dẫn ghi trong `sonar-project.properties`.

---

### Task 1: Coverage cho `apps/api`

**Files:** `apps/api/package.json`

- [x] Thêm `"coverageReporters": ["lcov", "text-summary"]` vào block `jest`. Mặc định của Jest không
      có `lcov`, nên `test:cov` hiện tại không sinh ra thứ Sonar đọc được.
- [x] Thêm `"**/*.spec.ts"` và `"main.ts"` vào `coveragePathIgnorePatterns`: file test tự tính vào
      coverage của chính nó làm số liệu vô nghĩa, còn `main.ts` chỉ là bootstrap.
- [x] `"/node_modules/"` phải nằm lại trong `coveragePathIgnorePatterns`: khai báo khoá này ghi đè
      mặc định của Jest chứ không cộng thêm.
- [x] `pretest:cov` build `@guild/shared`. `pretest` chỉ chạy trước `test`, không chạy trước
      `test:cov` — thiếu nó thì coverage đo trên một bản `dist` cũ.
- [x] Chạy `pnpm --filter api test:cov`, xác nhận `apps/api/coverage/lcov.info` tồn tại và khác rỗng.

### Task 2: Coverage cho `apps/web`

**Files:** `apps/web/package.json`, `apps/web/vitest.config.ts`

- [x] devDependency `@vitest/coverage-v8` (provider của Vitest tách rời, không có sẵn).
- [x] Script `"test:cov": "vitest run --coverage"` cùng `pretest:cov` build `@guild/shared`, như bên api.
- [x] Block `coverage` trong `vitest.config.ts`: `provider: "v8"`, `reporter: ["lcov",
      "text-summary"]`, `include` liệt kê đúng các thư mục nguồn (`app`, `components`, `config`,
      `features`, `hooks`, `lib`, `proxy.ts`), `exclude` bỏ `__tests__` và các file khai báo kiểu.
- [x] Chạy `pnpm --filter web test:cov`, xác nhận `apps/web/coverage/lcov.info` tồn tại.
- [x] `coverage/` đã nằm trong `.gitignore` chưa — nếu chưa thì thêm.
- [x] Thêm `coverage/**` vào `globalIgnores` của `apps/web/eslint.config.mjs`: reporter `lcov`
      sinh kèm một báo cáo HTML, và script trong đó có `eslint-disable` làm `pnpm lint` kêu
      warning sau mỗi lần chạy `test:cov` ở máy local.

### Task 3: `sonar-project.properties`

**Files:** `sonar-project.properties` (mới)

- [x] `sonar.organization` + `sonar.projectKey` theo giá trị Sonar cấp khi import repo.
- [x] `sonar.sources` = `apps/api/src,apps/web,packages/shared`; `sonar.tests` cùng danh sách, cộng
      `sonar.test.inclusions` cho `**/*.spec.ts`, `**/__tests__/**` (điểm 3).
- [x] `sonar.exclusions` (gồm cả hai pattern test của điểm 3): `**/node_modules/**`, `**/dist/**`,
      `**/.next/**`, `**/coverage/**`,
      `apps/api/prisma/migrations/**`, `apps/web/public/**`, `apps/web/*.config.*` — có phạm vi
      thư mục chứ không phải `**/*.config.*`, vì dạng rộng nuốt luôn `apps/api/src/config/app.config.ts`,
      là code sản phẩm.
- [x] `sonar.javascript.lcov.reportPaths` = `apps/api/coverage/lcov.info,apps/web/coverage/lcov.info`
      (điểm 2).
- [x] Comment ở đầu file nói vì sao cấu hình ở đây chứ không ở `args:` trong workflow.

### Task 4: Job `SonarQube` trong CI

**Files:** `.github/workflows/ci.yml`

- [x] Job `sonarqube`, `name: SonarQube`, `needs: [changes]`, chạy khi `api` hoặc `web` đổi.
- [x] `actions/checkout@v7` với `fetch-depth: 0` (điểm 1), rồi `./.github/actions/setup-workspace`.
- [x] Bước kiểm `secrets.SONAR_TOKEN` rỗng → `::error::` chỉ rõ phải thêm secret ở đâu, `exit 1`.
      Cùng khuôn với bước kiểm `DIRECT_DATABASE_URL` của job `migrate`.
- [x] Hai bước chạy `test:cov` cho api và web.
- [x] `SonarSource/sonarqube-scan-action@v8.2.2` với `args: -Dsonar.qualitygate.wait=true`, env
      `SONAR_TOKEN`. Không đặt `SONAR_HOST_URL` — biến đó chỉ dành cho SonarQube Server tự host.
- [x] **Không** thêm `sonarqube` vào `needs` của `migrate`, `deploy-api`, `deploy-web` (spec §3).
- [x] Comment giải thích: vì sao chạy lại test thay vì dùng artifact, vì sao `fetch-depth: 0`, vì sao
      không chặn deploy.

### Task 5: Tài liệu

**Files:** `docs/production.md`, `CLAUDE.md`, `README.md`, `.github/dependabot.yml`

- [x] `docs/production.md` §6: bảng ruleset `8` → `9` check; thêm dòng SonarQube vào bảng "Automated
      dependency and security checks"; một mục mới ghi các bước làm tay trong Sonar UI và cái bẫy
      Automatic Analysis.
- [x] `CLAUDE.md` và `README.md`: "eight" → "nine".
- [x] Kiểm `.github/dependabot.yml` đã theo dõi `github-actions` chưa — nếu rồi thì action Sonar tự
      được bump, không cần sửa gì.

### Task 6: Kiểm

- [x] `pnpm --filter api test:cov` · `pnpm --filter web test:cov` xanh, hai file lcov đúng đường dẫn.
- [x] `pnpm --filter web lint` · `typecheck` xanh (đụng `vitest.config.ts`).
- [x] YAML của `ci.yml` parse được.

## Ảnh hưởng contract

Không có.

## Sau khi merge — việc phải làm tay

Theo thứ tự trong spec §"Việc phải làm tay": tạo org free plan → import project → **tắt Automatic
Analysis** → tạo `SONAR_TOKEN` → đặt New Code definition → chờ job xanh lần đầu → mới thêm `SonarQube`
vào required status checks. Đặt required check trước khi job từng xanh là tự khoá mọi PR.
