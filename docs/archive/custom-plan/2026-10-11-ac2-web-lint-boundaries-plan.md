# AC2 - Khoá luật web bằng ESLint - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task (inline, theo `CLAUDE.md` project). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pnpm --filter web lint` báo lỗi cho ba luật web (boundaries giữa feature, `fetch` chỉ ở
`lib/api-client.ts`, `@tanstack/react-query` chỉ ở vị trí cho phép), và một test vitest giữ cho rule
không tắt im lặng.

**Architecture:** Thêm ba nhóm block vào `apps/web/eslint.config.mjs`, mỗi nhóm một function giống
`apps/api/eslint.config.mjs`. Fixture vi phạm nằm trong `__lint_fixtures__/`, bị global ignore, và
`__tests__/lint-rules.test.ts` lint riêng chúng bằng ESLint thật (`--no-ignore`). Doc sửa theo D1
và D4.

**Tech Stack:** ESLint 9 flat config, `eslint-plugin-boundaries` 7.2.0, `eslint-import-resolver-typescript`
3.10.1, `@typescript-eslint/no-restricted-imports`, Vitest 5.

**Spec:** [`docs/custom-spec/2026-10-10-ac2-web-lint-boundaries-design.md`](../custom-spec/2026-10-10-ac2-web-lint-boundaries-design.md)
(tổng quan: [`2026-10-10-agent-context-review-overview.md`](../../custom-spec/2026-10-10-agent-context-review-overview.md))

## Global Constraints

- Branch `chore/web-lint-boundaries`, tạo từ `main` mới nhất. Một PR, dưới 900 dòng thay đổi.
- `eslint-plugin-boundaries` `^7.2.0`, cùng version với `apps/api/package.json:72`.
- Không sửa file nguồn nào ngoài config, test, fixture và doc (spec §5).
- Không đổi CI workflow. `quality-web` đã chạy `pnpm --filter web lint`, `frontend-test` chạy vitest.
- Mọi lệnh chạy dạng `pnpm --filter web …` từ root repo. Không thêm gì vào `package.json` ở root.
- Code, comment, message lint: tiếng Anh. Tên `describe`/`it` trong test: tiếng Việt, như
  `apps/api/src/__tests__/module-boundary.spec.ts` và `apps/web/__tests__/eslint-pin.test.ts`.
- Message lint, copy nguyên văn từ spec:
  - Boundaries: `Import another feature through its entry point: index.ts (client-safe), server.ts (server-only) or core/index.ts (Edge). Do not reach into its internal files.`
  - Fetch: `Call the backend through apiFetch in lib/api-client.ts, wrapped by the feature's api/ function.`
  - React Query: `Components call the feature's hook; only features/*/hooks and features/*/api talk to TanStack Query.`

> **Ghi chú sau khi implement:** code mẫu trong Task 2 lệch config thật ở bốn chỗ (không dùng resolver
> riêng; element `app` neo bằng `partialMatch: false`; pattern `!(core)/**/*`; ngoại lệ D2 chọn bằng
> `path` + `fileInternalPath`). Bộ test thật có 14 case và 8 fixture, không phải 13 case và 7 fixture
> như các con số trong Task 1 (`7 đỏ, 6 xanh`) và Task 3 (`13/13`). Hai case thêm là "file nằm trực
> tiếp trong `core/` ngoài `index.ts`" và "file ở gốc web (`proxy.ts`) đụng file nội bộ của feature";
> fixture thêm là `auth-core-file.ts`. `apps/web/eslint.config.mjs`,
> `apps/web/__tests__/lint-rules.test.ts` và spec §4.1 là bản đúng. Lý do nằm trong spec.
>
> `eslint-import-resolver-typescript` cũng không được thêm (mục 1 bên dưới). Mọi chỗ trong plan nhắc
> tới nó là bản dự kiến đã lỗi thời: Tech Stack, Task 2 Step 1, Task 5 Step 4 và Task 6 Step 3.

## Bổ sung so với spec (đã kiểm chứng lúc viết plan, 2026-10-11)

Ba điểm spec chưa ghi. Task 5 cập nhật spec cho khớp.

1. **(Đã bị bác bỏ lúc implement)** Plan đoán phải thêm `eslint-import-resolver-typescript` làm devDependency.
   Mutation check cho thấy gỡ cả setting lẫn link package mà 12/12 case vẫn đúng: boundaries dùng lại
   `import/resolver` của `eslint-config-next`. Không thêm dependency này.
2. **Fixture phải bị loại khỏi coverage và Sonar.** `vitest.config.ts` đo coverage cho
   `components/**` và `features/**`; `sonar-project.properties` có `sonar.sources=…,apps/web,…` và chỉ
   loại `**/__tests__/**`. Fixture không bao giờ chạy, nên sẽ thành code mới 0% coverage và có thể làm
   rớt quality gate SonarQube (check bắt buộc thứ chín). Thêm `**/__lint_fixtures__/**` vào cả hai.
3. **Luật D1 còn ở ba chỗ spec §4.5 chưa liệt kê:** `docs/architecture.md:404`, `:441-443` và
   `apps/web/docs/frontend.md:56`, `:238`. `architecture.md` thắng khi hai doc lệch nhau
   (`apps/web/CLAUDE.md:10-11`), nên phải sửa cả đó.

