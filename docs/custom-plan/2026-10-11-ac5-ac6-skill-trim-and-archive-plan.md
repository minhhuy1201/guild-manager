# AC5 + AC6 - Thu gọn skill và archive plan/spec - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task (inline, theo `CLAUDE.md` project). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bốn skill UI chỉ chạy khi user gõ `/tên`, skill `supabase-postgres-best-practices` bị xoá
khỏi repo, và mọi plan/spec đã xong chuyển sang `docs/archive/` mà không link nào trong repo gãy thêm.

**Architecture:** AC5 là một khoá `skillOverrides` trong `.claude/settings.json` (project, được
commit) cộng việc xoá một skill vendored. AC6 là `git mv` cả ba thư mục sang `docs/archive/`, chuyển
lại các doc còn mở, rồi sửa link theo danh sách đo trước. Một script kiểm link trong scratchpad
(không commit) so số link gãy trước và sau.

**Tech Stack:** Claude Code settings (`skillOverrides`), `skills-lock.json` (CLI `skills`), git 2.56.0,
node 24 (script kiểm link).

**Spec:** [`2026-10-10-ac5-skill-trim-design.md`](../custom-spec/2026-10-10-ac5-skill-trim-design.md),
[`2026-10-10-ac6-archive-plans-design.md`](../custom-spec/2026-10-10-ac6-archive-plans-design.md)
(tổng quan: [`2026-10-10-agent-context-review-overview.md`](../custom-spec/2026-10-10-agent-context-review-overview.md))

## Global Constraints

- Branch `chore/agent-context-trim`, tạo từ `main` mới nhất (`1159e90`). **Một PR** cho cả AC5 và
  AC6 (user chốt 2026-10-11).
- Không sửa code chạy của app. Chỉ đổi comment trỏ path trong `apps/api/prisma/schema.prisma`,
  `apps/api/prisma/fix-deadlines.ts`, `packages/shared/package.json`.
- Không sửa file vendored trong `.agents/skills/` (spec AC5 §3): override nằm trong
  `.claude/settings.json`.
- Không thêm `.ignore`, không thêm `permissions.deny` cho `docs/archive/**` (user chốt 2026-10-11:
  đúng spec, agent vẫn grep thấy archive; path `archive` và dòng `CLAUDE.md` là tín hiệu).
- Link từ doc sống và code sang spec đã archive: **sửa path**, không chuyển nội dung (user chốt
  2026-10-11).
- Script kiểm link nằm trong scratchpad, không commit.
- Nội dung `docs/custom-plan`, `docs/custom-spec`, `docs/archive/**`: tiếng Việt. `CLAUDE.md`,
  `README.md`, `docs/*.md`, comment code: tiếng Anh.

## Quyết định đã chốt (2026-10-11)

