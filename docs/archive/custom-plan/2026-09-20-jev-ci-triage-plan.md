# Jev CI triage — Implementation Plan

**Goal:** một lệnh `pnpm --filter ci-triage triage` và một job `Triage` không chặn merge, cả hai gọi
`typesafe-ai/jev` qua Vercel AI Gateway để phân loại nguyên nhân khi CI đỏ.

**Architecture:** một package công cụ `packages/ci-triage` (`@guild/ci-triage`, private, không app nào
import, không build step — Node 24 chạy thẳng TypeScript). Một job mới trong `.github/workflows/ci.yml`
chạy `if: failure()`. Không một dòng code sản phẩm nào đổi.

**Spec:** [`docs/custom-spec/2026-09-20-jev-ci-triage-design.md`](../custom-spec/2026-09-20-jev-ci-triage-design.md)

**Nhánh:** `feat/jev-ci-triage`

## Năm điểm phải làm đúng

1. **Job `triage` không bao giờ được làm CI đỏ.** Nó chạy `if: failure()`, tức là đã có thứ khác đỏ
   rồi. Nếu bản thân nó cũng đỏ, người đọc Actions thấy hai lỗi và phải phân biệt cái nào thật. Mọi
   nhánh lỗi — thiếu key, gateway 500, log rỗng — đều in một dòng rồi `exit 0`.
2. **Trong CI phải lấy log qua REST API theo từng job, không phải `gh run view --log-failed`.** Lúc
   job `triage` chạy, workflow run vẫn `in_progress`, và `gh run view --log-failed` từ chối một run
   chưa kết thúc. Dùng `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`, lọc
   `conclusion == 'failure'`, rồi `GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs` cho từng cái.
   Ở local thì ngược lại: run đã xong, `gh run view --log-failed` là đường ngắn nhất.
3. **Redact chạy trước truncate, không phải sau.** Cắt trước rồi mới che nghĩa là phần bị cắt bỏ chưa
   bao giờ được kiểm — không sao nếu nó bị vứt đi, nhưng thứ tự ngược lại dễ bị đảo khi refactor và
   không có gì báo. Thứ tự đúng còn khiến test redact chạy trên toàn bộ đầu vào.
4. **`packages/ci-triage/**` phải vào một path filter mới.** `changes` job hiện chỉ có `api`, `web`,
   `global`. Không thêm filter thì một commit chỉ đụng công cụ sẽ không kích hoạt job nào — lint và
   typecheck của nó không bao giờ chạy, và nó mục ra trong im lặng.