Thêm một điểm về boundaries 7.2.0: policy chạy theo **last-write-wins**
(`eslint-plugin-boundaries/dist/Rules/Dependencies.js:379`: "the last rule that produces a match
determines the outcome"). Vì vậy policy `allow` của ngoại lệ D2 phải đứng **sau** policy `disallow`.

## Review Focus

Những điều kiện spec ngụ ý nhưng chưa test nào bắt. Reviewer đọc kỹ các điểm này.

1. **Ngoại lệ D2 rộng quá.** `lib/cache-graph.ts` chỉ được import `features/*/api/*-keys.ts`. Nếu
   selector `filePath` hoặc `fileInternalPath` của policy allow viết sai thành glob rộng, cache-graph
   import được `api/*-api.ts` mà không ai biết. Không có fixture cho chiều này, vì fixture phải nằm
   đúng path `lib/cache-graph.ts`. Reviewer đọc lại selector. Task 3 Step 5 thử tay một lần.
2. **File ở root web không được phân loại.** Element `app` chỉ khai các thư mục và `proxy.ts`. Một
   file root mới (ví dụ `instrumentation.ts`) import file nội bộ của feature sẽ lọt qua im lặng, vì
   boundaries bỏ qua dependency có một đầu không phân loại được. Ghi trong comment của config.
3. **`import type` vẫn bị boundaries chặn.** Đó là hành vi mong muốn: type nội bộ của feature cũng là
   chi tiết nội bộ. Hôm nay không có chỗ nào vi phạm (`pnpm lint` xanh là bằng chứng).
4. **Import cùng feature bằng alias `@/features/<same>/…`** phải vẫn hợp lệ. Boundaries bỏ qua
   dependency cùng element. `pnpm --filter web lint` xanh trên code thật là bằng chứng.
5. **`window.fetch` và `globalThis.fetch`.** Spec chỉ có fixture cho `fetch` trần. Task 1 thêm một
   fixture cho hai dạng property này.

---

### Task 0: Branch và số đo nền

**Files:** không có.

- [ ] **Step 1: Tạo branch**

```bash
git switch main && git pull --ff-only
git rev-parse --abbrev-ref HEAD   # phải in: main
git switch -c chore/web-lint-boundaries
```

- [ ] **Step 2: Đo thời gian lint trước khi đổi**

```bash
time pnpm --filter web lint
```

Ghi số `total` lại để đưa vào PR body. Lúc viết plan đo được khoảng 5,9 s.

---

### Task 1: Test và fixture (đỏ)

**Files:**
- Create: `apps/web/__tests__/lint-rules.test.ts`
- Create: `apps/web/features/attendance/__lint_fixtures__/cross-feature-internal.ts`
- Create: `apps/web/features/attendance/__lint_fixtures__/nested-target.ts`
- Create: `apps/web/features/attendance/__lint_fixtures__/auth-core-nested.ts`
- Create: `apps/web/features/attendance/__lint_fixtures__/component-use-query.tsx`
- Create: `apps/web/components/__lint_fixtures__/component-feature-internal.ts`
- Create: `apps/web/components/__lint_fixtures__/component-fetch.ts`
- Create: `apps/web/components/__lint_fixtures__/component-fetch-property.ts`
- Modify: `apps/web/eslint.config.mjs` (chỉ thêm `LINT_FIXTURES` vào global ignore)

**Interfaces:**
- Produces: hằng `LINT_FIXTURES` trong `eslint.config.mjs` (mảng path tương đối từ `apps/web`).
  Task 2-3 thêm rule vào cùng file.

Fixture nằm ngoài vùng miễn D5 (`**/__tests__/**`, `**/*.test.{ts,tsx}`), nhưng vẫn trong
`features/*` hoặc `components/`, nên boundaries phân loại được. Mỗi fixture export một giá trị, để
`tsc --noEmit` không báo import thừa và typecheck vẫn xanh. Mọi đích import là file có thật hôm nay.

- [ ] **Step 1: Viết bảy fixture**

`apps/web/features/attendance/__lint_fixtures__/cross-feature-internal.ts`:

```ts
// Lint fixture for __tests__/lint-rules.test.ts: one feature reaching into another feature's
// internal file. Never imported by app code.
import { isLastAdmin } from "@/features/members/lib/last-admin";

export const fixture = isLastAdmin;
```

`apps/web/features/attendance/__lint_fixtures__/nested-target.ts`:

```ts
// Lint fixture for __tests__/lint-rules.test.ts: the target sits two directories below its feature
// root, deeper than any single-level extglob reaches. Never imported by app code.
import { renderFormationHook } from "@/features/team-builder/hooks/__tests__/render-formation-hook";

export const fixture = renderFormationHook;
```

`apps/web/features/attendance/__lint_fixtures__/auth-core-nested.ts`:

```ts
// Lint fixture for __tests__/lint-rules.test.ts: core/index.ts is an entry point, but a file nested
// below core/ is not. Never imported by app code.
import { toBase64Url } from "@/features/auth/core/__tests__/sign-token";

export const fixture = toBase64Url;
```

`apps/web/features/attendance/__lint_fixtures__/component-use-query.tsx`:

```tsx
// Lint fixture for __tests__/lint-rules.test.ts: a feature component calling TanStack Query
// directly. The type-only import must stay allowed. Never imported by app code.
import type { QueryKey } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

const FIXTURE_KEY: QueryKey = ["lint-fixture"];

export function useFixture() {
  return useQuery({ queryKey: FIXTURE_KEY, queryFn: () => 1 });
}
```

`apps/web/components/__lint_fixtures__/component-feature-internal.ts`:

```ts
// Lint fixture for __tests__/lint-rules.test.ts: code outside features/ reaching into a feature's
// internal file. Never imported by app code.
import { isLastAdmin } from "@/features/members/lib/last-admin";

export const fixture = isLastAdmin;
```

`apps/web/components/__lint_fixtures__/component-fetch.ts`:

```ts
// Lint fixture for __tests__/lint-rules.test.ts: calling fetch outside lib/api-client.ts.
// Never imported by app code.
export function loadFixture(): Promise<Response> {
  return fetch("/lint-fixture");
}
```

`apps/web/components/__lint_fixtures__/component-fetch-property.ts`:

```ts
// Lint fixture for __tests__/lint-rules.test.ts: the two property forms of fetch.
// Never imported by app code.
export function loadFixture(): Promise<Response[]> {
  return Promise.all([window.fetch("/lint-fixture"), globalThis.fetch("/lint-fixture")]);
}
```

- [ ] **Step 2: Liệt kê fixture trong global ignore**

Trong `apps/web/eslint.config.mjs`, thêm trước `const eslintConfig`:

```js
/**
 * Files that break the lint rules below on purpose, so `__tests__/lint-rules.test.ts` can assert
 * each rule still reports them. Listed one by one rather than through a `__lint_fixtures__/**` glob:
 * a future fixture should not escape linting just by landing in the right directory.
 */
const LINT_FIXTURES = [
  "features/attendance/__lint_fixtures__/cross-feature-internal.ts",
  "features/attendance/__lint_fixtures__/nested-target.ts",
  "features/attendance/__lint_fixtures__/auth-core-nested.ts",
  "features/attendance/__lint_fixtures__/component-use-query.tsx",
  "components/__lint_fixtures__/component-feature-internal.ts",
  "components/__lint_fixtures__/component-fetch.ts",
  "components/__lint_fixtures__/component-fetch-property.ts",
];
```

Rồi thêm `...LINT_FIXTURES,` vào cuối mảng `globalIgnores([...])`, sau `"coverage/**",`, kèm comment:

```js
    // Linted on their own, with `--no-ignore`, by __tests__/lint-rules.test.ts.
    ...LINT_FIXTURES,
```

- [ ] **Step 3: Viết test**

`apps/web/__tests__/lint-rules.test.ts`:

```ts
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ESLint, Linter } from "eslint";
import { describe, expect, it } from "vitest";

