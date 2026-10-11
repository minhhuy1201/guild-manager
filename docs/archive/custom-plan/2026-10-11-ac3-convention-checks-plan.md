# AC3 - Drift spec và Stop hook - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task (inline, theo `CLAUDE.md` project). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ba cặp file song song (env, enum Prisma, alias web) có spec đỏ khi lệch nhau. Một Stop hook
chạy lint, typecheck và drift spec cho workspace có file đổi, rồi trả lỗi về cho agent trước khi nó
dừng. Một PostToolUse hook chạy Prettier cho file TypeScript vừa sửa của api và ci-triage.

**Architecture:** Drift check là spec trong test suite có sẵn (jest cho api, vitest cho web), nên CI
chạy chúng mà không cần job mới. Mỗi spec có một helper thuần trả về danh sách lỗi dạng chữ, để case
âm chạy được trên dữ liệu giả. Hai hook là shell script cạnh `pre-push-review-gate.sh`. Hook gọi đúng
các lệnh `pnpm --filter …` mà CI gọi, không có script trung gian (D1).

**Tech Stack:** Jest 30 + ts-jest (api), Vitest (web), Zod 4 (`envSchema.shape`), Prisma Client
generator `prisma-client` (`src/generated/prisma/enums.ts`), bash + node (đọc JSON stdin của hook),
Claude Code hooks (`Stop`, `PostToolUse`).

**Spec:** [`docs/custom-spec/2026-10-10-ac3-convention-checks-design.md`](../custom-spec/2026-10-10-ac3-convention-checks-design.md)
(tổng quan: [`2026-10-10-agent-context-review-overview.md`](../../custom-spec/2026-10-10-agent-context-review-overview.md))

## Global Constraints

- Branch `chore/convention-checks`, tạo từ `main` mới nhất (đã có AC2: `a777f17`, plan `85c84a0`).
  Một PR, dưới 900 dòng thay đổi.
- Không sửa code nguồn của app. Chỉ thêm spec, hook, `.claude/settings.json`, doc và spec AC3.
- Không đổi CI workflow. `backend-test` chạy `pnpm --filter api test`, `frontend-test` chạy
  `pnpm --filter web test` (`.github/workflows/ci.yml:69`, `:79`).
- Không thêm gì vào `package.json` ở root, không thêm dependency.
- Hook đọc JSON bằng `node`, không bằng `jq` hay `python3`: repo nào chạy được cũng có node 24
  (`engines`), còn `jq` không chắc có trên máy người khác.
- Code, comment, message lỗi: tiếng Anh. Tên `describe`/`it`: tiếng Việt, như
  `apps/api/src/config/__tests__/env.validation.spec.ts`.
- Allow-list env, copy nguyên văn từ spec D3: `ENV_EXAMPLE_ONLY = ['DIRECT_DATABASE_URL', 'DISCORD_GUILD_ID']`.
- Dòng mở đầu stderr của Stop hook, nguyên văn spec §4.2: `Convention check failed. Fix these before finishing:`
- Stop hook: `"timeout": 300` (spec §4.2).

## Kiểm chứng lúc viết plan (2026-10-11, trên `85c84a0`)

- **PR 1 (AC2) đã merge:** `a777f17 chore(config): enforce web feature boundaries with eslint (#183)`;
  spec AC2 ghi `đã triển khai`. AC3 không còn bị chặn.
- **Cặp env khớp hôm nay.** 18 key trong `envSchema` đều có trong `apps/api/.env.example`;
  `.env.example` thừa đúng `DIRECT_DATABASE_URL` và `DISCORD_GUILD_ID`. Cả 18 key có hàng bảng
  `` | `KEY` | `` ở `docs/development.md` §3 và `docs/production.md` §3 (đếm bằng grep từng key).
- **Enum khớp hôm nay.** `schema.prisma:21-35` có `GuildClass` (7 giá trị) và `GuildRole` (2).
  Probe jest tạm (đã xoá) in `Object.keys` của `import * as PrismaEnums from '../generated/prisma/enums'`
  ra đúng `["GuildClass","GuildRole"]`, và `SharedEnums.GuildRole` ra `{"ADMIN":"ADMIN","MEMBER":"MEMBER"}`.
  Vậy duyệt namespace Prisma là đủ, không lẫn key `default` hay `__esModule`.
- **Alias khớp hôm nay.** `apps/web/tsconfig.json:21-23` có `"@/*": ["./*"]`; `apps/web/vitest.config.ts:48-52`
  có `alias: { "@": <web root> }`. (Spec ghi `:43-45`; AC2 đã đẩy dòng xuống.)
- **Thời gian lệnh** (đo tuần tự, máy dev):

  | Lệnh | Giây |
  |---|---|
  | `pnpm --filter @guild/shared build` | 1 |
  | `pnpm --filter api lint` | 6 |
  | `pnpm --filter api typecheck` | 3 |
  | `pnpm --filter web lint` | 7 |
  | `pnpm --filter web typecheck` | 3 |
  | `pnpm --filter @guild/ci-triage lint` / `typecheck` | 2 / 2 |
  | `pnpm --filter api test permissions env.validation` (2 suite, có `pretest`) | 1 |
  | `pnpm --filter web test eslint-pin` (1 file, có `pretest`) | 2 |

  Trường hợp xấu nhất (đổi `packages/shared`, chạy cả api và web) khoảng 25 s, dưới ngưỡng 60 s của
  spec §7.
- **Lọc test theo tên chạy được:** `pnpm --filter api test permissions env.validation` chạy đúng 2
  suite (jest nhận pattern vị trí). Hook dùng cùng cách.