5. **Không dùng `enum`, `namespace`, parameter property.** Node 24 strip type chứ không transpile;
   ba thứ đó cần sinh mã runtime và sẽ ném `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. Dùng union type
   của string literal và `const` object thay cho `enum`.

## Global Constraints

- Không đụng `apps/api/src`, `apps/web`, `packages/shared`, `prisma/`.
- Không đụng `package.json` ở root — nó là marker cho Dependabot, không phải package.
- Không thêm dependency ngoài `ai@^7`. Test runner dùng `node --test` có sẵn.
- Comment và code tiếng Anh. Tài liệu trong `docs/custom-spec` và `docs/custom-plan` tiếng Việt.
  `ci.yml` đang comment tiếng Anh → giữ tiếng Anh.
- `AI_GATEWAY_API_KEY` là secret. Giá trị thật chỉ ở `.env.local` (đã git-ignore) và GitHub secret.
  Không giá trị thật nào vào git, không in ra log, kể cả một phần.
- Doc comment tiếng Anh cho mọi hàm export.
- Job mới **không** được thêm vào ruleset required checks của `main`.

---

### Task 1: Khung package

**Files:** `packages/ci-triage/package.json`, `packages/ci-triage/tsconfig.json`,
`packages/ci-triage/eslint.config.mjs`, `packages/ci-triage/README.md`

- [x] `package.json`: `"name": "@guild/ci-triage"`, `"private": true`, `"type": "module"`,
      `"engines": { "node": "24.x" }`. Không `main`, không `exports` — không ai import nó.
- [x] Scripts: `triage` → `node src/cli.ts`; `typecheck` → `tsc --noEmit -p tsconfig.json`;
      `lint` → `eslint "src/**/*.ts"`; `format:check` → `prettier --check "src/**/*.ts"`;
      `test` → `node --test "src/**/__tests__/*.test.ts"`.
      **Không có `build`.** Đặt tên script theo đúng bộ đang dùng ở `apps/api` để câu lệnh CI đọc
      quen mắt.
- [x] `dependencies`: `"ai": "^7.0.107"`. Không `@ai-sdk/gateway` — chuỗi model
      `'typesafe-ai/jev'` truyền thẳng cho `evaluate()` đã đi qua gateway, provider instance chỉ cần
      khi phải đổi cấu hình provider.
- [x] `devDependencies`: `typescript@^5.8.0`, `eslint`, `prettier`, `@types/node`,
      `typescript-eslint`, `@eslint/js`, `globals` — cùng version với `apps/api`.
      **Sửa 2026-09-20 lúc hiện thực:** kế hoạch ban đầu ghi `typescript@^7.0.2` theo
      `packages/shared`. Không dùng được: `typescript-eslint@8` từ chối chạy với TS 7
      (*"typescript-eslint does not support TS 7.0"*), và `packages/shared` không lint nên nó
      không vấp phải. `erasableSyntaxOnly` có từ 5.8, nên ^5.8.0 vừa đủ.
- [x] `tsconfig.json`: `"module": "nodenext"`, `"moduleResolution": "nodenext"`,
      `"target": "es2024"`, `"strict": true`, `"noEmit": true`,
      `"allowImportingTsExtensions": true`, `"erasableSyntaxOnly": true`,
      `"verbatimModuleSyntax": true`, `"types": ["node"]`.
      `erasableSyntaxOnly` biến điểm số 5 thành lỗi biên dịch thay vì lỗi runtime.
      `"types": ["node"]` là bắt buộc, không phải tuỳ chọn: thiếu nó thì `tsc` không thấy
      `process` hay `node:child_process` dù `@types/node` đã cài.
- [x] `eslint.config.mjs`: `recommendedTypeChecked` + `projectService`, `no-console` tắt (đây là
      CLI), và một block riêng cho `src/**/__tests__/**` tắt
      `@typescript-eslint/no-floating-promises` — `describe`/`it` của `node:test` trả promise mà
      chính test runner await; `await` bằng tay không đổi gì và làm mọi test ồn hơn.
- [x] `README.md`: ba dòng — công cụ này làm gì, không làm gì, trỏ tới `docs/ci-triage.md`.
- [x] `pnpm install` ở root. Xác nhận `pnpm --filter ci-triage typecheck` chạy được (chưa có source
      thì nó xanh rỗng, đủ để biết cấu hình đúng).

### Task 2: `questions.ts` — bốn câu hỏi dưới dạng dữ liệu

**Files:** `packages/ci-triage/src/questions.ts`

- [x] Export `TRIAGE_QUESTIONS` đúng shape `experimental_evaluate` đòi: `category` (`choice`, 7 nhãn),
      `ownerApp` (`choice`, 5 nhãn), `rerunLikelyGreen` (`boolean` kèm `criteria.true`/`criteria.false`),
      `blastRadius` (`score`, mảng 4 nhãn thấp→cao). Nội dung lấy từ spec §4.
- [x] `instructions` và `criteria` viết **cho repo này**, không chung chung: nhắc tên các job thật
      (`Backend test`, `SonarQube`, `Build web`), nhắc `prisma migrate`, nhắc pnpm workspace. Jev
      chấm trên state được cung cấp; criteria càng cụ thể với ngữ cảnh thì phân phối xác suất càng
      tách bạch.
- [x] Export ba hằng số ngưỡng: `CONFIDENT_AT = 0.7`, `UNCERTAIN_AT = 0.45`, và
      `MAX_STATE_CHARS = 40_000`, `MAX_LINES_PER_JOB = 200`. Một chỗ duy nhất, có tên — không rải
      số trần trong `render.ts` hay `collect.ts`.
- [x] Union type `TriageCategory` và `OwnerApp` suy ra từ khoá của `criteria`, để thêm một nhãn mà
      quên xử lý nó thành lỗi biên dịch.

### Task 3: `redact.ts`

**Files:** `packages/ci-triage/src/redact.ts`, `packages/ci-triage/src/__tests__/redact.test.ts`

- [x] Hàm `redact(text: string): string`, thuần, không I/O. Doc comment tiếng Anh nêu rõ đây là
      **best effort**, không phải bảo đảm — và vì sao (§5 của spec).
- [x] Các mẫu theo spec §5: tên biến nhạy cảm (danh sách khoá cứng cộng hậu tố `_TOKEN|_SECRET|_KEY|_PASSWORD`),
      connection string, JWT ba đoạn, chuỗi dài ≥32 ký tự sau `=` hoặc `:`, `Authorization: Bearer …`.
- [x] Thay bằng `[redacted]`, giữ nguyên tên biến ở vế trái để dòng log còn đọc được
      (`DATABASE_URL=[redacted]`, không phải `[redacted]`).
- [x] Test (viết **trước** implementation): dựng một khối log chứa từng loại secret, khẳng định không
      mẩu giá trị nào còn sót. Thêm một test ngược: một dòng stack trace bình thường và một dòng
      `expect(received).toBe(expected)` phải **không** bị đụng — công cụ che quá tay thì Jev mất
      chính cái tín hiệu cần để phân loại.
- [x] `pnpm --filter ci-triage test` xanh.

### Task 4: `collect.ts` — gom state

**Files:** `packages/ci-triage/src/collect.ts`, `packages/ci-triage/src/__tests__/collect.test.ts`

- [x] Tách hai tầng: các hàm thuần (`truncateTail`, `buildState`) và các hàm chạm `gh`/HTTP
      (`fetchFailedJobsLocal`, `fetchFailedJobsCI`). Chỉ tầng thuần có test.
- [x] `truncateTail(log, maxLines, maxChars)`: giữ **đuôi**, không phải đầu. Khi cắt, chèn một dòng
      `… <n> dòng đầu đã lược …` ở trên để người đọc JSON không tưởng đó là toàn bộ log.
- [x] `buildState(jobs, changedFiles)`: gọi `redact` trên log **trước** khi gọi `truncateTail`
      (điểm 3). Trả về `TriageState` đúng shape spec §3.
- [x] `fetchFailedJobsLocal`: `gh run list --branch <branch> --status failure --limit 1 --json databaseId,headSha`
      → không có thì trả `null` (caller in "nhánh này chưa có run đỏ nào" và thoát 0) →
      `gh run view <id> --log-failed`.
- [x] `fetchFailedJobsCI`: `gh api /repos/{owner}/{repo}/actions/runs/{runId}/jobs --paginate`,
      lọc `conclusion === 'failure'`, rồi `gh api /repos/{owner}/{repo}/actions/jobs/{id}/logs` cho
      từng job. Dùng `gh api` thay vì `fetch` thủ công để thừa hưởng auth của `GH_TOKEN`/`GITHUB_TOKEN`
      mà không tự dựng header.
- [x] `changedFiles`: `git diff --name-only origin/main...HEAD`. Chỉ tên, không nội dung. Lỗi git
      (không có `origin/main`) → mảng rỗng, không ném.
- [x] Test `truncateTail`: 5.000 dòng vào → ≤200 dòng ra, ≤40.000 ký tự, và dòng cuối cùng của đầu
      vào **có mặt** trong đầu ra. Đây là khẳng định quan trọng nhất của cả file — cắt nhầm đầu đuôi
      là lỗi âm thầm, kết quả vẫn "chạy được" nhưng vô dụng.

### Task 5: `evaluate.ts` — chỗ duy nhất biết tới Jev

**Files:** `packages/ci-triage/src/evaluate.ts`

- [x] `import { experimental_evaluate as evaluate } from 'ai'`. Comment tiếng Anh một dòng: API còn
      mang tiền tố `experimental_`, đổi shape thì đây là file duy nhất phải sửa.
- [x] Hàm `runTriage(state, { fetchAnswers })` nhận đường gọi qua tham số. Mặc định là hàm gọi Jev
      thật; test truyền vào một hàm trả về answer cố định. Không mock module, không
      `if (process.env.NODE_ENV === 'test')`.
- [x] Request: `model: 'typesafe-ai/jev'`, `state`, `questions: TRIAGE_QUESTIONS`,
      `providerOptions: { gateway: buildGatewayOptions(process.env) }`.
- [x] **Sửa 2026-09-20:** kế hoạch ban đầu gửi `zeroDataRetention: true` vô điều kiện. Trang
      pricing của AI Gateway xếp *per-request zero data retention* vào **Pro and Enterprise**, còn
      *per-request `only` filter* mới là **All plans**. Tài khoản của dự án là Hobby. Tách thành
      `buildGatewayOptions(env)` thuần: `only` luôn gửi, `zeroDataRetention` bật qua
      `CI_TRIAGE_ZERO_DATA_RETENTION=1`, mặc định tắt. Bốn test cho hàm này.
- [x] Trả về `result.answers` **nguyên vẹn** cộng `result.usage` và
      `result.providerMetadata?.gateway?.cost`. Không bọc lại, không đổi tên khoá (spec §7).
- [x] Thiếu `AI_GATEWAY_API_KEY` → ném một lỗi có tên rõ, `cli.ts` bắt và in một dòng hướng dẫn rồi
      thoát 0. Kiểm ở đây, không để SDK ném một lỗi khó đọc từ trong ruột nó.

### Task 6: `cache.ts`

**Files:** `packages/ci-triage/src/cache.ts`

- [x] Đọc/ghi `node_modules/.cache/triage/<runId>.json` trong chính package. `node_modules` đã được
      git bỏ qua, nên không cần thêm dòng nào vào `.gitignore`.
- [x] Lỗi đọc file (hỏng, JSON sai) → coi như không có cache, gọi Jev lại. `catch` rỗng ở đây phải
      ghi rõ nó nuốt cái gì, theo quy ước của repo.
- [x] `--no-cache` bỏ qua cả đọc lẫn ghi.
- [x] Không có TTL: một `run_id` là bất biến, kết quả của nó không bao giờ cũ đi.

### Task 7: `render.ts` — hai bản in

**Files:** `packages/ci-triage/src/render.ts`, `packages/ci-triage/src/__tests__/render.test.ts`

- [x] `renderHuman(result)`: đúng bố cục spec §7. **Luôn in xác suất cạnh mọi nhãn** — không bao giờ
      in một nhãn trần, vì nhãn trần đọc như sự thật.
- [x] Ba mức tin cậy theo `CONFIDENT_AT` / `UNCERTAIN_AT` (spec §8). Dưới `UNCERTAIN_AT` thì in
      `không kết luận được` kèm hai nhãn xác suất cao nhất, và **không** in gợi ý hành động.
- [x] **`probabilities` là optional trong type của SDK** (`EvaluationAnswer` khai
      `probabilities?`), cho cả `choice` lẫn `score`. Thiếu phân phối thì không phân biệt được câu
      trả lời chắc với một lần tung đồng xu → in nhãn kèm `(không có xác suất)` và xếp vào mức
      không chắc, không gợi ý hành động.
- [x] Bảng gợi ý hành động theo `category`, `switch` trên union type, nhánh cuối gọi `assertNever` —
      thêm nhãn mới mà quên gợi ý thì gãy lúc biên dịch.
- [x] `renderJson(result)`: shape spec §7, in ra stdout, không màu, không dòng thừa.
- [x] Test: ba xác suất mẫu (0.9 / 0.55 / 0.3) cho ra ba dạng in khác nhau; `renderJson` parse lại
      được và có đủ khoá.

### Task 8: `cli.ts`

**Files:** `packages/ci-triage/src/cli.ts`

- [x] Cờ: `--json`, `--no-cache`, `--run <id>` (chạy lại trên một run cũ — đây là cách thử công cụ
      mà không cần đợi CI đỏ lần nữa).
- [x] Tự nhận ngữ cảnh: có `GITHUB_ACTIONS` trong env → đường CI (đọc `GITHUB_RUN_ID`); không có →
      đường local (tìm run đỏ gần nhất của nhánh hiện tại).
- [x] Guard clause cho mọi nhánh thoát sớm: không có run đỏ, không có job đỏ, log rỗng, thiếu key.
      Mỗi nhánh in một dòng và `exit 0`. Happy path giữ ở một mức thụt lề.
- [x] **Không in state đã gửi**, kể cả khi `--json`. State là log đã redact, nhưng redact là best
      effort và in nó ra lần nữa chỉ nhân đôi bề mặt rò rỉ mà không thêm giá trị.
- [x] Ở CI, ghi `renderHuman` vào `$GITHUB_STEP_SUMMARY` nếu biến đó có mặt.

### Task 9: Job `triage` trong CI

**Files:** `.github/workflows/ci.yml`

- [x] Thêm filter `tooling: - 'packages/ci-triage/**'` vào `changes`, và output `tooling` tương ứng
      (điểm 4). `global` đã có `.github/**` nên không cần đụng.
- [x] Job `tooling-check`: `needs: [changes]`, `if: needs.changes.outputs.tooling == 'true'`, chạy
      `lint`, `format:check`, `typecheck`, `test` của `ci-triage`. Một job cho cả bốn — công cụ nhỏ,
      tách bốn job chỉ tốn runner.
- [x] Job `triage`:
      - `needs: [backend-test, frontend-test, quality-api, quality-web, sonarqube, build-api, build-web]`
        (tên job id lấy đúng từ file, không đoán).
      - `if: failure()` — **không** `always()`, vì `always()` cũng chạy khi bị cancel, và một run bị
        huỷ giữa chừng không có gì để phân loại.
      - `permissions: { actions: read, contents: read, pull-requests: write }`.
        `actions: read` để đọc log job; `pull-requests: write` để comment.
      - `continue-on-error: true` **và** CLI tự `exit 0`. Hai lớp, vì lớp thứ nhất không cứu được
        một bước `run` gãy trước khi tới CLI.
      - env: `AI_GATEWAY_API_KEY: ${{ secrets.AI_GATEWAY_API_KEY }}`,
        `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.
- [x] Comment tiếng Anh ở đầu job, theo giọng các comment đang có trong `ci.yml`: job này chẩn đoán,
      không phải cổng; nó không bao giờ đỏ; nó không nằm trong ruleset.
- [x] Bước comment PR: chỉ khi `github.event_name == 'pull_request'`. Tìm comment cũ mang marker
      `<!-- ci-triage -->` rồi cập nhật tại chỗ, không tạo comment mới mỗi lần.

### Task 10: Secret và biến môi trường

**Files:** `.env.example`

- [x] Thêm `AI_GATEWAY_API_KEY=` (rỗng) kèm một dòng comment tiếng Anh nói nó chỉ dùng cho
      `packages/ci-triage`, không phải biến runtime của app nào.
- [x] **Cần người dùng làm tay** — không tự động hoá được, và không nên:
      1. `gh secret set AI_GATEWAY_API_KEY` cho repo (hoặc thêm qua UI Settings → Secrets → Actions).
      2. Dán key vào `.env.local` ở root để chạy local.
      Xác nhận `.gitignore` đã bắt `.env.local` trước khi dán.
- [x] Xác nhận không có giá trị thật nào trong `git diff` trước commit.
- [x] **Bổ sung 2026-09-20:** script `triage` đổi thành
      `node --env-file-if-exists=../../.env.local src/cli.ts`. Kế hoạch không nói ai nạp
      `.env.local` — để lập trình viên `export` bằng tay là một bước thừa và một chỗ quên. Node 24
      có sẵn cờ này, nên không thêm `dotenv`; `--env-file-if-exists` bỏ qua file vắng mặt, nên CI
      không cần nhánh riêng.

### Task 11: Tài liệu

**Files:** `docs/ci-triage.md`, `docs/architecture.md`, `docs/development.md`, `CLAUDE.md`

- [x] `docs/ci-triage.md` mới, tiếng Anh theo đúng giọng `development.md`/`production.md`, gồm:
      Jev dùng để làm gì · **không** thay gì · biến môi trường · lệnh local · job CI chạy khi nào và
      vì sao nó không bao giờ đỏ · bốn câu hỏi và cách đọc xác suất · redaction là best effort ·
      cách tắt (xoá secret là xong) · cách gỡ hẳn (xoá thư mục, xoá hai job, xoá một dòng
      `.env.example`).
- [x] `docs/architecture.md`: thêm `packages/ci-triage/` vào sơ đồ §2; một dòng vào bảng §7
      (*"Một công cụ chỉ dành cho lập trình viên hoặc CI"* → `packages/<tool>`, không phải `apps/`);
      một câu ở §8 nói rõ Jev **không** phải cổng chất lượng thứ mười.
- [x] `docs/development.md`: một mục ngắn cho `pnpm --filter ci-triage triage` cạnh các lệnh khác.
- [x] `CLAUDE.md`: một dòng trỏ tới `docs/ci-triage.md` trong mục "Read before writing code".
- [x] **Bổ sung 2026-09-20:** `development.md` §8 ghi *"eight required checks in total"* trong khi
      `production.md` §6 và `CLAUDE.md` đều ghi chín — cổng SonarQube thêm vào mà không cập nhật
      chỗ này. Sửa thành `nine`. Không liên quan tới Jev, nhưng thấy thì sửa.
- [x] Xoá `jev-setup-document.md` ở root — nó là prompt đầu vào, không phải tài liệu dự án, và nó mô
      tả một kiến trúc (Jev làm code review) mà spec này đã kết luận là sai với năng lực của Jev.

### Task 12: Xác minh

- [x] `pnpm --filter ci-triage lint`, `format:check`, `typecheck`, `test` — cả bốn xanh (20 test).
- [x] `pnpm --filter api test` (560 passed), `pnpm --filter web test` (856 passed, 116 file).
- [x] **Gọi Jev thật một lần**, từ local, với `AI_GATEWAY_API_KEY` trong shell:
      `pnpm --filter ci-triage triage --run <id một run đỏ có thật>`.
      Ghi lại vào phần dưới: nhãn trả về, xác suất, `inputTokens`, `cost`. Không dán key, không dán
      log gốc.
- [x] Kiểm một nhánh lỗi: bỏ `AI_GATEWAY_API_KEY` khỏi shell, chạy lại, xác nhận in một dòng và
      `echo $?` ra `0`. Chạy trên run `35491329247` (một PR Dependabot đỏ có thật), toàn bộ đường
      `gh run view --log-failed` → `parseRunLog` → `redact` → `buildState` chạy thật, dừng đúng chỗ
      thiếu key, exit `0`.
- [x] Đọc lại `git diff` nguyên vẹn, tìm chuỗi giống key. Chỉ sau đó mới commit.
- [ ] Mở PR, để CI chạy. Nếu mọi thứ xanh thì job `triage` bị bỏ qua — đó là hành vi đúng. Muốn thấy
      nó chạy thì push tạm một commit làm đỏ một test, xem kết quả, rồi revert.

**Kết quả gọi thật** — 2026-09-20, sau khi thêm payment method vào scope Vercel.

Chạy trên `35491329247`, một PR Dependabot (`npm_and_yarn in /apps/web`) đã đỏ thật:

```
run id            35491329247
category          dependency  (0.90)
ownerApp          ci_infra    (0.99)
rerunLikelyGreen  0.13
blastRadius       1.9 / 3   (probabilities 0:0.12 1:0.11 2:0.52 3:0.25)
inputTokens       16442
cost              "0"   (free credit, gateway không tính tiền)
```

Phân loại đúng: đây là một PR cập nhật lockfile, không phải lỗi code của app nào, và chạy lại cùng
commit sẽ không xanh — `rerunLikelyGreen` 0.13 nói đúng điều đó. Gợi ý in ra là nhánh `dependency`.

Một điểm đáng ghi: `cost` trả về `"0"` chứ không phải một số dương. Free tier không tính tiền, nên
dòng chi phí hiện `$0.000000`. Không phải lỗi format — `renderCost` in đúng thứ gateway trả về.

Cache hoạt động: lần chạy thứ hai đọc
`packages/ci-triage/node_modules/.cache/triage/35491329247.json`, không gọi Jev lần nữa.

## Ngoài phạm vi đợt này

- Bộ case đo độ chính xác (`cases/*.json` + `pnpm --filter ci-triage eval`) — spec §"Bộ case".
  Cần log thật tích luỹ dần.
- Dùng Jev cho bất cứ việc gì khác: chọn độ sâu review, phân loại issue, gác tool call. Bàn sau, khi
  đã có số liệu về việc nó đoán đúng bao nhiêu trên chính repo này.
- Đưa `triage` vào ruleset required checks. Không, và spec ghi rõ lý do.