/** Root of `apps/web` — where `eslint.config.mjs` lives. */
const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Running ESLint takes a few seconds; Vitest's 5s default is not enough. */
const LINT_TIMEOUT_MS = 60_000;

const RULE = {
  boundaries: "boundaries/dependencies",
  fetchGlobal: "no-restricted-globals",
  fetchProperty: "no-restricted-properties",
  reactQuery: "@typescript-eslint/no-restricted-imports",
} as const;

type LintRuleId = (typeof RULE)[keyof typeof RULE];

/**
 * Run the real ESLint over one file and return the messages one rule reported for it.
 *
 * A child process rather than `new ESLint()`, matching the api's `module-boundary.spec.ts`: it runs
 * exactly what `pnpm lint` runs. `--no-ignore` lints the fixtures, which the config's global ignore
 * would otherwise skip.
 *
 * @param relativePath - Path of the file to lint, relative to `apps/web`
 * @param ruleId - The rule whose messages to keep
 * @returns The messages that rule reported for the file
 */
function lintErrors(relativePath: string, ruleId: LintRuleId): Linter.LintMessage[] {
  const { stdout, status } = spawnSync(
    join(WEB_ROOT, "node_modules", ".bin", "eslint"),
    ["--no-ignore", "--format", "json", relativePath],
    { cwd: WEB_ROOT, encoding: "utf8" },
  );

  // ESLint exits 0 when clean and 1 on lint errors; any other code means it died before linting.
  if (status !== 0 && status !== 1) {
    throw new Error(`ESLint không chạy được (exit ${String(status)})`);
  }

  const [result] = JSON.parse(stdout) as ESLint.LintResult[];
  if (!result) {
    throw new Error(`ESLint không trả kết quả nào cho ${relativePath}`);
  }

  return result.messages.filter((message) => message.ruleId === ruleId);
}

/**
 * These rules are only worth having while they are still in force. A resolver that cannot read the
 * `@/` alias turns the boundary rule off without a word, so every rule gets a fixture that must go
 * red, and every exception gets a real file that must stay green.
 */
