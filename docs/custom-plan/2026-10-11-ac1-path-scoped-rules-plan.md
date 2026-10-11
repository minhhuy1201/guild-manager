# AC1 - Luật nạp theo path - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task (inline, theo `CLAUDE.md` project). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Luật cho agent nằm trong `.claude/rules/<vùng>/*.md` có `paths`, nạp khi agent đụng file
khớp glob. Root `CLAUDE.md` chỉ giữ thứ đúng cho mọi task, cộng một bảng tra "khi làm X, đọc Y".
Mỗi luật có đúng một chỗ ở.

**Architecture:** 11 rule file mới (6 web, 3 api, `shared.md`, `prisma.md`). `frontend.md` và
`backend.md` giữ heading, phần "vì sao", sơ đồ và ví dụ; câu luật đổi thành link tới rule file.
`apps/*/CLAUDE.md` rút còn stack, alias, bảng đặt tên và link tới rule. Xoá `rules/common/`.

**Tech Stack:** Claude Code project rules (`paths` frontmatter), Markdown. Không đổi code chạy.

**Spec:** [`docs/custom-spec/2026-10-10-ac1-path-scoped-rules-design.md`](../custom-spec/2026-10-10-ac1-path-scoped-rules-design.md)
(tổng quan: [`2026-10-10-agent-context-review-overview.md`](../custom-spec/2026-10-10-agent-context-review-overview.md))

## Global Constraints

- Branch `chore/path-scoped-rules`, tạo từ `main` mới nhất. **Một PR** cho cả AC1. User đã bỏ giới
  hạn 900 dòng (2026-10-11). Ước tính 1.300-1.700 dòng thay đổi.
- Quyết định đã chốt (2026-10-11): **D1** rule file là bản gốc, doc chỉ link. **D2** xoá cả hai file
  trong `rules/common/`. D3, D4, D5 theo đề xuất của spec.
- Rule file: tiếng Anh, mệnh lệnh, một ý mỗi bullet, không kể lịch sử (D4). Lý do dài ở lại doc.
- Không sửa file nguồn nào (`.ts`, `.tsx`, `.css`, `.mjs`). Code comment đang trỏ tới
  `frontend.md §6, Motion`, `§6, Tables`, `backend.md section 4`... (11 chỗ, xem
  `git grep -n -E 'frontend\.md|backend\.md' -- ':!*.md'`). Vì vậy **giữ nguyên mọi heading** của
  `frontend.md` và `backend.md`, để các link đó vẫn trỏ tới phần "vì sao".
- Block `<!-- BEGIN:nextjs-agent-rules -->` … `<!-- END:nextjs-agent-rules -->` trong
  `apps/web/CLAUDE.md` giữ **nguyên văn**. `next dev` ghi lại block này.
- `docs/architecture.md` ngoài phạm vi D1. Chỉ sửa hai link (Task 6). Phần trùng còn lại ghi ở
  Review Focus.
- Link từ rule file tới doc dùng đường dẫn tương đối, ví dụ từ `.claude/rules/web/x.md`:
  `../../../apps/web/docs/frontend.md`.

## Đã kiểm lúc viết plan (2026-10-11)