- **Tiêu chí "đã xong" (AC6 §4):** chuyển tất cả, trừ danh sách giữ lại dưới đây. Lý do: dòng
  "Trạng thái" không đáng tin. AC1 và AC3 ghi "đang triển khai" dù đã merge (#187, #185); f14 ghi
  "chưa triển khai" dù đã merge (`db413a7`, #177).
- **Danh sách giữ lại** (ở nguyên chỗ cũ):
  - `docs/custom-spec/2026-10-04-feature-ideas-overview.md` (bản nháp ý tưởng, chưa quyết định)
  - `docs/custom-spec/2026-10-10-agent-context-review-overview.md` (AC4 chưa làm)
  - `docs/custom-spec/2026-10-10-ac4-workflow-commands-design.md`
  - `docs/custom-spec/2026-10-10-ac5-skill-trim-design.md`
  - `docs/custom-spec/2026-10-10-ac6-archive-plans-design.md`
  - `docs/custom-plan/2026-10-11-ac5-ac6-skill-trim-and-archive-plan.md` (file này)

  AC5, AC6 giữ lại vì overview vẫn là mục lục sống của loạt AC cho tới khi AC4 xong. Lần archive sau
  chuyển cả loạt.
- **Xoá `supabase-postgres-best-practices`:** repo không có `AGENTS.md`, `.codex/` hay `.cursor/`, và
  ngoài `skills-lock.json` không file nào nhắc tên skill (`git grep`). Máy user có `~/.codex`, và
  Codex đọc `.agents/skills/`, nhưng user xác nhận không dùng Codex: **xoá** (chốt 2026-10-11).

## Kiểm chứng lúc viết plan (2026-10-11, trên `1159e90`)

- **`skillOverrides` hợp lệ ở project settings.** https://code.claude.com/docs/en/skills: "In user,
  project, and local settings, Claude Code matches entries against skill names only." Bảng giá trị:
  `"user-invocable-only"` thì "Listed to Claude: Hidden", "In `/` menu: Yes". "Plugin skills are not
  affected by `skillOverrides`." (nên không giảm phần superpowers/caveman).
- **Skill hiện có.** `.claude/skills/` có 8 mục: 7 symlink vào `.agents/skills/` và `pr-review` là
  thư mục thật. `.agents/skills/supabase-postgres-best-practices/` có 36 file được track.
  `skills-lock.json` có 7 entry, trong đó có `supabase-postgres-best-practices`.
- **`settings.local.json` của user** (git-ignored) có `"skillOverrides": { "supabase-postgres-best-practices": "off" }`.
  Sau khi xoá skill, entry đó thừa; user tự dọn, plan không đụng file này.
- **Kích thước frontmatter** (byte của khối `name`/`description`, đo bằng awk, chỉ để tham khảo):
  `design-taste-frontend` 311, `minimalist-ui` 179, `redesign-existing-projects` 272,
  `web-design-guidelines` 272, `supabase-postgres-best-practices` 933. Con số chính thức cho PR lấy
  từ `/context` (Task 1).
- **Archive mô phỏng trong worktree tạm** (đã xoá): sau `git mv`, script kiểm link báo 37 link gãy,
  so với 9 trước khi chuyển. 9 link gãy sẵn đều nằm trong plan/spec cũ (ví dụ
  `../../custom-spec/...` trong plan w7, chỗ giữ chỗ `path` trong plan AC1); chúng đi theo file vào
  archive và **không sửa** (lịch sử). 28 link gãy mới chia thành bốn nhóm, liệt kê đủ ở Task 3.
- **Path dạng chữ (không phải link markdown)** trỏ vào file cụ thể, ngoài các thư mục bị chuyển:
  `.claude/rules/api/discord.md:12`, `apps/api/prisma/fix-deadlines.ts:11`,
  `apps/api/prisma/schema.prisma:249`, `packages/shared/package.json:9`, `docs/design-direction.md:104`.
  (Spec AC6 §3 nhắc `apps/api/CLAUDE.md`; AC1 đã dời dòng đó sang `.claude/rules/api/discord.md`.)
- **Path dạng thư mục:** `CLAUDE.md:87-88`, `README.md:172-173`, `docs/architecture.md:10-12`,
  `docs/development.md:350`. `docs/architecture.md:633` và `.github/pull_request_template.md:4`
  chỉ chỗ đặt spec **mới**, nên giữ nguyên.

## Ghi chú thực thi (2026-10-11)

- Số link gãy sẵn là **8**, không phải 9: `../../../apps/web/docs/frontend.md` trong plan AC1 trỏ
  đúng khi plan nằm sâu thêm một cấp. Script cũng báo 7 dòng giả trong chính file plan này (mẫu `sed`
  nằm trong khối code); khi đếm, loại file plan này (`grep -v ac5-ac6-skill-trim-and-archive-plan`).
- `/context` trước/sau không đo được từ session agent; PR ghi "chưa đo".

## Review Focus

1. Một doc sống hoặc comment code vẫn trỏ path cũ: người đọc mở link thì 404. Kỳ vọng: `git grep`
   ở Task 4 Step 3 không trả dòng nào trỏ file cụ thể.
2. Doc đã archive trỏ doc sống (`../../architecture.md`) gãy vì sâu thêm một cấp. Kỳ vọng: script
   kiểm link chỉ còn đúng 9 link gãy sẵn.
3. Link chéo giữa doc giữ lại và doc đã archive (overview AC trỏ spec AC1-AC3 và ngược lại). Kỳ vọng:
   cả hai chiều mở được.
4. `skillOverrides` trong `.claude/settings.json` không có hiệu lực vì user đặt giá trị khác trong
   `settings.local.json` (local thắng project). Kỳ vọng: `/skills` hiện bốn skill là `user-only`.
5. Stop hook chạy check cho `apps/api` và `packages/shared` vì comment đổi. Kỳ vọng: lint, typecheck
   xanh; Prettier không đổi gì thêm.

---

### Task 1: AC5 - ẩn bốn skill UI, xoá `supabase-postgres-best-practices`

**Files:**
- Modify: `.claude/settings.json`
- Modify: `skills-lock.json`
- Delete: `.claude/skills/supabase-postgres-best-practices` (symlink),
  `.agents/skills/supabase-postgres-best-practices/` (36 file)

**Interfaces:** không có. Task 2-4 không phụ thuộc task này.

- [x] **Step 1: Hỏi user về Codex**

  User không dùng Codex, đồng ý xoá (2026-10-11).

- [ ] **Step 2: Đo `/context` trước**

  Tạo branch: `git switch -c chore/agent-context-trim` (đã kiểm `git rev-parse --abbrev-ref HEAD`
  là `main`). Commit file plan này trước (gợi ý: `docs: add ac5 ac6 skill trim and archive plan`),
  để nó không bị bỏ sót khi squash như plan AC2 (#184). Nhờ user mở session mới ở repo, gõ
  `/context`, rồi dán dòng "Skills" (số token). Ghi con số vào nháp PR body. Step 4-5 đã chạy
  trước bước đo này, nên số "trước" phải đo trên `main` (`git switch main`, session mới).

- [ ] **Step 3: Thêm `skillOverrides` vào `.claude/settings.json`**

  Thêm khoá cấp cao nhất, sau `"hooks"`:

  ```json
    "skillOverrides": {
      "design-taste-frontend": "user-invocable-only",
      "minimalist-ui": "user-invocable-only",
      "redesign-existing-projects": "user-invocable-only",
      "web-design-guidelines": "user-invocable-only"
    }
  ```

  Kiểm JSON: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"`
  Expected: không in gì, mã thoát 0.

- [x] **Step 4: Xoá skill vendored**

  ```bash
  git rm -q .claude/skills/supabase-postgres-best-practices
  git rm -rq .agents/skills/supabase-postgres-best-practices
  ```

  Expected: `git status --short | grep -c supabase-postgres` in `37` (1 symlink + 36 file).

- [x] **Step 5: Xoá entry trong `skills-lock.json`**

  Xoá nguyên khối `"supabase-postgres-best-practices": { … }` (6 dòng), giữ dấu phẩy đúng.
  Kiểm: `node -e "const s=JSON.parse(require('fs').readFileSync('skills-lock.json','utf8')).skills; console.log(Object.keys(s).join(','))"`
  Expected: `design-taste-frontend,minimalist-ui,redesign-existing-projects,shadcn,supabase,web-design-guidelines`

- [ ] **Step 6: Đo `/context` sau và kiểm `/skills`**

  Nhờ user mở session mới, gõ `/context` và `/skills`. Expected: số token "Skills" nhỏ hơn Step 2;
  `/skills` hiện bốn skill UI ở trạng thái `user-only`, `supabase-postgres-best-practices` không còn.
  Nếu bốn skill vẫn `on`: kiểm `settings.local.json` của user có `skillOverrides` đè không (Review
  Focus 4), báo user, không sửa file đó.

- [ ] **Step 7: Commit**

  Kiểm branch: `git rev-parse --abbrev-ref HEAD` ra `chore/agent-context-trim`. Soạn message bằng
  `caveman:caveman-commit`. Gợi ý: `chore(config): hide ui skills from auto-invoke and drop postgres skill`.

  ```bash
  git add .claude/settings.json skills-lock.json
  git commit
  ```

### Task 2: AC6 - chuyển plan/spec sang `docs/archive/`

**Files:**
- Rename: `docs/superpowers/**` → `docs/archive/superpowers/**`
- Rename: `docs/custom-plan/**` → `docs/archive/custom-plan/**` (trừ file plan này)
- Rename: `docs/custom-spec/**` → `docs/archive/custom-spec/**` (trừ 5 file giữ lại)

**Interfaces:**
- Produces: cây thư mục mà Task 3 sửa link theo; script `check-links.mjs` trong scratchpad.

- [ ] **Step 1: Tạo script kiểm link trong scratchpad và đo baseline**

  Ghi `<scratchpad>/check-links.mjs`:

  ```js
  import { execSync } from 'node:child_process';
  import { readFileSync, existsSync } from 'node:fs';
  import { dirname, resolve } from 'node:path';

  const files = execSync("git ls-files '*.md'", { encoding: 'utf8' }).trim().split('\n');
  const linkPattern = /\]\(([^)\s#]+)(#[^)]*)?\)/g;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(linkPattern)) {
      const target = match[1];
      if (/^([a-z]+:|\/\/)/i.test(target)) continue;
      if (!existsSync(resolve(dirname(file), decodeURI(target)))) console.log(`${file}: ${target}`);
    }
  }
  ```

  Run: `node <scratchpad>/check-links.mjs | wc -l`
  Expected: `9` (link gãy sẵn, xem "Kiểm chứng").

- [ ] **Step 2: Chuyển cả ba thư mục, rồi đưa doc giữ lại về chỗ cũ**

  Plan này phải đã được commit trước (nó nằm trong `docs/custom-plan/`).

  ```bash
  mkdir -p docs/archive
  git mv docs/superpowers docs/archive/superpowers
  git mv docs/custom-plan docs/archive/custom-plan
  git mv docs/custom-spec docs/archive/custom-spec
  mkdir -p docs/custom-spec docs/custom-plan
  for f in 2026-10-04-feature-ideas-overview.md 2026-10-10-agent-context-review-overview.md \
           2026-10-10-ac4-workflow-commands-design.md 2026-10-10-ac5-skill-trim-design.md \
           2026-10-10-ac6-archive-plans-design.md; do
    git mv "docs/archive/custom-spec/$f" "docs/custom-spec/$f"
  done
  git mv docs/archive/custom-plan/2026-10-11-ac5-ac6-skill-trim-and-archive-plan.md docs/custom-plan/
  ```

  Kiểm: `ls docs/custom-spec docs/custom-plan` ra đúng 6 file giữ lại; `ls docs` không còn
  `superpowers`.

- [ ] **Step 3: Đo link gãy sau khi chuyển**

  Run: `node <scratchpad>/check-links.mjs | wc -l`
  Expected: `37` (9 sẵn + 28 mới). Nếu khác 37: dừng, so với danh sách Task 3 trước khi đi tiếp.

- [ ] **Step 4: Commit riêng phần rename**

  Commit chỉ rename, để `git log --follow` và review thấy rename sạch, không lẫn sửa nội dung.
  Kiểm branch. Message qua `caveman:caveman-commit`; gợi ý: `docs: move finished plans and specs to docs/archive`.

  ```bash
  git add -A docs
  git commit
  ```

  Kiểm: `git show --stat -M HEAD | tail -1` báo 0 insertion, 0 deletion.

### Task 3: AC6 - sửa 28 link gãy

**Files:** (mọi path dưới đây là sau khi chuyển)
- Modify: `docs/architecture.md`, `docs/ci-triage.md`, `docs/production.md`
- Modify: `docs/custom-spec/2026-10-10-agent-context-review-overview.md`
- Modify: 6 spec trong `docs/archive/superpowers/specs/`; 3 plan AC và 5 spec (AC1-AC3, a1, f14)
  trong `docs/archive/custom-*`

**Interfaces:**
- Consumes: `check-links.mjs` từ Task 2.

- [ ] **Step 1: Nhóm A - doc sống trỏ vào archive (7 link)**

  Chỉ đổi target trong `](…)`, không đổi chữ hiển thị.

  | File | Target cũ | Target mới |
  |---|---|---|
  | `docs/architecture.md` (dòng ~556) | `superpowers/specs/2026-09-23-tactic-stage-animation-design.md` | `archive/superpowers/specs/2026-09-23-tactic-stage-animation-design.md` |
  | `docs/architecture.md` (~649) | `custom-spec/2026-10-05-f14-roster-optimistic-locking-design.md` | `archive/custom-spec/2026-10-05-f14-roster-optimistic-locking-design.md` |
  | `docs/ci-triage.md` (~175) | `custom-spec/2026-09-20-jev-ci-triage-design.md` | `archive/custom-spec/2026-09-20-jev-ci-triage-design.md` |
  | `docs/production.md` (~137, ~802) | `superpowers/specs/2026-08-16-vercel-deployment-design.md` | `archive/superpowers/specs/2026-08-16-vercel-deployment-design.md` |
  | `docs/production.md` (~387, ~801) | `superpowers/specs/2026-08-02-supabase-hosting-design.md` | `archive/superpowers/specs/2026-08-02-supabase-hosting-design.md` |

  ```bash
  sed -i -E 's#\]\((superpowers/specs|custom-spec)/#](archive/\1/#g' docs/architecture.md docs/ci-triage.md docs/production.md
  ```

  Kiểm: `git diff --stat docs/architecture.md docs/ci-triage.md docs/production.md` ra 7 dòng đổi
  (2 + 1 + 4).

- [ ] **Step 2: Nhóm B - doc archive trỏ doc sống, sâu thêm một cấp (10 link)**

  File: `2026-08-16-ci-migrations-design.md` (1), `2026-09-01-discord-bot-design.md` (4),
  `2026-09-02-discord-attendance-commands-design.md` (1), `2026-09-05-discord-formation-announcement-design.md` (1),
  `2026-09-15-landing-page-trang-chu-design.md` (1), `2026-09-20-tactics-board-design.md` (2), cùng
  trong `docs/archive/superpowers/specs/`.

  ```bash
  sed -i -E 's#\]\(\.\./\.\./(architecture|production|development|design-direction)\.md#](../../../\1.md#g' \
    docs/archive/superpowers/specs/*.md
  ```

- [ ] **Step 3: Nhóm C - doc archive trỏ doc giữ lại (8 link)**

  ```bash
  # plan AC1-AC3 → overview (3 link)
  sed -i 's#](\.\./custom-spec/2026-10-10-agent-context-review-overview\.md#](../../custom-spec/2026-10-10-agent-context-review-overview.md#g' \
    docs/archive/custom-plan/2026-10-11-ac{1-path-scoped-rules,2-web-lint-boundaries,3-convention-checks}-plan.md
  # spec AC1-AC3 → overview (3 link)
  sed -i 's#](2026-10-10-agent-context-review-overview\.md#](../../custom-spec/2026-10-10-agent-context-review-overview.md#g' \
    docs/archive/custom-spec/2026-10-10-ac{1,2,3}-*-design.md
  # spec a1, f14 → feature-ideas (2 link)
  sed -i 's#](2026-10-04-feature-ideas-overview\.md#](../../custom-spec/2026-10-04-feature-ideas-overview.md#g' \
    docs/archive/custom-spec/2026-10-04-a1-leave-mode-design.md docs/archive/custom-spec/2026-10-05-f14-roster-optimistic-locking-design.md
  ```

- [ ] **Step 4: Nhóm D - doc giữ lại trỏ archive (3 link)**

  Trong `docs/custom-spec/2026-10-10-agent-context-review-overview.md`, bảng đầu file:

  ```bash
  sed -i -E 's#\]\((2026-10-10-ac[123]-[a-z-]+-design\.md)\)#](../archive/custom-spec/\1)#g' \
    docs/custom-spec/2026-10-10-agent-context-review-overview.md
  ```

- [ ] **Step 5: Kiểm link**

  Run: `node <scratchpad>/check-links.mjs`
  Expected: đúng 9 dòng, mọi dòng nằm dưới `docs/archive/` và là 9 link gãy sẵn (w7, attendance-status,
  a6, w6, tactic-stage-animation plan, 4 chỗ trong plan AC1). Một dòng khác: sửa tay theo cùng quy
  tắc rồi chạy lại.

- [ ] **Step 6: Commit**

  Kiểm branch. Gợi ý message: `docs: fix links after archiving plans and specs`.

### Task 4: AC6 - path dạng chữ, `CLAUDE.md`, mô tả thư mục, trạng thái spec

**Files:**
- Modify: `.claude/rules/api/discord.md:12`, `apps/api/prisma/fix-deadlines.ts:11`,
  `apps/api/prisma/schema.prisma:249`, `packages/shared/package.json:9`, `docs/design-direction.md:104`
- Modify: `CLAUDE.md`, `README.md:172-173`, `docs/architecture.md:10-12`, `docs/development.md:350`
- Modify: spec AC5, AC6 (trạng thái + kiểm chứng), overview (bảng thứ tự),
  `docs/archive/custom-spec/2026-10-10-ac1-…`, `…-ac3-…` (trạng thái)

- [ ] **Step 1: Path dạng chữ trỏ file cụ thể**

  ```bash
  sed -i -E 's#docs/(superpowers/specs|custom-spec|custom-plan)/([0-9]{4}-)#docs/archive/\1/\2#g' \
    .claude/rules/api/discord.md apps/api/prisma/fix-deadlines.ts apps/api/prisma/schema.prisma \
    packages/shared/package.json docs/design-direction.md
  ```

  `docs/design-direction.md:104` trỏ glob `docs/custom-plan/2026-09-13-*`; sau sed thành
  `docs/archive/custom-plan/2026-09-13-*`. Kiểm: `ls docs/archive/custom-plan/2026-09-13-*` ra 8 file.

- [ ] **Step 2: `CLAUDE.md` và mô tả thư mục**

  `CLAUDE.md`, mục "Conventions", dòng 87-88 đổi thành:

  ```markdown
  - **Comment, code and file names are English**; the content of `docs/superpowers`,
    `docs/custom-plan`, `docs/custom-spec` and `docs/archive` is Vietnamese.
  ```

  Thêm ngay dưới bảng "Read before writing code" (sau đoạn "Convention by area…"):

  ```markdown
  `docs/archive/` holds finished plans and specs. It is history, not a source of truth: when it
  disagrees with the code or a living doc, the code and the living doc win.
  ```

  `README.md:172-173`, `docs/architecture.md:10-12`, `docs/development.md:350`: giữ dòng cũ (vẫn là
  chỗ đặt spec/plan đang mở) và thêm một dòng cùng kiểu cho `docs/archive/`, ví dụ ở `README.md`:

  ```markdown
  | `docs/archive/` | Finished specs and plans from both pairs above - history, not a source of truth |
  ```

  `docs/architecture.md` và `docs/development.md`: một gạch đầu dòng cùng nghĩa, theo đúng định dạng
  danh sách ở đó.

- [ ] **Step 3: Kiểm không còn path cũ trỏ file cụ thể**

  Run: `git grep -nE '(superpowers/(specs|plans)|custom-plan|custom-spec)/[0-9]{4}-' -- ':!docs/archive' ':!docs/custom-spec' ':!docs/custom-plan'`
  Expected: chỉ các dòng có `archive/` ngay trước, không dòng nào khác. (Doc giữ lại trong
  `docs/custom-*` được loại vì spec AC6 §3 cố ý nhắc path cũ làm ví dụ.)

- [ ] **Step 4: Trạng thái spec**

  - AC5 spec dòng 3: `Trạng thái: **đã triển khai (PR `chore/agent-context-trim`)**`. Thêm mục
    "Kết quả": token "Skills" trước/sau từ Task 1.
  - AC6 spec dòng 3: `Trạng thái: **đã triển khai (PR `chore/agent-context-trim`)**`. Mục 4 "Quyết
    định mở" ghi lại ba quyết định đã chốt (danh sách giữ lại; không `.ignore`, không
    `permissions.deny`; sửa path, không chuyển nội dung). Sửa ví dụ `apps/api/CLAUDE.md` ở §3 thành
    `.claude/rules/api/discord.md`.
  - Overview: cột link của AC1-AC3 đã trỏ archive (Task 3); mục 2 ghi AC5, AC6 xong trong một PR, tổng
    còn **6 PR** cho loạt AC thay vì 7.
  - `docs/archive/custom-spec/2026-10-10-ac1-…` và `…-ac3-…`: dòng trạng thái thành "đã triển khai"
    (merge #187, #185). Sửa nhỏ vì dòng sai đã thấy; không rà trạng thái các spec cũ khác.

- [ ] **Step 5: Check của workspace có file đổi**

  ```bash
  pnpm --filter @guild/shared build
  pnpm --filter api lint && pnpm --filter api typecheck
  node <scratchpad>/check-links.mjs | wc -l
  ```

  Expected: lint, typecheck mã thoát 0; script ra `9`. Stop hook chạy cùng các lệnh này khi session
  dừng.

- [ ] **Step 6: Commit**

  Kiểm branch. Gợi ý message: `docs(config): point references at docs/archive and mark ac5 ac6 done`.

### Task 5: Review và PR

- [ ] **Step 1:** Chạy `review-loop` (vòng cuối là `pr-review` trong agent `reviewer` mới). Đăng danh
  sách **Needs human review** bằng tiếng Việt.
- [ ] **Step 2:** `git diff --shortstat -M main...HEAD`. Ghi số dòng vào PR body; rename nguyên vẹn
  tính 0 dòng.
- [ ] **Step 3:** Đọc `.github/pull_request_template.md`, điền mọi mục. PR body ghi: token "Skills"
  trước/sau (`/context`), số link gãy 9 → 37 → 9, danh sách giữ lại, và việc user tự xoá entry
  `supabase-postgres-best-practices` trong `settings.local.json`.
- [ ] **Step 4:** Push và `gh pr create` chỉ khi user yêu cầu. Dừng ở link PR.