describe("luật lint của web (eslint.config.mjs)", { timeout: LINT_TIMEOUT_MS }, () => {
  describe("ranh giới feature", () => {
    it("báo lỗi khi một feature đụng file nội bộ của feature khác", () => {
      expect(
        lintErrors("features/attendance/__lint_fixtures__/cross-feature-internal.ts", RULE.boundaries),
      ).toHaveLength(1);
    });

    it("báo lỗi khi code ngoài features/ đụng file nội bộ của feature", () => {
      expect(
        lintErrors("components/__lint_fixtures__/component-feature-internal.ts", RULE.boundaries),
      ).toHaveLength(1);
    });

    it("báo lỗi khi file bị đụng nằm sâu hơn gốc feature hai cấp", () => {
      expect(
        lintErrors("features/attendance/__lint_fixtures__/nested-target.ts", RULE.boundaries),
      ).toHaveLength(1);
    });

    it("báo lỗi khi file bị đụng nằm sâu bên trong core/", () => {
      expect(
        lintErrors("features/attendance/__lint_fixtures__/auth-core-nested.ts", RULE.boundaries),
      ).toHaveLength(1);
    });

    it("cho lib/cache-graph.ts import thẳng file *-keys.ts của mọi feature", () => {
      expect(lintErrors("lib/cache-graph.ts", RULE.boundaries)).toHaveLength(0);
    });

    it("cho proxy.ts import auth qua core/index.ts", () => {
      expect(lintErrors("proxy.ts", RULE.boundaries)).toHaveLength(0);
    });

    it("không báo lỗi khi component import feature qua index.ts và server.ts", () => {
      expect(lintErrors("components/shared/site-header.tsx", RULE.boundaries)).toHaveLength(0);
    });
  });

  describe("fetch chỉ nằm trong lib/api-client.ts", () => {
    it("báo lỗi khi component gọi fetch", () => {
      expect(lintErrors("components/__lint_fixtures__/component-fetch.ts", RULE.fetchGlobal)).toHaveLength(1);
    });

    it("báo lỗi cho cả window.fetch lẫn globalThis.fetch", () => {
      expect(
        lintErrors("components/__lint_fixtures__/component-fetch-property.ts", RULE.fetchProperty),
      ).toHaveLength(2);
    });

    it("cho lib/api-client.ts gọi fetch", () => {
      expect(lintErrors("lib/api-client.ts", RULE.fetchGlobal)).toHaveLength(0);
    });
  });

  describe("TanStack Query chỉ nằm trong hooks và api của feature", () => {
    it("báo đúng một lỗi khi component import useQuery, bỏ qua import type", () => {
      expect(
        lintErrors("features/attendance/__lint_fixtures__/component-use-query.tsx", RULE.reactQuery),
      ).toHaveLength(1);
    });

    it("cho components/providers.tsx dựng QueryClientProvider", () => {
      expect(lintErrors("components/providers.tsx", RULE.reactQuery)).toHaveLength(0);
    });
  });
});
```

Nếu Prettier/ESLint của repo đòi xuống dòng khác, giữ nguyên logic, chỉ định dạng lại.

- [ ] **Step 4: Chạy test, thấy đỏ**

```bash
pnpm --filter web test -- __tests__/lint-rules.test.ts
```

Kỳ vọng: **7 case đỏ** (mọi case `toHaveLength(1)` hoặc `(2)`), **6 case xanh** (các case `0`, xanh
"nhờ" chưa có rule; Task 4 Step 2 chứng minh chúng có nghĩa). Nếu một case báo
`ESLint không chạy được`, sửa lỗi đó trước, không đi tiếp.

- [ ] **Step 5: Typecheck và lint vẫn xanh**

```bash
pnpm --filter web typecheck && pnpm --filter web lint
```

Kỳ vọng: cả hai exit 0. Fixture type-check được, và global ignore giữ chúng khỏi `pnpm lint`.

---

### Task 2: Rule boundaries (xanh phần ranh giới feature)

**Files:**
- Modify: `apps/web/package.json` (devDependencies)
- Modify: `pnpm-lock.yaml` (do `pnpm add` sinh)
- Modify: `apps/web/eslint.config.mjs`

**Interfaces:**
- Consumes: `LINT_FIXTURES` từ Task 1.
- Produces: function `featureBoundaryRules()` và hằng `TEST_FILES` (Task 3 dùng lại `TEST_FILES`).

- [ ] **Step 1: Thêm dependency**

```bash
pnpm --filter web add -D eslint-plugin-boundaries@^7.2.0 eslint-import-resolver-typescript@^3.10.1
git diff --stat pnpm-lock.yaml
```

Kỳ vọng: diff lockfile nhỏ (chỉ phần importer `apps/web`), không có package mới ở `packages:`. Nếu
lockfile kéo thêm bản mới của package khác, dừng lại và báo user.

- [ ] **Step 2: Viết block boundaries**

Thêm import ở đầu `apps/web/eslint.config.mjs`:

```js
import { fileURLToPath } from "node:url";

import boundaries from "eslint-plugin-boundaries";
```

Thêm hằng và function, sau `LINT_FIXTURES`:

```js
const FEATURE_BOUNDARY_MESSAGE =
  "Import another feature through its entry point: index.ts (client-safe), server.ts (server-only) or core/index.ts (Edge). Do not reach into its internal files.";

/** Tests build their own fixtures and clients; the boundary and TanStack Query rules skip them. */
const TEST_FILES = ["**/__tests__/**", "**/*.test.{ts,tsx}"];