1. **Cú pháp và cách nạp** (sourced, [Memory docs](https://code.claude.com/docs/en/memory)):
   - "All `.md` files are discovered recursively, so you can organize rules into subdirectories."
   - "A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file."
     Vì vậy rủi ro spec §7 ("Write có kích hoạt không") đã có nguồn. Task 7 vẫn thử thực tế.
   - "`paths` is the only field Claude Code reads from a rule." Có thể viết dạng YAML list.
   - "If the YAML between the markers doesn't parse, Claude Code ignores the frontmatter and loads
     the rule as if it had no `paths`." Một lỗi YAML làm rule nạp mọi session, nên Task 7 kiểm.
2. **`InstructionsLoaded`** (sourced, [Hooks docs](https://code.claude.com/docs/en/hooks)): fire
   "when a CLAUDE.md or `.claude/rules/*.md` file is loaded into context", matcher theo load reason
   `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`. Tên field trong
   input JSON: chưa đọc được [unknown]. Probe ở Task 7 ghi cả JSON thô nên không cần biết trước.
3. **Stop hook không chặn** (verified, `.claude/hooks/check-on-stop.sh:49-58`): `.claude/rules/**`,
   `CLAUDE.md`, `docs/architecture.md` không khớp nhánh nào nên không vào `unmapped`. Sửa
   `apps/web/docs/frontend.md` và `apps/*/CLAUDE.md` sẽ chạy lint, typecheck và drift spec của app đó.
4. **Không test nào đọc các doc này** (verified): `git grep` các tên doc trong file không phải `.md`
   chỉ ra comment, không ra test. `env-example.spec.ts` đọc `development.md` và `production.md` §3,
   hai file này không đổi.
5. **Bổ sung so với spec §4.** Spec thiếu chỗ cho `frontend.md` §5 (Components), §7 (Naming), §8
   (Tests) và `backend.md` §7-§8. Plan thêm `web/components.md`, `web/tests.md`, và để hai bảng đặt
   tên ở `apps/*/CLAUDE.md` (D3: file này đã nạp cho mọi file trong app). Task 1 cập nhật spec.

## Bản đồ rule file

Đây là bảng đối chiếu spec §6 đòi. Mỗi dòng nguồn có đúng một đích. PR body chép bảng này.

### Web

| Rule file | `paths` | Nguồn |
|---|---|---|
| `web/data-flow.md` | `apps/web/features/**`, `apps/web/hooks/**`, `apps/web/lib/**`, `apps/web/components/providers.tsx` | `apps/web/CLAUDE.md` bullet 2, 3, 4, 6, 7 · `frontend.md` §3 (không tạo folder rỗng; key factory ở file `*-keys.ts` riêng), §4 rule 2-6, "The API boundary", "Server actions and the admin token", "Time and deadlines" · §9 dòng 1-4, 8, 9 |
| `web/routing.md` | `apps/web/app/**`, `apps/web/proxy.ts`, `apps/web/config/**`, `apps/web/features/auth/**` | bullet 1, 8 (nửa `ROUTES`), 9 · §4 rule 1, 8 (nửa `ROUTES`), "The session" · §7 câu route tiếng Việt · §9 dòng 5, 10, 12 |
| `web/components.md` | `apps/web/components/**`, `apps/web/features/*/components/**`, `apps/web/app/**/*.tsx`, `apps/web/lib/query-group.ts`, `apps/web/lib/roster-filter.ts` | bullet 5, 8 (nửa Server Component) · §4 rule 7 · §5 toàn bộ (bảng ba lớp, Base UI, wrap thay vì sửa, "The query group", "Filtering a roster list", "Writing through a dialog") · §9 dòng 7, 11 |
| `web/display.md` | `apps/web/**/*.tsx`, `apps/web/app/globals.css` | §6 từ "Palette roles" (dòng 383) tới hết "Phone layout" (dòng 683): 10 heading |
| `web/interaction.md` | `apps/web/**/*.tsx`, `apps/web/app/globals.css`, `apps/web/lib/motion.ts` | §6 từ "Touch has no hover" (dòng 684) tới hết "A shortcut → a key cap" (dòng 1015): 14 heading |
| `web/tests.md` | `apps/web/**/__tests__/**`, `apps/web/vitest.config.ts` | bullet 11 · §8 (node mặc định, `// @vitest-environment jsdom`, không `jest-dom`, `TZ`, `clearMocks`, test `lib/` là chính) |
| `apps/web/CLAUDE.md` (giữ) | nạp theo thư mục | stack · bullet 10 (alias `@/*`, khai hai lần) · §7 bảng đặt tên · bảng link tới 6 rule file · block Next.js |

`frontend.md` §9 dòng 3 ("Two hooks writing the same store slice") hiện chỉ có ở §9, nên thành một
bullet mới trong `data-flow.md`.

### API, shared, Prisma

| Rule file | `paths` | Nguồn |
|---|---|---|
| `api/module.md` | `apps/api/src/modules/**`, `apps/api/src/common/**`, `apps/api/src/infrastructure/**`, `apps/api/src/app.module.ts`, `apps/api/vercel.json` | `apps/api/CLAUDE.md` bullet 2, 3, 4, 6, 7, 8, 9, 10 · `backend.md` §3 (codec ở module sở hữu bảng, `verifyResponse`, seam `*.public.ts`, mảnh tuỳ chọn khi có caller thứ hai, tách service ~300 dòng), §4 hard rule 1-5, §6 bảng repository, §8 ngoại lệ barrel, §11 toàn bộ · root `CLAUDE.md` dòng 37 (`forwardRef`) |
| `api/discord.md` | `apps/api/src/modules/discord-bot/**`, `apps/api/src/scripts/register-discord-commands.ts` | bullet 11, 12 |
| `api/config.md` | `apps/api/src/config/**`, `apps/api/.env.example` | bullet 5 (phần chi tiết: `DIRECT_DATABASE_URL`, hai ngoại lệ) · `backend.md` §7 · root `CLAUDE.md` dòng 50-52 (biến API mới) |
| `shared.md` | `packages/shared/**` | root `CLAUDE.md` dòng 75-77 (build sau khi sửa) · `frontend.md` §4 hai đoạn sau rule 8 (ba entry `exports`, `build --watch` khi `next dev`) |
| `prisma.md` | `apps/api/prisma/**`, `apps/api/prisma.config.ts` | bullet 13 · root `CLAUDE.md` dòng 67-68 (migration phá dữ liệu) · `backend.md` §4 câu "`prisma/**` exempt" |
| `apps/api/CLAUDE.md` (giữ) | nạp theo thư mục | stack · message lỗi tiếng Việt · bullet 1 (không alias) · bullet 5 rút còn một câu + link `config.md` · §8 bảng đặt tên · bảng link tới 3 rule file |

Bullet đánh số theo thứ tự trong "The rules that get broken first" của mỗi `apps/*/CLAUDE.md`. Dòng
§9/§11 đánh số theo thứ tự trong bảng.

**Lệch đã chấp nhận (2026-10-11).** `frontend.md` §4 (các tiểu mục), §5, §6, §8 giữ phần văn xuôi, chỉ cắt các bảng và danh sách luật. Một số câu mệnh lệnh còn ở hai chỗ; dọn tiếp là việc sau. `backend.md` tương tự cho §3.

## Mẫu rule file

```markdown
---
paths:
  - "apps/web/features/**"
  - "apps/web/hooks/**"
---

# Web data flow

- **Server data goes through TanStack Query, in `features/<feature>/hooks/`.** Never put an API
  response in a Zustand store.
- …

Why: [`frontend.md` §4](../../../apps/web/docs/frontend.md#4-data-flow-rules).
```

Mỗi glob đặt trong ngoặc kép, vì `*` đứng đầu giá trị YAML là cú pháp alias.

## Review Focus

1. **Luật bị mất.** Rủi ro chính của PR. Reviewer đối chiếu bảng bản đồ với diff phần xoá của
   `apps/*/CLAUDE.md`, `frontend.md`, `backend.md`: mỗi câu mệnh lệnh bị xoá phải có mặt trong
   đúng một rule file.
2. **Glob hẹp quá.** Một file không khớp rule nào thì agent không thấy luật. Ví dụ: `lib/format.ts`
   khớp `data-flow.md` nhưng không khớp `display.md`, dù có quy ước hiển thị. Chấp nhận được vì
   `display.md` chỉ cần khi viết `.tsx`. Reviewer kiểm các glob còn lại theo cách đó.
3. **`architecture.md` vẫn nhắc lại vài luật** (§3.2, §4.2, §7: Discord command, cron, admin route).
   Ngoài D1. Theo `apps/*/CLAUDE.md`, `architecture.md` thắng khi lệch. Plan đổi câu đó thành:
   `architecture.md` thắng về "cái gì đang có", rule file thắng về convention. Dọn phần trùng là
   việc sau, ghi ở PR Note.
4. **Task tạo file ở thư mục mới.** Rule chỉ nạp khi Write, tức là sau khi agent đã nghĩ xong nội
   dung file. Hướng giảm nhẹ: bảng tra ở root `CLAUDE.md` liệt kê rule file theo vùng. Pilot A/B sẽ đo.

---

### Task 0: Branch và số đo nền

- [ ] **Step 1:** `git switch main && git pull --ff-only && git switch -c chore/path-scoped-rules`.
  Kiểm bằng `git rev-parse --abbrev-ref HEAD`.
- [ ] **Step 2:** Ghi số đo nền vào scratchpad (dùng lại ở PR body):
  `wc -l CLAUDE.md apps/*/CLAUDE.md .claude/rules/common/*.md apps/web/docs/frontend.md apps/api/docs/backend.md`.
  Lúc viết plan: 95 / 69 / 56 / 93 + 29 / 1.099 / 474.
- [ ] **Step 3:** Chạy probe của Task 7 Step 2 trên `main` một lần để có log nền. Mong đợi:
  `coding-style.md` và `security.md` nạp với `session_start`.

### Task 1: Đồng bộ spec và tổng quan

Theo luật "Keep spec, plan, and code consistent": quyết định đổi thì spec đổi trước.

- [ ] **Step 1:** `2026-10-10-ac1-path-scoped-rules-design.md`:
  - Trạng thái: "đang triển khai", link tới plan này.
  - §3: D1, D2 → "**chốt** 2026-10-11", nội dung như Global Constraints.
  - §4: thêm `web/components.md`, `web/tests.md`; sửa `paths` cho khớp bảng bản đồ (thêm
    `globals.css`, `lib/motion.ts`, `features/auth/**`, `vercel.json`...); ghi hai bảng đặt tên ở lại
    `apps/*/CLAUDE.md`.
  - §5: thay bảng bốn PR bằng "Một PR. User bỏ giới hạn 900 dòng ngày 2026-10-11."
  - §7 rủi ro 1: thêm câu trích docs (Read, Write, Edit đều kích hoạt).
- [ ] **Step 2:** `2026-10-10-agent-context-review-overview.md`:
  - Dòng 14: cột "PR ước tính" của AC1 `4` → `1`.
  - Dòng 37: xoá câu giới hạn 900 dòng, thay bằng "User bỏ giới hạn 900 dòng ngày 2026-10-11."
  - Dòng 44: thứ tự `3-6` → `3`, ước tính `~1.500`, lý do "Một PR cho cả AC1".
  - Dòng 46 và mục 3: "commit sau PR 6" → "commit sau PR 3".
  - Dòng 50: tổng còn **7 PR** (tính PR 0), thêm hai command AC4 thì 9, bỏ AC6 thì 6. Đánh lại số
    thứ tự các dòng 7-9 thành 4-6.

### Task 2: Rule file web

- [ ] **Step 1:** Tạo `.claude/rules/web/data-flow.md`, `routing.md`, `components.md` theo bảng bản
  đồ và mẫu. Viết lại gọn (D4), giữ mọi tên file, tên hàm và chuỗi tiếng Việt nguyên văn
  (`"Xoá bộ lọc"`, `"Không tải được lịch đánh."`...).
- [ ] **Step 2:** Tạo `display.md` và `interaction.md` từ §6. Mỗi heading §6 thành một mục `##` cùng
  tên trong rule file, để `frontend.md §6, <heading>` và rule file dùng chung một tên.
- [ ] **Step 3:** Tạo `tests.md`.
- [ ] **Step 4:** Mỗi file kết thúc bằng một dòng "Why:" trỏ về section tương ứng của `frontend.md`.

### Task 3: Rút `frontend.md` và `apps/web/CLAUDE.md`

- [ ] **Step 1:** `frontend.md` §3-§9: với mỗi luật đã chuyển ở Task 2, xoá câu mệnh lệnh, giữ đoạn
  "vì sao", sơ đồ, ví dụ. Mỗi section mở đầu bằng một dòng
  `Rules: [`.claude/rules/web/<file>.md`](../../../.claude/rules/web/<file>.md).`
  Giữ mọi heading (Global Constraints).
- [ ] **Step 2:** §9 Anti-patterns: xoá bảng, thay bằng một câu: mỗi dòng cũ đã nằm trong rule file
  nào (liệt kê theo bảng bản đồ).
- [ ] **Step 3:** Câu mở đầu của `frontend.md` (dòng 3-8): ghi rule file là bản gốc của convention,
  file này giữ lý do.
- [ ] **Step 4:** `apps/web/CLAUDE.md` viết lại theo dòng "giữ" của bảng bản đồ. Câu "extend §6 when
  you add a convention" → "a new convention goes in the matching rule file; its reason goes in
  `docs/frontend.md`". Block Next.js giữ nguyên văn, kiểm bằng `git diff` không có dòng nào trong block.
- [ ] **Step 5:** `pnpm --filter web lint && pnpm --filter web typecheck` (Stop hook cũng chạy).

### Task 4: Rule file api, shared, Prisma

- [ ] **Step 1:** Tạo `.claude/rules/api/module.md`, `discord.md`, `config.md` theo bảng bản đồ.
  `discord.md` giữ nguyên link tới
  `docs/superpowers/specs/2026-09-02-discord-attendance-commands-design.md` §9.
- [ ] **Step 2:** Tạo `.claude/rules/shared.md` và `.claude/rules/prisma.md`.

### Task 5: Rút `backend.md` và `apps/api/CLAUDE.md`

- [ ] **Step 1:** `backend.md` §3, §4, §6, §7, §8, §11: như Task 3 Step 1. §4 giữ toàn bộ phần
  "Enforced by ESLint" (lý do và config mẫu), chỉ năm hard rule đổi thành link. §11 xử lý như §9 ở
  Task 3 Step 2.
- [ ] **Step 2:** `apps/api/CLAUDE.md` viết lại theo dòng "giữ" của bảng bản đồ.
- [ ] **Step 3:** `pnpm --filter api lint && pnpm --filter api typecheck`.

### Task 6: Root `CLAUDE.md`, `rules/common`, link

- [ ] **Step 1:** Root `CLAUDE.md`, mục "Read before writing code" → bảng tra:

  | When you… | Read |
  |---|---|
  | add an endpoint, page, feature, column or env variable | `docs/architecture.md` §7 (binding) |
  | touch the data model | `docs/architecture.md` §5 |
  | touch week or deadline logic | `docs/architecture.md` §6 |
  | set up, seed, or edit the env tables | `docs/development.md` |
  | deploy, or touch Supabase or the Vercel build | `docs/production.md` |
  | touch CI triage | `docs/ci-triage.md` |

  Thêm một câu: convention theo vùng nằm trong `.claude/rules/` và tự nạp khi mở file khớp, liệt kê
  11 file với vùng của mỗi file.
- [ ] **Step 2:** Root `CLAUDE.md`, "Two rules architecture.md does not repeat": luật ngôn ngữ chuyển
  vào "Conventions"; `forwardRef` xoá (đã ở `api/module.md`). Xoá tiêu đề mục.
- [ ] **Step 3:** Root `CLAUDE.md`: xoá các câu đã chuyển (dòng 50-52 sang `config.md` và chỉ để lại
  một link; dòng 67-68 sang `prisma.md`; câu build trong dòng 75-77 sang `shared.md`).
- [ ] **Step 4:** Từ `coding-style.md`, thêm vào root "Conventions" những gì repo đang theo:
  immutability (tạo object mới, không mutate);
  lồng tối đa 4 cấp, dùng early return; hằng có tên thay cho magic number. Bỏ KISS/DRY/YAGNI, error
  handling, input validation (trùng với "Validate at boundaries" và "empty catch" đã có). Tiền tố
  boolean đã ở hai bảng đặt tên. Bỏ giới hạn số dòng file/hàm (quyết định 2026-10-11, repo đang vi phạm).
- [ ] **Step 5:** `git rm .claude/rules/common/coding-style.md .claude/rules/common/security.md`.
  `security.md` còn mâu thuẫn với repo: "Rate limit all endpoints" trái với `backend.md` §10
  ("deliberately absent").
- [ ] **Step 6:** Link:
  - `docs/architecture.md:627`: "Follow, and extend, `frontend.md` §6" → "Follow, and extend,
    `.claude/rules/web/display.md` or `interaction.md`".
  - `docs/architecture.md:452`: thêm link tới hai rule file đó bên cạnh link `frontend.md` §6.
  - `apps/*/CLAUDE.md`: câu "architecture.md wins when the two disagree" → như Review Focus 3.
  - `README.md:170-171`, `apps/web/README.md:44`, `apps/api/README.md:123`: mô tả doc thành "the
    reasoning behind the rules in `.claude/rules/`".

### Task 7: Kiểm chứng

- [ ] **Step 1: Link.** Viết script trong scratchpad (không commit): với mọi file `.md` đã sửa, mọi
  link tương đối `](path)` và `](path#anchor)` trỏ tới file có thật. Mong đợi: 0 link hỏng.
- [ ] **Step 2: Probe nạp rule.** Trong scratchpad, tạo `probe-settings.json`:

  ```json
  {
    "hooks": {
      "InstructionsLoaded": [
        { "hooks": [{ "type": "command", "command": "cat >> \"$PROBE_LOG\"; echo >> \"$PROBE_LOG\"" }] }
      ]
    }
  }
  ```

  Chạy ba lượt, mỗi lượt một log riêng (`PROBE_LOG=<scratchpad>/probe-<n>.log`):
  1. `claude -p --settings <probe-settings.json> "Read apps/web/features/members/components/member-row.tsx and reply OK"`.
     Mong đợi: `path_glob_match` cho `data-flow.md`, `components.md`, `display.md`,
     `interaction.md`; `apps/web/CLAUDE.md` nạp; **không** có `routing.md`, `tests.md`, `api/*`,
     `shared.md`, `prisma.md`.
  2. `… "Read apps/api/src/modules/discord-bot/commands/index.ts and reply OK"`. Mong đợi:
     `module.md`, `discord.md`, `apps/api/CLAUDE.md`; không có rule web.
  3. `claude -p "Create apps/web/features/zz-probe/probe.tsx containing: export {}" --settings <probe-settings.json> --allowedTools "Edit(apps/web/features/zz-probe/probe.tsx)"` (rule cho Write là `Edit(...)`; đặt prompt trước vì `--allowedTools` nuốt tham số sau nó).
     Mong đợi: `display.md` và `interaction.md` nạp sau Write. Sau đó
     `rm apps/web/features/zz-probe/probe.tsx && rmdir apps/web/features/zz-probe`.

  Cả ba lượt: không có `.claude/rules/**` nào nạp với `session_start` (tiêu chí spec §6.1). Nếu file
  ở bước 1 không còn tên đó, chọn một `.tsx` khác trong `features/*/components/`.
  `allowedTools` chỉ mở đúng một path, không nới quyền chung.
- [ ] **Step 3: Đối chiếu.** Với mỗi dòng nguồn trong bảng bản đồ, `grep` một cụm từ đặc trưng
  (ví dụ `ADMIN_PATH_PREFIXES`, `-translate-y-1/2`, `forwardRef`, `discord:register`) trong
  `.claude/rules/` và các doc. Mong đợi: câu mệnh lệnh có mặt ở đúng một rule file; doc chỉ còn lý do
  hoặc link.
- [ ] **Step 4: Lưới an toàn AC2, AC3** (spec §6.4): `pnpm --filter web lint`,
  `pnpm --filter web test`, `pnpm --filter api lint`,
  `pnpm --filter api test env-example prisma-enum-sync`. Mong đợi: xanh. Log dài thì chạy qua
  subagent và chỉ lấy tóm tắt.
- [ ] **Step 5:** Ghi kết quả probe (file nào nạp, lý do nạp) vào spec §6 như bằng chứng.

### Task 8: Commit, review, PR

- [ ] **Step 1:** `git rev-parse --abbrev-ref HEAD` phải là `chore/path-scoped-rules`. Soạn message
  bằng `caveman:caveman-commit`. Gợi ý subject:
  `chore(config): move agent rules into path-scoped rule files`.
- [ ] **Step 2:** `review-loop`, vòng cuối là `pr-review` trong một agent `reviewer` mới.
- [ ] **Step 3:** PR body theo `.github/pull_request_template.md`: What & Why (link spec và plan),
  Tests (kết quả Task 7, gồm log probe tóm tắt), Note (bảng bản đồ; số dòng trước và sau từ Task 0;
  phần trùng còn lại trong `architecture.md`), Self-review từ `pr-review`. Ô "Tests added" để trống,
  ghi lý do: PR chỉ đổi doc và rule, kiểm bằng probe.
