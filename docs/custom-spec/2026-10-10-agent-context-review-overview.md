# Review context cho agent - tổng quan

Ngày: 2026-10-10 · Trạng thái: **spec, chưa triển khai** · Base: `798cd53` · Nguồn: hướng dẫn nội
bộ "Organizing Context and Enforcement for AI Coding Agents" (không commit vào repo), dựa trên
[Claude Code: Memory](https://code.claude.com/docs/en/memory),
[Hooks guide](https://code.claude.com/docs/en/hooks-guide) và
[Skills](https://code.claude.com/docs/en/skills)

Sáu đề xuất áp hướng dẫn đó (gọi tắt là "hướng dẫn context") vào repo này: luật cho agent nạp theo
path thay vì đọc trọn doc, luật phải luôn đúng thì code giữ (lint, spec, hook) thay vì chữ giữ. Mỗi đề xuất một spec:

| # | Spec | Độ mạnh | PR ước tính |
|---|---|---|---|
| AC1 | [`2026-10-10-ac1-path-scoped-rules-design.md`](../archive/custom-spec/2026-10-10-ac1-path-scoped-rules-design.md) | Strong | 1 |
| AC2 | [`2026-10-10-ac2-web-lint-boundaries-design.md`](../archive/custom-spec/2026-10-10-ac2-web-lint-boundaries-design.md) | Strong | 1 |
| AC3 | [`2026-10-10-ac3-convention-checks-design.md`](../archive/custom-spec/2026-10-10-ac3-convention-checks-design.md) | Strong | 1 |
| AC4 | [`2026-10-10-ac4-workflow-commands-design.md`](2026-10-10-ac4-workflow-commands-design.md) | Worth exploring; **không làm** (2026-10-11) | 0 |
| AC5 | [`2026-10-10-ac5-skill-trim-design.md`](2026-10-10-ac5-skill-trim-design.md) | Worth exploring | 1 |
| AC6 | [`2026-10-10-ac6-archive-plans-design.md`](2026-10-10-ac6-archive-plans-design.md) | Speculative | 1 |

## 1. Hiện trạng (đo ngày 2026-10-10)

- `CLAUDE.md:20-32` bảo agent đọc trước khi viết code một chuỗi doc 3.778 dòng, khoảng 243 KB. Một
  task web tối thiểu chạm khoảng 1.910 dòng (`CLAUDE.md`, `architecture.md`, `apps/web/CLAUDE.md`,
  `frontend.md`), một task api khoảng 1.307 dòng.
- `apps/api/CLAUDE.md` và `apps/web/CLAUDE.md` nạp **khi agent chạm file trong thư mục đó**, không
  nạp lúc khởi động. Docs Claude Code: "Files in subdirectories load on demand."
- `.claude/rules/common/*.md` (122 dòng) không có `paths`, nên nạp mọi session. Docs Claude Code:
  "Rules without a `paths` field are loaded unconditionally and apply to all files."
- `apps/web/eslint.config.mjs` không có custom rule nào. Mọi luật web chỉ nằm trong văn bản.
- Hook duy nhất của project là `pre-push-review-gate.sh` (PreToolUse, Bash).
- Ba cặp file song song không có check: `env.validation.ts` ↔ `.env.example`, Prisma enum ↔
  `@guild/shared/enums`, alias `tsconfig.json` ↔ `vitest.config.ts`. Hôm nay cả ba khớp.

## 2. Thứ tự và số PR

User bỏ giới hạn 900 dòng ngày 2026-10-11.

| Thứ tự | PR | Ước tính dòng | Lý do đứng ở đây |
|---|---|---|---|
| 0 | Các spec này | ~570 (chỉ doc) | Nền cho mọi PR sau. |
| 1 | AC2 - lint web | ~275 | Code giữ luật web trước khi AC1 bỏ doc khỏi context. |
| 2 | AC3 - drift spec + Stop hook | ~350 | Luật "phải luôn đúng" có check trước khi AC1 cắt chữ. |
| 3 | AC1 - chuyển luật sang `.claude/rules/` | ~1.500 | Một PR cho cả AC1. |
| - | **Pilot A/B** (mục 3) | 0 PR | Đã đo tất định ngày 2026-10-11; trục hành vi agent chưa chạy. |
| 4 | AC5 - skill | ~30 | Không phụ thuộc pilot; arm A/B đã ghim commit nên AC5 không lẫn vào lượt đo sau. |
| 5 | AC6 - archive | ~40 (rename tính 0 dòng khi git nhận ra rename) | Pilot không đo việc agent đọc plan cũ; quyết định theo lý do riêng (mục 3). |
| - | ~~AC4 - `/new-env-var`~~ | 0 | Không làm (2026-10-11); lý do ở spec AC4 mục 4. |

Tổng: **7 PR**, tính cả PR 0; AC5 và AC6 đi chung một PR (2026-10-11) nên còn **6**; bỏ AC4 (2026-10-11) nên còn **5**.

## 3. Pilot A/B

Trạng thái: **đã đổi từ 18 lượt agent sang đo tất định, 2026-10-11.** Lý do: 18 lượt `claude -p` ước
tính $15-25 và đo hành vi với N = 3 không kết luận được. Pilot đã chạy 2 trong 18 lượt (xem "Đã chạy")
rồi dừng; user chọn đo không tốn tiền. Report HTML, hidden checklist và harness nằm trong scratchpad
session và **không được giữ trong repo**; số liệu cần thiết đã ghi ở mục này.

Arm A: `798cd53`. Arm B: `3289f35` (sau AC1 + AC2 + AC3). Không có AC4-AC6 ở cả hai.

### Kết quả đo tất định ($0)

| Trục | Cách đo | A | B |
|---|---|---|---|
| Context mỗi task (AC1) | Số dòng nạp theo path của file bị chạm, 9 loại task; glob `paths` đối chiếu blob git ở từng commit | 887-2.032 dòng | 130-444 dòng; giảm trung bình **84%** (78-90%) |
| Ranh giới web (AC2) | 8 fixture vi phạm, `eslint --no-ignore`, config của từng arm | bắt **0/8** | bắt **8/8** |
| Drift (AC3) | Sửa một trong hai file của cặp, chạy spec | không có check | env: đỏ ở 3 chỗ (`.env.example`, bảng `development.md`, bảng `production.md`); alias: đỏ; enum: spec có sẵn, 5 test xanh trên cây sạch |

Mô hình context đối chiếu với 2 lần nạp thật (`InstructionsLoaded`): sửa `apps/web/lib/api-client.ts`
ở B nạp `CLAUDE.md`, `apps/web/CLAUDE.md`, `data-flow.md`; đầu session ở A nạp `CLAUDE.md`,
`common/security.md`, `common/coding-style.md`. Số dòng của A gồm cả doc mà `CLAUDE.md` bảo agent
đọc (`architecture.md`, `frontend.md` hoặc `backend.md`), không chỉ file tự nạp.

### Đã chạy

2 lượt T1 (env `ATTENDANCE_REMINDER_ENABLED`), mỗi arm 1 lượt, N = 1: cả hai sửa đủ 4 chỗ env và pass
test, typecheck; lint của A thoát mã 1 (lỗi prettier agent tự gây trong `reminder.service.ts`), của B
mã 0. Không phân biệt được hai arm. Chi phí: khoảng $0.29 mỗi lượt; tổng ghi được khoảng $1.2 tính cả
smoke và probe, chưa kể lượt T2-A-1 bị dừng giữa chừng và không ghi chi phí.

### Chưa đo - quyết định cho PR sau

- **Hành vi agent** (số vi phạm convention mỗi lượt) chưa đo. Chỉ chạy nếu cần; bắt đầu với T2 và T3,
  3 lượt mỗi arm, và nói trước tổng chi phí. Hidden checklist (T1: 7 mục, T2: 17, T3: 8, chung: 8)
  đã soạn xong, user duyệt trong chat (2026-10-11); không giữ trong repo.
- **Drift enum** chưa làm lệch thật: API resolve `@guild/shared` về thư mục chính nên cây tạm không
  thấy thay đổi. Spec `prisma-enum-sync.spec.ts` có sẵn và xanh.
- **Một lần nạp chưa giải thích**: ở lượt T1 của B, agent sửa `env.validation.ts` nhưng `api/config.md`
  không nằm trong danh sách đã nạp (`module.md`, `discord.md` thì có, cả hai do `reminder.controller.ts`).
  Không sự kiện `InstructionsLoaded` nào nổ cho `env.validation.ts` dù glob của `config.md` là
  `apps/api/src/config/**`. Chưa rõ nguyên nhân; cần xem lại trước khi tin AC1 cho task sửa env.
- **Rule nạp muộn khi tạo file mới** (rủi ro 4 của plan AC1): rule nạp khi Write (đã kiểm, spec AC1 §6
  lượt 3), nhưng sau khi agent đã nghĩ xong nội dung file. Chưa đo việc đó có đổi hành vi agent không.

### Xác minh phương pháp

- `--setting-sources project` loại plugin `superpowers`, `caveman` và agent `reviewer` khỏi cả hai arm
  (init event của `claude -p`). `~/.claude/CLAUDE.md` vẫn nạp ở probe đầu (cwd là repo chính, dưới `/home`); ở cả hai lượt thật
  (A và B, worktree dưới `/tmp`) không thấy trong log `InstructionsLoaded`, chưa rõ lý do. Giống nhau ở hai arm nên không lệch so sánh.
- Không dùng `--bare` vì nó tắt Stop hook của B. Chưa kiểm Stop hook của B có chạy trong `claude -p`.
- `pnpm install` và `prisma generate` cần `DATABASE_URL`; harness truyền giá trị giả, không có
  database nào được nối.

### Tác động tới các PR sau

- **AC6** ("chỉ làm nếu pilot cho thấy agent đọc plan cũ"): pilot không đo chuyện này nên không có
  bằng chứng ủng hộ hay bác bỏ. Quyết định AC6 dựa trên lý do khác, không dựa pilot.
- **AC5, AC4**: không phụ thuộc kết quả pilot.

## 4. Đính chính report HTML

- Report ghi `components/ui/` "bị sửa 23 lần". Đúng ra là 23 commit chạm thư mục, trong đó 11 commit
  thêm file qua shadcn CLI và 12 commit sửa file có sẵn (`git log --diff-filter=A|M`).
- Report gọi `lib/cache-graph.ts:3-7` là vi phạm. Thực ra đó là ngoại lệ đã ghi trong comment của
  chính file đó ("the only place in the app allowed to import another feature's key factory") và
  trong `frontend.md:126`. AC2 biến ngoại lệ đó thành cấu hình lint.

## 5. Ngoài phạm vi

- `.claude/settings.local.json` có khoảng 70 allow entry, trong đó có `Bash(node *)`,
  `Bash(python3 *)`, `Bash(pnpm dlx *)` và `Bash(gh api *)`. Đây là file cá nhân, git-ignored. User tự
  dọn; không spec nào ở đây đụng tới.
- Mod (Claude Code v2.1.287 trở lên): không dùng cho enforcement. Script phải gọi được từ CI, mà mod
  chỉ chạy trong Claude Code.