/**
 * The feature boundary, checked against the **resolved path** rather than the import string, as in
 * apps/api/eslint.config.mjs.
 *
 * Each directory under `features/` is an element. Its entry points are `index.ts` (client-safe),
 * `server.ts` (server-only) and `core/index.ts` (Edge); only `auth` has all three. Every other file
 * is internal. `fileInternalPath` needs one pattern per depth: a single-level extglob never matches
 * a path containing a slash, so without `!(core)/**` and `core/*\/**` a nested file would match
 * nothing and pass in silence. The api's catch-all `*\/**` cannot be copied: it would also mark
 * `core/index.ts` internal and turn proxy.ts red.
 *
 * The `app` element is the rest of the app. It is not redundant: `boundaries` ignores any
 * dependency whose two ends it cannot both classify. A new file at the web root must be added to
 * it, or its imports go unchecked.
 *
 * `lib/cache-graph.ts` is the one file allowed to import `features/<feature>/api/*-keys.ts`
 * (frontend.md §4 rule 5). Policies are last-write-wins, so that allow must stay after the disallow.
 *
 * @returns The ESLint config blocks that apply the feature boundary rule
 */
function featureBoundaryRules() {
  return [
    {
      files: ["**/*.{ts,tsx}"],
      ignores: TEST_FILES,
      plugins: { boundaries },
      settings: {
        // The plugin's default resolver does not know the `@/` alias, and the typescript resolver
        // eslint-config-next names is not visible from here under pnpm, so it is a direct
        // devDependency. Without it every `@/features/...` import fails to resolve and the rule
        // skips it in silence - lint-rules.test.ts pins that down with violating fixtures.
        "import/resolver": {
          typescript: { project: fileURLToPath(new URL("./tsconfig.json", import.meta.url)) },
        },
        "boundaries/elements": [
          { type: "feature", pattern: "features/*", capture: ["featureName"] },
          { type: "app", pattern: ["app", "components", "config", "hooks", "lib"] },
          { type: "app", pattern: "proxy.ts", mode: "file" },
        ],
      },
      rules: {
        "boundaries/dependencies": [
          "error",
          {
            default: "allow",
            policies: [
              {
                disallow: {
                  to: {
                    element: {
                      type: "feature",
                      fileInternalPath: [
                        "!(index.ts|server.ts)",
                        "!(core)/**",
                        "core/!(index.ts)",
                        "core/*/**",
                      ],
                    },
                  },
                },
                message: FEATURE_BOUNDARY_MESSAGE,
              },
              {
                allow: {
                  from: { element: { type: "app", filePath: "**/lib/cache-graph.ts" } },
                  to: { element: { type: "feature", fileInternalPath: "api/*-keys.ts" } },
                },
              },
            ],
          },
        ],
      },
    },
  ];
}
```

Lưu ý khi viết: trong comment JSDoc, `*/` đóng comment. Viết `core/*\/**` như trên (hoặc diễn đạt
bằng chữ) để file không vỡ cú pháp.

Thêm `...featureBoundaryRules(),` vào `defineConfig([...])`, sau `...nextTs,`.

- [ ] **Step 3: Chạy test boundaries**

```bash
pnpm --filter web test -- __tests__/lint-rules.test.ts -t "ranh giới feature"
```

Kỳ vọng: 7/7 xanh. Nếu lỗi, debug theo thứ tự:

- 4 case vi phạm vẫn 0 lỗi: resolver không chạy. Chạy
  `pnpm --filter web exec eslint --no-ignore features/attendance/__lint_fixtures__/cross-feature-internal.ts`
  và tìm dòng `Resolve error` / `unable to load resolver`. Bật `ESLINT_PLUGIN_BOUNDARIES_DEBUG=1` để
  xem element nào được gán cho từng file.
- `lib/cache-graph.ts` đỏ 5 lỗi: selector của policy allow sai. Thử `filePath: "lib/cache-graph.ts"`
  (path tương đối), xem debug output để biết boundaries lưu path dạng nào. Không nới thành glob rộng
  hơn một file (Review Focus 1).
- `proxy.ts` đỏ: descriptor `proxy.ts` hoặc pattern `core/!(index.ts)` sai.
- `mode` bị báo deprecated: chấp nhận được trong 7.2.0
  (`@boundaries/elements/dist/index.d.ts:1810-1813`). Nếu nó gây lỗi thật, thay bằng
  `partialMatch: false` theo gợi ý của chính dòng deprecated đó.

- [ ] **Step 4: Lint toàn app vẫn xanh**

```bash
pnpm --filter web lint
```

Kỳ vọng: exit 0. Nếu có lỗi boundaries trên code thật, **không sửa code nguồn** (spec §5). Dừng lại,
ghi file và dòng, rồi báo user: hoặc pattern sai, hoặc grep lúc viết plan đã sót một vi phạm.

---

### Task 3: Rule `fetch` và `@tanstack/react-query` (xanh toàn bộ)

**Files:**
- Modify: `apps/web/eslint.config.mjs`

**Interfaces:**
- Consumes: `TEST_FILES` từ Task 2.
- Produces: `apiClientRules()`, `reactQueryRules()`.

- [ ] **Step 1: Viết hai block**

```js
const API_CLIENT_MESSAGE =
  "Call the backend through apiFetch in lib/api-client.ts, wrapped by the feature's api/ function.";

const REACT_QUERY_MESSAGE =
  "Components call the feature's hook; only features/*/hooks and features/*/api talk to TanStack Query.";

/**
 * `lib/api-client.ts` is the only caller of `fetch`: it prefixes the API URL, unwraps the envelope
 * and turns error statuses into `ApiError`. Tests stub fetch with `vi.stubGlobal("fetch", …)`, a
 * string, so they need no exemption.
 *
 * @returns The ESLint config blocks that keep fetch inside the API client
 */