- **Docs Claude Code** (<https://code.claude.com/docs/en/hooks>):
  - Stop input có `stop_hook_active`: "The `stop_hook_active` field is `true` when Claude Code is
    already continuing as a result of a stop hook."
  - Exit 2 với Stop: "Prevents Claude from stopping, continues the conversation".
  - Exit 2 với PostToolUse: "Shows stderr to Claude; the tool already ran" (nên format hook luôn exit 0).
  - PostToolUse: "file-tool `tool_input` paths are always absolute".
  - Timeout mặc định của hook `command` là 600 s; spec chọn 300.

## Bổ sung so với spec

Task 5 ghi các điểm này vào spec.

1. **Check doc chặt hơn spec một chút.** Spec §4.1 chỉ đòi `` `KEY` `` xuất hiện trong doc. Plan đòi
   một **hàng bảng** bắt đầu bằng `` | `KEY` | ``. Lý do: `DATABASE_URL` và `AUTH_SECRET` xuất hiện
   5-7 lần trong mỗi doc, nên check lỏng vẫn xanh khi hàng bảng của chúng bị xoá. Hôm nay mọi key đều
   có hàng, nên không cần sửa doc.
2. **Allow-list không được mục.** Thêm một case: mỗi key trong `ENV_EXAMPLE_ONLY` phải còn trong
   `.env.example` và vẫn không có trong `envSchema`. Thiếu case này, khi `DISCORD_GUILD_ID` vào schema
   thì allow-list nói sai mà không ai biết.
3. **Doc env thuộc workspace api.** Hook coi `docs/development.md` và `docs/production.md` là thay đổi
   của api, vì `env-example.spec.ts` đọc hai file đó. Không có dòng này, xoá một hàng bảng chỉ đỏ ở CI.
4. **File chưa track cũng là thay đổi.** Hook gộp `git ls-files --others --exclude-standard`. Spec chỉ
   ghi "thay đổi chưa commit"; `git diff` không thấy file mới tạo.
5. **Workspace chưa map thì báo lỗi, không bỏ qua im lặng.** File đổi trong `apps/*` hoặc `packages/*`
   mà hook không biết thuộc workspace nào sẽ thành một dòng lỗi (luật "misconfiguration fails loud"
   của `CLAUDE.md`).
6. **Output mỗi lệnh lỗi cắt còn 60 dòng cuối** (`MAX_LINES_PER_FAILURE`), để một lần lint đỏ cả trăm
   dòng không tràn context của agent.
7. **PostToolUse gồm cả `packages/ci-triage/src/**/*.ts`.** Job `tooling-check` cũng chạy
   `format:check` (`ci.yml:330`), cùng kiểu lỗi với api. Thêm một nhánh `case`.
8. **Ghi chú về Prettier:** lint của api và ci-triage đã gồm `eslint-plugin-prettier`
   (`apps/api/eslint.config.mjs:3`, `packages/ci-triage/eslint.config.mjs:3`), nên Stop hook vẫn bắt
   lỗi format kể cả khi file đổi bằng Bash. PostToolUse chỉ để agent khỏi phải quay lại sửa.
9. **`docs/development.md:300-301` nói sai một nửa.** Câu "`seed.ts` imports the shared enums directly,
   so a mismatch is a compile error" chỉ đúng một chiều và chỉ cho `GuildClass`: `seed.ts:7` không
   dùng `GuildRole`, và giá trị Prisma có mà shared thiếu không làm `tsc` đỏ. Task 5 sửa câu đó để trỏ
   tới drift spec.
10. **Bỏ qua khi không có gì mới (user chọn phương án C, 2026-10-11; spec D4 và §4.2 đã cập nhật).**
    Theo D4 gốc, hook chạy lint + typecheck (12-25 s) ở mọi lần dừng của branch khác `main`, kể cả
    lượt chỉ hỏi đáp. Hook giờ tính một dấu vân tay của trạng thái code: hash của `base`, `git diff
    "$base"`, tên và nội dung file chưa track. Dấu vân tay trùng lần pass gần nhất (lưu ở
    `.claude/.stop-check-passed`, git-ignored, giống `.claude/.pr-review-passed`) thì exit 0 ngay.
    Chỉ ghi marker khi mọi check pass. Đã thử lệnh tính dấu vân tay trên repo: chạy hai lần ra cùng
    hash, sửa một file chưa track thì hash đổi, hoàn tác thì hash trở về giá trị cũ.

## Review Focus

1. **Generated client cũ.** `prisma-enum-sync.spec.ts` so với `src/generated/prisma`, không với
   `schema.prisma`. Sửa schema mà chưa `prisma generate` thì spec local vẫn xanh. CI cài lại từ đầu
   (`postinstall` chạy `prisma generate`) nên CI bắt được. Comment trong spec ghi điều này. Không có
   test cho chiều này; reviewer xác nhận comment có mặt.
2. **Vòng lặp Stop hook.** Lần dừng thứ hai sau khi bị chặn luôn được qua (`stop_hook_active`), kể cả
   khi lỗi còn. Đó là chủ ý của D5. Task 4 Step 2 kiểm tay case này.
3. **Branch không có `origin/main`** (clone mới, remote tên khác). Hook rơi về `HEAD`, tức chỉ xét
   thay đổi chưa commit, không chết. Task 4 Step 2 kiểm tay.
4. **Đường dẫn có dấu cách hoặc ký tự lạ.** Hook đọc danh sách file từng dòng (`read -r`), không tách
   theo khoảng trắng. Format hook quote `"$file_path"` ở mọi chỗ.
5. **Dấu vân tay chỉ thấy nội dung git thấy.** File git-ignored (`.env`, `node_modules`,
   `src/generated`) đổi thì không làm hook chạy lại. Chấp nhận được: không check nào của hook đọc
   `.env`, còn `schema.prisma` và `pnpm-lock.yaml` đều được track. Marker là file thường nên có thể
   bị sửa tay. Hook chỉ để agent tự sửa, không phải cổng chặn (spec §7). Task 4 Step 2 dòng 8-9 kiểm
   chuyện bỏ qua và chuyện chạy lại.

---

### Task 0: Branch

**Files:** không có.

- [ ] **Step 1: Tạo branch**

```bash
git switch main && git pull --ff-only
git rev-parse --abbrev-ref HEAD   # phải in: main
git switch -c chore/convention-checks
```

---

### Task 1: Drift spec env (`envSchema` ↔ `.env.example` ↔ bảng doc)

**Files:**
- Create: `apps/api/src/config/__tests__/env-example.spec.ts`

**Interfaces:**
- Consumes: `envSchema` từ `apps/api/src/config/env.validation.ts:7`.
- Produces: hằng `ENV_EXAMPLE_ONLY` (Task 5 trỏ doc tới nó).

File nằm ở `src/config/__tests__/`, nên chịu luật `restrictUpwardImports` cho `src/config/*/*.ts`
(`apps/api/eslint.config.mjs`). File chỉ import `../env.validation` và `node:*`, không vi phạm.

- [ ] **Step 1: Viết spec**

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { envSchema } from '../env.validation';

/** Root of `apps/api` — where `.env.example` lives. */
const API_ROOT = join(__dirname, '..', '..', '..');

/** Root of the repository — where `docs/` lives. */
const REPO_ROOT = join(API_ROOT, '..', '..');

/**
 * Keys `.env.example` documents that `envSchema` deliberately does not read. Each needs a reason:
 * an entry here is a promise that the runtime never touches the variable.
 */
const ENV_EXAMPLE_ONLY = [
  // Read by the Prisma CLI only (`migrate:prod`, `db:seed`); the runtime must never touch it.
  'DIRECT_DATABASE_URL',
  // Read by `discord:register` only, a script run by hand, never by the running app.
  'DISCORD_GUILD_ID',
];

/** Docs whose §3 table must have a row for every key the schema reads. */
const ENV_DOCS = ['docs/development.md', 'docs/production.md'];

/**
 * @param text - Contents of an env file
 * @returns Every key assigned at the start of a line; commented-out lines do not count
 */
function envFileKeys(text: string): string[] {
  return [...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
}

/**
 * Compare the schema with `.env.example`, both ways, minus `ENV_EXAMPLE_ONLY`.
 *
 * @returns One line per key that is on one side only
 */
function exampleDrift(schemaKeys: string[], exampleKeys: string[]): string[] {
  const missingFromExample = schemaKeys
    .filter((key) => !exampleKeys.includes(key))
    .map((key) => `${key}: in envSchema but not in .env.example`);
  const missingFromSchema = exampleKeys
    .filter((key) => !schemaKeys.includes(key))
    .filter((key) => !ENV_EXAMPLE_ONLY.includes(key))
    .map(
      (key) =>
        `${key}: in .env.example but not in envSchema (add it to envSchema, or to ENV_EXAMPLE_ONLY with the reason the runtime never reads it)`,
    );

  return [...missingFromExample, ...missingFromSchema];
}

/**
 * A loose mention is not enough: `DATABASE_URL` appears all over both docs, so only a table row
 * proves the variable is documented.
 *
 * @returns One line per key with no `| \`KEY\` |` row in the doc
 */
function missingDocRows(keys: string[], docText: string, docPath: string): string[] {
  return keys
    .filter((key) => !new RegExp(`^\\| \`${key}\` \\|`, 'm').test(docText))
    .map((key) => `${key}: no table row in ${docPath}`);
}

const schemaKeys = Object.keys(envSchema.shape);
const exampleKeys = envFileKeys(
  readFileSync(join(API_ROOT, '.env.example'), 'utf8'),
);

describe('envSchema khớp .env.example và bảng env trong docs', () => {
  it('mọi key của envSchema có trong .env.example, và ngược lại', () => {
    expect(exampleDrift(schemaKeys, exampleKeys)).toEqual([]);
  });

  it('ENV_EXAMPLE_ONLY chỉ chứa key có trong .env.example mà envSchema không đọc', () => {
    const stale = ENV_EXAMPLE_ONLY.filter(
      (key) => !exampleKeys.includes(key) || schemaKeys.includes(key),
    );

    expect(stale).toEqual([]);
  });

  it.each(ENV_DOCS)('mọi key của envSchema có một hàng trong bảng của %s', (docPath) => {
    const docText = readFileSync(join(REPO_ROOT, docPath), 'utf8');

    expect(missingDocRows(schemaKeys, docText, docPath)).toEqual([]);
  });

  describe('đỏ được khi lệch (dữ liệu giả)', () => {
    it('báo key schema thiếu trong .env.example', () => {
      expect(exampleDrift(['A_KEY', 'B_KEY'], ['A_KEY'])).toEqual([
        'B_KEY: in envSchema but not in .env.example',
      ]);
    });

    it('báo key .env.example thừa ngoài allow-list, bỏ qua key trong allow-list', () => {
      expect(
        exampleDrift(['A_KEY'], ['A_KEY', 'EXTRA_KEY', 'DIRECT_DATABASE_URL']),
      ).toEqual([expect.stringMatching(/^EXTRA_KEY: in \.env\.example but not in envSchema/)]);
    });

    it('không tính dòng đã comment trong .env.example', () => {
      expect(envFileKeys('A_KEY=1\n# B_KEY=2\n#   C_KEY=3 pnpm run\n')).toEqual(['A_KEY']);
    });

    it('báo key chỉ được nhắc trong văn xuôi mà không có hàng bảng', () => {
      const doc = '| `A_KEY` | ✅ | x |\nSee `B_KEY` for details.\n';

      expect(missingDocRows(['A_KEY', 'B_KEY'], doc, 'docs/x.md')).toEqual([
        'B_KEY: no table row in docs/x.md',
      ]);
    });
  });
});
```

- [ ] **Step 2: Chạy, kỳ vọng xanh trên code thật**

```bash
pnpm --filter api test env-example
```

Kỳ vọng: 1 suite, 8 test xanh (4 trên file thật, gồm 2 case `it.each`, và 4 trên dữ liệu giả).
Nếu một case thật đỏ, đọc message: đó là drift thật, báo user, **không** sửa `.env.example` hay doc
mà không hỏi.

- [ ] **Step 3: Chứng minh case thật đỏ được (spec §5), rồi hoàn tác**

Lần lượt từng thay đổi tạm, chạy lại Step 2, rồi `git checkout -- <file>`:

| Thay đổi tạm | Kỳ vọng |
|---|---|
| Xoá dòng `CRON_SECRET=` trong `apps/api/.env.example` | case 1 đỏ: `CRON_SECRET: in envSchema but not in .env.example` |
| Thêm dòng `NEW_KEY=` vào `apps/api/.env.example` | case 1 đỏ: `NEW_KEY: in .env.example but not in envSchema …` |
| Xoá dòng `DISCORD_GUILD_ID=` trong `.env.example` | case allow-list đỏ: `["DISCORD_GUILD_ID"]` |
| Xoá hàng `` | `CRON_SECRET` | `` trong `docs/production.md` | case `docs/production.md` đỏ |

- [ ] **Step 4: Lint và format**

```bash
pnpm --filter api lint && pnpm --filter api typecheck
```

Prettier của api (width 80) có thể đòi xuống dòng khác code mẫu. `pnpm --filter api format` rồi
giữ nguyên logic.

---

### Task 2: Drift spec enum (Prisma ↔ `@guild/shared/enums`)

**Files:**
- Create: `apps/api/src/__tests__/prisma-enum-sync.spec.ts`

**Interfaces:**
- Consumes: `apps/api/src/generated/prisma/enums.ts` (generated, git-ignored), `@guild/shared/enums`.

- [ ] **Step 1: Viết spec**

```ts
import * as SharedEnums from '@guild/shared/enums';

import * as PrismaEnums from '../generated/prisma/enums';

type EnumValues = Record<string, string>;

/**
 * Every Prisma enum must have a twin of the same name in `@guild/shared/enums` with the same set of
 * values. The shared side may have more enums: not every shared enum is a database column.
 *
 * @returns One line per Prisma enum with no twin or a different set of values
 */
function enumDrift(
  prismaEnums: Record<string, EnumValues>,
  sharedEnums: Record<string, unknown>,
): string[] {
  return Object.entries(prismaEnums).flatMap(([name, values]) => {
    const twin = sharedEnums[name];
    if (typeof twin !== 'object' || twin === null) {
      return [`${name}: Prisma enum has no twin in @guild/shared/enums`];
    }

    const prismaValues = Object.values(values).sort();
    const sharedValues = Object.values(twin as EnumValues).sort();
    if (JSON.stringify(prismaValues) === JSON.stringify(sharedValues)) {
      return [];
    }

    return [
      `${name}: Prisma has [${prismaValues.join(', ')}], @guild/shared/enums has [${sharedValues.join(', ')}]`,
    ];
  });
}

/**
 * Compares against the **generated** client, not `schema.prisma`: after a schema edit, run
 * `pnpm --filter api prisma:generate` (or `prisma:migrate`) before trusting a green run locally.
 * CI installs from scratch, and `postinstall` regenerates, so CI always compares the real schema.
 *
 * `BotChannel.purpose` is a `String` on purpose, not an enum (schema.prisma:206), so it is out of
 * scope here.
 */
describe('enum Prisma khớp @guild/shared/enums', () => {
  it('mỗi enum Prisma có bản cùng tên, cùng tập giá trị ở shared', () => {
    expect(enumDrift(PrismaEnums, SharedEnums)).toEqual([]);
  });

  describe('đỏ được khi lệch (dữ liệu giả)', () => {
    it('báo enum Prisma không có bản ở shared', () => {
      expect(enumDrift({ Color: { RED: 'RED' } }, {})).toEqual([
        'Color: Prisma enum has no twin in @guild/shared/enums',
      ]);
    });

    it('báo giá trị Prisma có mà shared thiếu', () => {
      expect(
        enumDrift({ Role: { ADMIN: 'ADMIN', GUEST: 'GUEST' } }, { Role: { ADMIN: 'ADMIN' } }),
      ).toEqual(['Role: Prisma has [ADMIN, GUEST], @guild/shared/enums has [ADMIN]']);
    });

    it('báo giá trị shared có mà Prisma thiếu', () => {
      expect(
        enumDrift({ Role: { ADMIN: 'ADMIN' } }, { Role: { ADMIN: 'ADMIN', GUEST: 'GUEST' } }),
      ).toEqual(['Role: Prisma has [ADMIN], @guild/shared/enums has [ADMIN, GUEST]']);
    });

    it('không báo khi shared có thêm enum Prisma không có', () => {
      expect(enumDrift({}, { TacticColor: { BLUE: 'BLUE' } })).toEqual([]);
    });
  });
});
```

Nếu `typecheck` báo namespace `PrismaEnums` hoặc `SharedEnums` không gán được cho kiểu `Record<…>`
(chưa kiểm lúc viết plan), truyền bản spread `{ ...PrismaEnums }` / `{ ...SharedEnums }`: object
literal có index signature ngầm. Không dùng `as`.

- [ ] **Step 2: Chạy, kỳ vọng xanh**

```bash
pnpm --filter api test prisma-enum-sync
```

Kỳ vọng: 5 test xanh.

- [ ] **Step 3: Chứng minh case thật đỏ được, rồi hoàn tác**

Thêm tạm `GUEST` vào `enum GuildRole` trong `apps/api/prisma/schema.prisma`, chạy
`pnpm --filter api prisma:generate`, chạy lại Step 2. Kỳ vọng: case thật đỏ với
`GuildRole: Prisma has [ADMIN, GUEST, MEMBER], @guild/shared/enums has [ADMIN, MEMBER]`.

Hoàn tác: `git checkout -- apps/api/prisma/schema.prisma && pnpm --filter api prisma:generate`.
Không chạy `prisma:migrate` ở bước này (nó tạo migration).

- [ ] **Step 4: Lint, typecheck, toàn bộ test api**

```bash
pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test
```

Kỳ vọng: cả ba exit 0.

---

### Task 3: Drift spec alias web (`tsconfig.json` ↔ `vitest.config.ts`)

**Files:**
- Create: `apps/web/__tests__/alias-sync.test.ts`

- [ ] **Step 1: Viết test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import vitestConfig from "../vitest.config";

/** Root of `apps/web` — where `tsconfig.json` and `vitest.config.ts` live. */
const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));

type AliasMap = Record<string, string>;

type TsconfigPaths = Record<string, string[]>;

/**
 * Turn tsconfig `paths` into Vitest's alias shape: `"@/*": ["./*"]` becomes `{ "@": <root> }`.
 * Vitest takes one target per alias, so only the first tsconfig target counts.
 */
function tsconfigAliases(paths: TsconfigPaths, root: string): AliasMap {
  return Object.fromEntries(
    Object.entries(paths).map(([key, [target]]) => [
      key.replace(/\/\*$/, ""),
      resolve(root, target.replace(/\/\*$/, "")),
    ]),
  );
}

/**
 * Both sides go through `resolve` so a trailing slash (`new URL(".")` keeps one) is not a drift.
 *
 * @returns One line per alias missing on one side or pointing somewhere else
 */
function aliasDrift(fromTsconfig: AliasMap, fromVitest: AliasMap): string[] {
  const keys = [...new Set([...Object.keys(fromTsconfig), ...Object.keys(fromVitest)])].sort();

  return keys.flatMap((key) => {
    if (!(key in fromTsconfig)) {
      return [`${key}: in vitest.config.ts but not in tsconfig.json paths`];
    }
    if (!(key in fromVitest)) {
      return [`${key}: in tsconfig.json paths but not in vitest.config.ts`];
    }

    const tsconfigTarget = resolve(fromTsconfig[key]);
    const vitestTarget = resolve(fromVitest[key]);
    if (tsconfigTarget === vitestTarget) {
      return [];
    }

    return [`${key}: tsconfig.json points at ${tsconfigTarget}, vitest.config.ts at ${vitestTarget}`];
  });
}

/** `resolve.alias` may also be an array; this app uses the object form, and anything else is drift. */
function vitestAliases(): AliasMap {
  const alias = vitestConfig.resolve?.alias;
  if (alias === undefined || Array.isArray(alias)) {
    throw new Error("vitest.config.ts: resolve.alias must be an object of { alias: path }");
  }

  return alias as AliasMap;
}

describe("alias của tsconfig.json khớp vitest.config.ts", () => {
  it("mỗi alias khai ở cả hai nơi và trỏ cùng thư mục", () => {
    const tsconfig = JSON.parse(readFileSync(resolve(WEB_ROOT, "tsconfig.json"), "utf8")) as {
      compilerOptions: { paths: TsconfigPaths };
    };

    expect(
      aliasDrift(tsconfigAliases(tsconfig.compilerOptions.paths, WEB_ROOT), vitestAliases()),
    ).toEqual([]);
  });

  describe("đỏ được khi lệch (dữ liệu giả)", () => {
    it("đổi `@/*` của tsconfig thành dạng alias của Vitest", () => {
      expect(tsconfigAliases({ "@/*": ["./*"] }, "/web")).toEqual({ "@": "/web" });
    });

    it("báo alias tsconfig có mà Vitest thiếu", () => {
      expect(aliasDrift({ "@": "/web", "~": "/web/lib" }, { "@": "/web/" })).toEqual([
        "~: in tsconfig.json paths but not in vitest.config.ts",
      ]);
    });

    it("báo alias Vitest có mà tsconfig thiếu", () => {
      expect(aliasDrift({ "@": "/web" }, { "@": "/web", "~": "/web/lib" })).toEqual([
        "~: in vitest.config.ts but not in tsconfig.json paths",
      ]);
    });

    it("báo alias trỏ hai thư mục khác nhau", () => {
      expect(aliasDrift({ "@": "/web" }, { "@": "/web/src" })).toEqual([
        "@: tsconfig.json points at /web, vitest.config.ts at /web/src",
      ]);
    });
  });
});
```

Ghi chú: `tsconfig.json` của web hôm nay là JSON thuần, nên `JSON.parse` đủ. Nếu sau này có comment,
test chết với lỗi parse rõ ràng; khi đó mới đổi sang `ts.readConfigFile`.

- [ ] **Step 2: Chạy, kỳ vọng xanh**

```bash
pnpm --filter web test alias-sync
```

Kỳ vọng: 5 test xanh.

- [ ] **Step 3: Chứng minh case thật đỏ được, rồi hoàn tác**

Thêm tạm `"~/*": ["./lib/*"]` vào `compilerOptions.paths` của `apps/web/tsconfig.json`, chạy lại Step 2.
Kỳ vọng: `~: in tsconfig.json paths but not in vitest.config.ts`. Hoàn tác bằng
`git checkout -- apps/web/tsconfig.json`.

- [ ] **Step 4: Lint, typecheck, toàn bộ test web**

```bash
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test
```

Kỳ vọng: cả ba exit 0. Nếu lint chê `as AliasMap` là thừa (kiểu `AliasOptions` dạng object đã là
`{ [find: string]: string }`), bỏ cast.

---

### Task 4: Stop hook và PostToolUse hook

**Files:**
- Create: `.claude/hooks/check-on-stop.sh` (mode 755)
- Create: `.claude/hooks/format-on-edit.sh` (mode 755)
- Modify: `.claude/settings.json`
- Modify: `.gitignore:54` (thêm `.claude/.stop-check-passed` ngay dưới `.claude/.pr-review-passed`)

**Interfaces:**
- Consumes: tên file spec từ Task 1-3 (`env-example`, `prisma-enum-sync`, `alias-sync`) làm pattern
  lọc test.

- [ ] **Step 1: Viết `check-on-stop.sh`**

```bash
#!/usr/bin/env bash
# Stop hook: before Claude finishes a turn, run lint, typecheck and the drift specs for every
# workspace with changed files, so a broken convention surfaces now instead of in CI after a push.
#
# Wiring: registered as a Stop hook in .claude/settings.json.
# "Changed" means different from the merge-base with origin/main - committed, staged, unstaged or
# untracked. Full test suites stay with CI: too slow to run on every stop.
#
# Cooperative, like pre-push-review-gate.sh: only Claude Code sessions reach it.
#
# Exit 0 -> let Claude stop.  Exit 2 -> block the stop; stderr goes back to Claude.
set -uo pipefail

# Lines kept from each failing command: enough for the first errors, short enough that a wall of
# lint output does not flood Claude's context.
readonly MAX_LINES_PER_FAILURE=60

input="$(cat)"

# After one block Claude continues with `stop_hook_active: true`. Letting that stop through keeps a
# failure Claude cannot fix from looping forever.
stop_hook_active="$(HOOK_INPUT="$input" node -e \
  'process.stdout.write(String(JSON.parse(process.env.HOOK_INPUT).stop_hook_active === true))')"
[ "$stop_hook_active" = "true" ] && exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 1

# Without origin/main (a fresh clone, another remote name) only uncommitted changes count.
base="$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)"
changed="$({ git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u)"

# Fingerprint of the code as git sees it: the base, every change against it, and the name and
# content of every untracked file. A turn that changed nothing (Claude only answered a question)
# matches the last passing run and skips the 12-25 s of checks.
marker=".claude/.stop-check-passed"
fingerprint="$({
  echo "$base"
  git diff "$base"
  git ls-files --others --exclude-standard
  git ls-files --others --exclude-standard -z | xargs -0 -r git hash-object --
} | git hash-object --stdin)"
[ -f "$marker" ] && [ "$(cat "$marker")" = "$fingerprint" ] && exit 0

run_api=0
run_web=0
run_triage=0
unmapped=()
while IFS= read -r path; do
  case "$path" in
    # env-example.spec.ts reads the env tables in these two docs.
    apps/api/* | docs/development.md | docs/production.md) run_api=1 ;;
    apps/web/*) run_web=1 ;;
    # Both apps compile against the shared package, so both re-check.
    packages/shared/*) run_api=1; run_web=1 ;;
    packages/ci-triage/*) run_triage=1 ;;
    apps/* | packages/*) unmapped+=("$path") ;;
  esac
done <<< "$changed"

failures=""

# Run one command; on failure, append its exit code and the tail of its output to $failures.
check() {
  local output status
  output="$("$@" 2>&1)"
  status=$?
  [ "$status" -eq 0 ] && return
  failures+=$'\n'"== $* (exit $status) =="$'\n'
  failures+="$(printf '%s\n' "$output" | tail -n "$MAX_LINES_PER_FAILURE")"$'\n'
}

if [ "$run_api" = 1 ]; then
  check pnpm --filter api lint
  check pnpm --filter api typecheck
  check pnpm --filter api test env-example prisma-enum-sync
fi
if [ "$run_web" = 1 ]; then
  check pnpm --filter web lint
  check pnpm --filter web typecheck
  check pnpm --filter web test alias-sync
fi
if [ "$run_triage" = 1 ]; then
  check pnpm --filter @guild/ci-triage lint
  check pnpm --filter @guild/ci-triage typecheck
fi
for path in "${unmapped[@]}"; do
  failures+=$'\n'"== $path: no workspace mapped; add one to .claude/hooks/check-on-stop.sh =="$'\n'
done

if [ -z "$failures" ]; then
  # Only a passing run is remembered, so a failure is reported again on the next stop.
  printf '%s\n' "$fingerprint" > "$marker"
  exit 0
fi

printf 'Convention check failed. Fix these before finishing:\n%s' "$failures" >&2
exit 2
```

- [ ] **Step 2: Kiểm tay `check-on-stop.sh` (spec §5)**

Làm trước: thêm `.claude/.stop-check-passed` vào `.gitignore` (dưới dòng 54), để marker không tự lọt vào danh sách file chưa track. Xoá marker cũ nếu có: `command rm -f .claude/.stop-check-passed`.

Chạy từ root repo, với `export CLAUDE_PROJECT_DIR="$PWD"`. Lúc này branch đã có file của Task 1-3, nên
api và web đều chạy. Mỗi dòng: làm thay đổi tạm, chạy lệnh, xem exit code, hoàn tác.

```bash
run_hook() { echo "{\"stop_hook_active\":$1}" | .claude/hooks/check-on-stop.sh; echo "exit=$?"; }
```

| # | Thay đổi tạm | Lệnh | Kỳ vọng |
|---|---|---|---|
| 1 | không | `time run_hook false` | `exit=0`, chạy đủ check. Ghi thời gian. `.claude/.stop-check-passed` được tạo |
| 2 | không | `run_hook true` | `exit=0` ngay, không chạy pnpm |
| 3 | thêm `export const x = fetch("/x");` vào cuối `apps/web/components/providers.tsx` | `run_hook false` | `exit=2`, stderr có dòng mở đầu nguyên văn và tên file `providers.tsx` |
| 4 | thêm `NEW_KEY=` vào `apps/api/.env.example` | `run_hook false` | `exit=2`, stderr có `NEW_KEY: in .env.example but not in envSchema` |
| 5 | xoá hàng `` | `PORT` | `` trong `docs/development.md` | `run_hook false` | `exit=2`, stderr có `PORT: no table row in docs/development.md` |
| 6 | `mkdir -p packages/zz && touch packages/zz/a.ts` | `run_hook false` | `exit=2`, stderr có `packages/zz/a.ts: no workspace mapped` |
| 7 | không | `git merge-base HEAD origin/khong-co 2>/dev/null \|\| git rev-parse HEAD` | in SHA của `HEAD`: biểu thức fallback của dòng `base=` chạy đúng khi ref không tồn tại (Review Focus 3) |
| 8 | không (ngay sau dòng 1, hoặc sau khi hoàn tác dòng 3-6) | `time run_hook false` | `exit=0` dưới 1 s, không chạy pnpm: dấu vân tay trùng marker |
| 9 | như dòng 4 | `run_hook false` hai lần liên tiếp | Cả hai lần `exit=2`: lần fail không ghi marker, nên lỗi không bị bỏ qua |
| 10 | sửa nội dung một file chưa track (ví dụ thêm dòng trống vào `apps/web/__tests__/alias-sync.test.ts` trước khi `git add`) | `run_hook false` | Chạy lại đủ check (mất vài giây), không exit ngay |

Hoàn tác sau mỗi dòng: `git checkout -- <file>`; dòng 6: `command rm -f packages/zz/a.ts && rmdir packages/zz`; dòng 10: xoá dòng trống vừa thêm.
Kết thúc: `git status --short` chỉ còn file của plan này.

Đo thời gian theo workspace cho PR body (spec §5, dòng `[unknown: chưa đo]`):

```bash
time (pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test env-example prisma-enum-sync)
time (pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test alias-sync)
```

- [ ] **Step 3: Viết `format-on-edit.sh`**

```bash
#!/usr/bin/env bash
# PostToolUse hook (Edit|Write): run Prettier on the file Claude just wrote when its workspace's CI
# job runs `format:check` (apps/api, packages/ci-triage), so a formatting slip is fixed now rather
# than after a push.
#
# Wiring: registered as a PostToolUse hook (matcher "Edit|Write") in .claude/settings.json.
# Never blocks: always exits 0. The tool already ran, so there is nothing left to stop.
set -uo pipefail

input="$(cat)"
# Claude Code always sends an absolute path for file tools.
file_path="$(HOOK_INPUT="$input" node -e \
  'process.stdout.write(JSON.parse(process.env.HOOK_INPUT).tool_input?.file_path ?? "")')"

case "$file_path" in
  "$CLAUDE_PROJECT_DIR"/apps/api/src/*.ts) workspace=api ;;
  "$CLAUDE_PROJECT_DIR"/packages/ci-triage/src/*.ts) workspace=@guild/ci-triage ;;
  *) exit 0 ;;
esac

# Prettier fails on a file it cannot parse. That is swallowed on purpose: the lint run in
# check-on-stop.sh reports the same syntax error with a better message.
pnpm --filter "$workspace" exec prettier --write "$file_path" >/dev/null 2>&1 || true
exit 0
```

- [ ] **Step 4: Kiểm tay `format-on-edit.sh`**

```bash
export CLAUDE_PROJECT_DIR="$PWD"
fmt() { echo "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$PWD/$1\"}}" | .claude/hooks/format-on-edit.sh; echo "exit=$?"; }
```

| # | Thay đổi tạm | Lệnh | Kỳ vọng |
|---|---|---|---|
| 1 | đổi `import { z } from 'zod';` thành `import {z} from "zod"` ở `apps/api/src/config/env.validation.ts` | `fmt apps/api/src/config/env.validation.ts` | `exit=0`, `git diff` của file đó rỗng |
| 2 | cùng kiểu, ở `packages/ci-triage/src/cli.ts` | `fmt packages/ci-triage/src/cli.ts` | `exit=0`, `git diff` rỗng |
| 3 | thêm `const  x=1` (hai dấu cách) vào cuối `apps/web/lib/utils.ts` | `fmt apps/web/lib/utils.ts` | `exit=0`, file **vẫn** giữ thay đổi (web ngoài phạm vi) |
| 4 | thêm `const x = ;` vào cuối `apps/api/src/config/cors.ts` | `fmt apps/api/src/config/cors.ts` | `exit=0`, file giữ nguyên lỗi cú pháp |

Hoàn tác mỗi dòng bằng `git checkout -- <file>`.

- [ ] **Step 5: Đăng ký hai hook**

`.claude/settings.json`, thay toàn bộ bằng:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/pre-push-review-gate.sh\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/format-on-edit.sh\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/check-on-stop.sh\"",
            "timeout": 300
          }
        ]
      }
    ]
  }
}
```

Kiểm tra:

```bash
node -e 'JSON.parse(require("fs").readFileSync(".claude/settings.json","utf8"))' && echo ok
chmod +x .claude/hooks/check-on-stop.sh .claude/hooks/format-on-edit.sh
git ls-files -s .claude/hooks   # sau git add: mode 100755 cho cả ba script
```

Hook mới chỉ có hiệu lực ở session sau, hoặc sau khi user duyệt trong `/hooks`. Không cần chạy thử
trong session này; Step 2 và Step 4 đã gọi script trực tiếp.

---

### Task 5: Doc và spec

**Files:**
- Modify: `README.md:142-146`
- Modify: `CLAUDE.md:50-51`
- Modify: `apps/api/CLAUDE.md:66-68`
- Modify: `apps/web/CLAUDE.md:41-44`
- Modify: `apps/web/docs/frontend.md:161-162`
- Modify: `docs/development.md:300-301`
- Modify: `docs/custom-spec/2026-10-10-ac3-convention-checks-design.md`

Doc thường viết tiếng Anh; spec trong `docs/custom-spec/` viết tiếng Việt.

- [ ] **Step 1: `README.md`** - sau đoạn "**Self-review before pushing.** …" (kết thúc dòng 146), thêm:

```markdown
**Checks before Claude stops.** `.claude/settings.json` also registers a Stop hook
(`.claude/hooks/check-on-stop.sh`): when a Claude Code turn ends with changes under `apps/` or
`packages/`, it runs `lint`, `typecheck` and the drift specs of each touched workspace, and hands any
failure back to Claude instead of stopping. A turn that changed nothing since the last passing run
skips the checks (fingerprint in `.claude/.stop-check-passed`, git-ignored). A PostToolUse hook runs Prettier on every `apps/api` and
`packages/ci-triage` TypeScript file Claude edits. Both are conveniences, not gates: CI runs the same
checks on every pull request.
```

- [ ] **Step 2: `CLAUDE.md:50-51`** - thay bằng:

```markdown
- A new API variable means **both** `src/config/env.validation.ts` and `.env.example`, then the tables
  in development.md §3 and production.md §3; `src/config/__tests__/env-example.spec.ts` fails when
  they drift.
```

- [ ] **Step 3: `apps/api/CLAUDE.md:66-68`** - nối vào cuối bullet:

```markdown
  enums in step with `@guild/shared/enums` (`src/__tests__/prisma-enum-sync.spec.ts` fails when they
  drift; it reads the generated client, so regenerate before trusting a local run).
```

(Thay cụm "enums in step with `@guild/shared/enums`." hiện có bằng hai dòng trên.)

- [ ] **Step 4: `apps/web/CLAUDE.md:41-44`** - câu cuối bullet `@/*` đổi thành:

```markdown
  `tsconfig.json` and `vitest.config.ts` — and `__tests__/alias-sync.test.ts` fails when the two drift.
```

`apps/web/docs/frontend.md:161-162` đổi thành:

```markdown
`@/*` is the app's own alias and is unrelated. It is declared twice, in `tsconfig.json` and in
`vitest.config.ts`; `__tests__/alias-sync.test.ts` fails when a new alias is missing from either.
```

- [ ] **Step 5: `docs/development.md:300-301`** - bước 3 của "Changing the database schema" đổi thành:

```markdown
3. Enums in the schema must **keep matching values** with `packages/shared/enums` —
   `src/__tests__/prisma-enum-sync.spec.ts` fails when they drift. Run `prisma:migrate` (which
   regenerates the client) before the test; it compares against the generated client.
```

- [ ] **Step 6: Spec AC3** - trong `docs/custom-spec/2026-10-10-ac3-convention-checks-design.md`:

- Dòng trạng thái: `**spec, đang triển khai (PR `chore/convention-checks`)**`.
- §1 bảng: `apps/web/vitest.config.ts:43-45` → `:48-52`; `apps/web/CLAUDE.md:37-40` → `:41-44`.
- §4.1 bullet doc: thay "dạng `` `KEY` ``. Check này lỏng…" bằng "dạng hàng bảng `` | `KEY` | ``.
  Nhắc trong văn xuôi không tính, vì `DATABASE_URL` và `AUTH_SECRET` xuất hiện nhiều lần ngoài bảng."
  Thêm bullet: "Mỗi key trong `ENV_EXAMPLE_ONLY` phải còn trong `.env.example` và vẫn ngoài schema."
- §4.1 bullet enum: thêm "So với client đã generate, nên sau khi sửa schema phải generate lại trước
  khi tin kết quả local. CI cài lại từ đầu nên luôn đúng."
- §4.2 bước 3: thêm "`docs/development.md`, `docs/production.md` → `api`" và "file trong `apps/*`
  hoặc `packages/*` không map được → một dòng lỗi, không bỏ qua."
- §4.2 bước 5: thêm "Output mỗi lệnh lỗi giữ 60 dòng cuối."
- §4.3: matcher thêm `packages/ci-triage/src/**/*.ts` → `pnpm --filter @guild/ci-triage exec prettier`.
  Thêm câu: "Lint của api và ci-triage đã gồm `eslint-plugin-prettier`, nên Stop hook vẫn bắt lỗi
  format khi file đổi qua Bash."
- §5 dòng thời gian: thay `[unknown: chưa đo]` bằng số đo ở Task 4 Step 2.
- §6: cập nhật ước tính theo diff thật (`git diff --stat main`).

---

### Task 6: Kiểm chứng cuối, commit, review, PR

**Files:** không có file mới.

- [ ] **Step 1: Bộ check đầy đủ**

```bash
pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test
pnpm --filter web lint && pnpm --filter web typecheck && pnpm --filter web test
echo '{"stop_hook_active":false}' | CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/check-on-stop.sh; echo "exit=$?"
git diff --stat main
```

Kỳ vọng: mọi lệnh exit 0, hook `exit=0`, tổng dòng dưới 900 (ước tính ~450: spec ~260, hook ~110,
settings ~20, doc ~25, spec AC3 ~25).

- [ ] **Step 2: Commit**

```bash
git rev-parse --abbrev-ref HEAD   # phải in: chore/convention-checks
git status --short                # chỉ file trong plan này
```

Viết message bằng skill `caveman:caveman-commit` (luật global). Gợi ý subject:
`chore(config): add drift specs and stop hook for agent checks`. Body: ba drift spec, Stop hook,
PostToolUse Prettier, và các điểm "Bổ sung so với spec".

- [ ] **Step 3: Review**

Chạy skill `review-loop` (luật global): reviewer agent mới mỗi vòng, vòng cuối là `pr-review` trong
agent `reviewer` riêng. Gửi kèm phần Review Focus của plan này.

- [ ] **Step 4: Push và PR - hỏi user trước**

Push là hành động ra ngoài: mô tả một dòng và chờ user đồng ý. Điền đủ mọi mục của
`.github/pull_request_template.md`, kèm: bảng kiểm tay của Task 4 Step 2 và Step 4, thời gian hook
theo workspace, và thời gian một lần dừng bị bỏ qua nhờ marker (Task 4 Step 2 dòng 8). Dừng ở link PR.

---

## Self-review (lúc viết plan)

- Spec coverage: §4.1 env → Task 1; enum → Task 2; alias → Task 3; TDD case âm → case "dữ liệu giả" ở
  mỗi spec + bảng mutation ở Step 3 của Task 1-3; §4.2 (gồm D4 bản C: marker dấu vân tay) → Task 4 Step 1-2, 5; §4.3 → Task 4 Step 3-5;
  §5 → Task 1-3 Step 3, Task 4 Step 2; §6 → Task 6 Step 1; §7 → số đo ở đầu plan + Task 4 Step 2.
- Tên dùng chung: pattern test `env-example`, `prisma-enum-sync`, `alias-sync` (Task 1-3) khớp với
  lệnh trong `check-on-stop.sh` (Task 4). `ENV_EXAMPLE_ONLY` (Task 1) được doc trỏ tới ở Task 5.
- Không có placeholder. Hai chỗ để implementer quyết theo output thật: format Prettier (Task 1 Step 4)
  và cast `as AliasMap` (Task 3 Step 4), mỗi chỗ ghi rõ cách xử lý.