function apiClientRules() {
  return [
    {
      files: ["**/*.{ts,tsx}"],
      ignores: ["lib/api-client.ts"],
      rules: {
        "no-restricted-globals": ["error", { name: "fetch", message: API_CLIENT_MESSAGE }],
        "no-restricted-properties": [
          "error",
          { object: "window", property: "fetch", message: API_CLIENT_MESSAGE },
          { object: "globalThis", property: "fetch", message: API_CLIENT_MESSAGE },
        ],
      },
    },
  ];
}

/**
 * Components call the feature's hook, never TanStack Query directly. The allowed places: the
 * feature's hooks and api (key factories), the shared `useInvalidate`, the provider that builds the
 * `QueryClient`, and the cache graph. Type-only imports (`QueryKey`) stay allowed everywhere.
 *
 * @returns The ESLint config blocks that keep TanStack Query behind the feature hooks
 */
function reactQueryRules() {
  return [
    {
      files: ["**/*.{ts,tsx}"],
      ignores: [
        "features/*/hooks/**",
        "features/*/api/**",
        "hooks/**",
        "components/providers.tsx",
        "lib/cache-graph.ts",
        ...TEST_FILES,
      ],
      rules: {
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@tanstack/react-query",
                message: REACT_QUERY_MESSAGE,
                allowTypeImports: true,
              },
            ],
          },
        ],
      },
    },
  ];
}
```

Thêm `...apiClientRules(),` và `...reactQueryRules(),` vào `defineConfig([...])`, sau
`...featureBoundaryRules(),`.

- [ ] **Step 2: Chạy toàn bộ test lint**

```bash
pnpm --filter web test -- __tests__/lint-rules.test.ts
```

Kỳ vọng: 13/13 xanh.

- [ ] **Step 3: Lint, typecheck, test toàn app**

```bash
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test
```

Kỳ vọng: cả ba exit 0. Lint đỏ trên code thật thì xử lý như Task 2 Step 4.

- [ ] **Step 4: Đọc message thật**

```bash
pnpm --filter web exec eslint --no-ignore components/__lint_fixtures__/component-fetch.ts features/attendance/__lint_fixtures__/component-use-query.tsx features/attendance/__lint_fixtures__/cross-feature-internal.ts
```

Kỳ vọng: ba message đúng nguyên văn Global Constraints.

- [ ] **Step 5: Thử tay ngoại lệ D2 (Review Focus 1), rồi hoàn tác**

Tạm thêm vào `lib/cache-graph.ts` dòng
`import { fetchCharacters as _probe } from "@/features/attendance/api/attendance-api";`
rồi chạy
`pnpm --filter web exec eslint lib/cache-graph.ts`.
Kỳ vọng: 1 lỗi `boundaries/dependencies`. Sau đó hoàn tác: `git checkout -- lib/cache-graph.ts`.

---

### Task 4: Coverage, Sonar và kiểm chứng rule không tắt im lặng

**Files:**
- Modify: `apps/web/vitest.config.ts` (`coverage.exclude`)
- Modify: `sonar-project.properties` (`sonar.exclusions`)

- [ ] **Step 1: Loại fixture khỏi coverage và Sonar**

`apps/web/vitest.config.ts`, trong `coverage.exclude`:

```ts
      // Lint fixtures are never executed; counting them would only report dead code as uncovered.
      exclude: ["**/__tests__/**", "**/__lint_fixtures__/**", "**/*.d.ts", "**/*.css"],
```

`sonar-project.properties`: nối `,**/__lint_fixtures__/**` vào cuối dòng `sonar.exclusions=…`, và
thêm một dòng comment phía trên khối comment của `sonar.exclusions`:

```properties
# `**/__lint_fixtures__/**`: apps/web files that break lint rules on purpose, for
# apps/web/__tests__/lint-rules.test.ts. Never executed, so neither code nor coverage.
```

Chạy `pnpm --filter web test:cov` và kiểm tra trong output `text-summary` không có file
`__lint_fixtures__` (`grep -c __lint_fixtures__ apps/web/coverage/lcov.info` phải in `0`).

- [ ] **Step 2: Mutation check (spec §5: bỏ một rule thì test đỏ)**

Lần lượt làm từng thay đổi tạm dưới đây trong `eslint.config.mjs`, chạy
`pnpm --filter web test -- __tests__/lint-rules.test.ts`, ghi số case đỏ, rồi
`git checkout -- apps/web/eslint.config.mjs` trước thay đổi kế tiếp:

| Thay đổi tạm | Kỳ vọng đỏ ít nhất |
|---|---|
| Bỏ `...featureBoundaryRules(),` | 4 case boundaries |
| Bỏ policy `allow` của cache-graph | case `lib/cache-graph.ts` |
| Bỏ `"!(core)/**"` khỏi `fileInternalPath` | case cross-feature, component, nested-target |
| Bỏ `"core/*/**"` | case `auth-core-nested` |
| Xoá cả mục `"import/resolver"` | 4 case boundaries (đây là lỗi resolver im lặng §7) |
| Bỏ `...apiClientRules(),` | 2 case fetch |
| Bỏ `"lib/api-client.ts"` khỏi `ignores` của `apiClientRules` | case `lib/api-client.ts` |
| Bỏ `...reactQueryRules(),` | case `component-use-query` |
| Bỏ `"components/providers.tsx"` khỏi `ignores` | case `providers.tsx` |

Nếu một dòng không đỏ như kỳ vọng, test đó không giữ được rule. Sửa test hoặc config trước khi đi
tiếp. Ghi bảng kết quả vào PR body.

Riêng dòng "xoá `import/resolver`": nếu nó **không** đỏ, nghĩa là boundaries tự resolve được alias
bằng cách khác, và devDependency `eslint-import-resolver-typescript` thừa. Khi đó gỡ dependency đó
(`pnpm --filter web remove eslint-import-resolver-typescript`), bỏ mục settings, sửa comment, và ghi
lại cơ chế thật vào phần "Bổ sung so với spec" của plan này.

- [ ] **Step 3: Đo thời gian lint sau thay đổi**

```bash
time pnpm --filter web lint
```

Ghi số trước/sau vào PR body (spec §7).

---

### Task 5: Doc và spec

**Files:**
- Modify: `apps/web/CLAUDE.md:19-28`
- Modify: `apps/web/docs/frontend.md:56`, `:117-133` (§4 rule 4-5), `:238`, `:1077`
- Modify: `docs/architecture.md:404`, `:431-443`
- Modify: `docs/custom-spec/2026-10-10-ac2-web-lint-boundaries-design.md` (§4.4, §4.5, §6)

Text mới viết bằng tiếng Anh (doc thường). Riêng spec trong `docs/custom-spec/` viết tiếng Việt.

- [ ] **Step 1: `apps/web/CLAUDE.md`**

Dòng 19-21, thay bằng:

```markdown
- **`lib/api-client.ts` is the only place that calls `fetch` against the backend.** Feature request
  functions wrap `apiFetch` in `features/<feature>/api/`; components call the feature's hook, never
  `useQuery` directly. Both are lint errors (`eslint.config.mjs`).
```

Dòng 22 (đầu bullet cross-feature), đổi câu mở đầu thành:

```markdown
- **Cross-feature imports go through the feature's entry point** — `index.ts` (client-safe),
  `server.ts` (server-only) or `core/index.ts` (Edge) — never an internal file; `eslint-plugin-boundaries`
  enforces it, and `__tests__/lint-rules.test.ts` keeps the rule from going silent. A feature
```

Giữ nguyên phần còn lại của bullet đó (từ "holding server-only code splits that entry in two …").

Dòng 28, thay bằng luật D1:

```markdown
- **`components/ui/` is shadcn CLI output, edited only for app-wide changes** (contrast, size,
  surface) that every screen should get. A variant only one feature needs is a wrapper in
  `components/shared/`.
```

- [ ] **Step 2: `apps/web/docs/frontend.md`**

Dòng 56, comment trong cây thư mục:

```
│   ├── ui/                         # shadcn CLI output — edited only for app-wide changes
```

§4 rule 5 (dòng 120-124): sửa đoạn đầu cho khớp D4, vì hiện tại nó nói `index.ts` của auth chứa
`getSession`, trong khi thực tế `getSession` nằm ở `server.ts` (`architecture.md:419-421`):

```markdown
5. **Never import another feature's internal file.** Go through its entry point: `index.ts`
   (client-safe), `server.ts` (server-only) or `core/index.ts` (Edge). Only `features/auth` has all
   three, because it has three runtimes: `index.ts` for Client Components, `server.ts` for everything
   touching cookies (`getSession` pulls in `next/headers`), `core/` for everything the Edge runtime
   can load. `proxy.ts` runs at the Edge, so it imports `@/features/auth/core` and nothing deeper.
```

Giữ nguyên đoạn "The **only** exception: `lib/cache-graph.ts` …". Ngay sau đoạn đó (vẫn thụt lề
trong rule 5), thêm:

```markdown
   Rules 4 and 5 are lint errors, not conventions: `eslint.config.mjs` enforces the feature boundary
   (`eslint-plugin-boundaries`, with the cache-graph exception), `fetch` outside `lib/api-client.ts`,
   and TanStack Query imports outside `features/*/hooks`, `features/*/api`, `hooks/`,
   `components/providers.tsx` and `lib/cache-graph.ts`. `__tests__/lint-rules.test.ts` lints one
   violating fixture per rule, so a rule that stops reporting fails the test suite.
```

Dòng 238, hàng bảng §5:

```markdown
| `components/ui/` | Stock shadcn components | **shadcn CLI output.** Add with `pnpm dlx shadcn@latest add <component>`; edit in place only for app-wide changes, wrap in `components/shared/` for a one-feature variant |
```

Dòng 1077, hàng §9:

```markdown
| Editing `components/ui/button.tsx` for one feature's variant | Wrap it in `components/shared/`; edit `components/ui/` only for an app-wide change |
```

- [ ] **Step 3: `docs/architecture.md` §4.2**

Dòng 404:

```
│   ├── ui/           # shadcn CLI output — edited only for app-wide changes
```

Bullet `fetch` (dòng 431-434): thêm câu cuối `Both are lint errors (`apps/web/eslint.config.mjs`).`

Bullet cross-feature (dòng 439-440): thêm câu cuối
``Enforced by `eslint-plugin-boundaries`; `lib/cache-graph.ts` may import `features/*/api/*-keys.ts` directly.``

Bullet `components/ui/` (dòng 441-443), câu đầu đổi thành:

```markdown
- `components/ui/` is shadcn CLI output, edited only for changes every screen should get (contrast,
  size, surface). A variant one feature needs is a wrapper in `components/shared/`. Everything
```

Giữ nguyên phần "there comes from the shadcn CLI in its Base UI flavour …".

Kiểm tra lại: `grep -rn "never hand-edited" apps/web docs/architecture.md --include=*.md` phải không
còn kết quả.

- [ ] **Step 4: Cập nhật spec cho khớp với thực tế**

Trong `docs/custom-spec/2026-10-10-ac2-web-lint-boundaries-design.md`:

- §4.1 đoạn Resolver: thay "Chọn resolver lúc implement: …" bằng câu chốt
  "`eslint-import-resolver-typescript` là devDependency trực tiếp của web: resolver mà
  `eslint-config-next` khai báo không thấy được từ `apps/web` dưới pnpm strict." (Nếu Task 4 Step 2
  cho thấy resolver thừa, ghi cơ chế thật thay vào.)
- §4.1 đoạn Ngoại lệ D2: thêm "Policy là last-write-wins, nên allow đứng sau disallow."
- §4.4: thêm hai hàng bảng (`window.fetch`/`globalThis.fetch` → 2 lỗi `no-restricted-properties`;
  `lib/api-client.ts` thật → 0 lỗi; `components/providers.tsx` thật → 0 lỗi react-query), và một câu:
  "Fixture bị loại khỏi coverage (`vitest.config.ts`) và Sonar (`sonar.exclusions`)."
- §4.5: thêm `apps/web/docs/frontend.md:56,238`, `docs/architecture.md:404,441-443` và việc sửa
  §4 rule 5 của `frontend.md` (entry point `server.ts`).
- §6 bảng kích thước: thêm hàng `vitest.config.ts` + `sonar-project.properties` (~5 dòng).
- Dòng trạng thái đầu file: `**spec, đang triển khai**`.

---

### Task 6: Kiểm chứng cuối, commit, PR

**Files:** không có file mới.

- [ ] **Step 1: Bộ check của web**

```bash
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test && pnpm --filter web build
```

Kỳ vọng: cả bốn exit 0.

- [ ] **Step 2: Chạy tay đúng install của Vercel (spec §5, §7)**

Vercel không tạo preview cho PR, nên bước này là lần duy nhất phủ rủi ro install lọc:

```bash
git stash list   # phải không có gì của task này
git worktree add ../guild-manager-vercel-check HEAD
cd ../guild-manager-vercel-check
pnpm install --frozen-lockfile --filter web --filter @guild/shared
pnpm --filter web build
cd - && git worktree remove ../guild-manager-vercel-check
```

Commit trước khi chạy bước này (Step 3), vì worktree lấy `HEAD`. Kỳ vọng: install và build exit 0.
Ghi kết quả vào PR body.

- [ ] **Step 3: Commit**

```bash
git rev-parse --abbrev-ref HEAD   # phải in: chore/web-lint-boundaries
git status --short                # chỉ file trong plan này
```

Viết commit message bằng skill `caveman:caveman-commit` (luật global). Gợi ý subject:
`chore(config): enforce web feature boundaries with eslint`. Body nêu ba rule, test giữ rule, và lý
do thêm `eslint-import-resolver-typescript`.

- [ ] **Step 4: Review**

Chạy skill `review-loop` (luật global): reviewer agent mới mỗi vòng, vòng cuối là `pr-review` trong
agent `reviewer` riêng. Gửi kèm phần Review Focus của plan này cho reviewer.

- [ ] **Step 5: Push và PR - hỏi user trước**

Push là hành động ra ngoài: mô tả một dòng và chờ user đồng ý. Sau đó điền
`.github/pull_request_template.md` đủ mọi mục, kèm: thời gian lint trước/sau (Task 0, Task 4 Step 3),
bảng mutation check (Task 4 Step 2), kết quả lệnh install Vercel (Task 6 Step 2). Dừng ở link PR.

---

## Self-review (lúc viết plan)

- Spec coverage: §4.1 → Task 2; §4.2, §4.3 → Task 3; §4.4 → Task 1 + Task 4 Step 2; §4.5 → Task 5;
  §5 → Task 3 Step 3, Task 4 Step 2, Task 6 Step 1-2; §7 → Task 0 Step 2, Task 4 Step 3, Task 6 Step 2.
- Tên dùng chung: `LINT_FIXTURES` (Task 1), `TEST_FILES` và `featureBoundaryRules` (Task 2),
  `apiClientRules` và `reactQueryRules` (Task 3), `lintErrors` và `RULE` (Task 1 test).
- Ước tính kích thước: config ~150, test ~130, fixture ~55, doc ~45, spec ~20, package/lock ~15,
  coverage/Sonar ~5. Tổng ~420 dòng, dưới 900.
