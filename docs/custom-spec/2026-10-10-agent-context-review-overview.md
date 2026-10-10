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
| AC1 | [`2026-10-10-ac1-path-scoped-rules-design.md`](2026-10-10-ac1-path-scoped-rules-design.md) | Strong | 4 |
| AC2 | [`2026-10-10-ac2-web-lint-boundaries-design.md`](2026-10-10-ac2-web-lint-boundaries-design.md) | Strong | 1 |
| AC3 | [`2026-10-10-ac3-convention-checks-design.md`](2026-10-10-ac3-convention-checks-design.md) | Strong | 1 |
| AC4 | [`2026-10-10-ac4-workflow-commands-design.md`](2026-10-10-ac4-workflow-commands-design.md) | Worth exploring | 1 (tối đa 3) |
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

Mỗi PR tối đa 900 dòng thay đổi (insertions + deletions).

| Thứ tự | PR | Ước tính dòng | Lý do đứng ở đây |
|---|---|---|---|
| 0 | Các spec này | ~570 (chỉ doc) | Nền cho mọi PR sau. |
| 1 | AC2 - lint web | ~275 | Code giữ luật web trước khi AC1 bỏ doc khỏi context. |
| 2 | AC3 - drift spec + Stop hook | ~350 | Luật "phải luôn đúng" có check trước khi AC1 cắt chữ. |
| 3-6 | AC1 - bốn PR chuyển luật sang `.claude/rules/` | ~550 / ~500 / ~500 / ~750 | Tách theo vùng để PR dưới 900 dòng. |
| - | **Pilot A/B** (mục 3) | 0 PR | Chạy ngoài repo; arm B là commit sau PR 6. |
| 7 | AC5 - skill | ~30 | Sau pilot, để không lẫn vào kết quả. |
| 8 | AC6 - archive | ~40 (rename tính 0 dòng khi git nhận ra rename) | Chỉ làm nếu pilot cho thấy agent đọc plan cũ. |
| 9 | AC4 - `/new-env-var` | ~200 | Thêm `/new-admin-route`, `/new-discord-command` khi workflow đó lặp lại. |

Tổng: **10 PR**, tính cả PR 0. Hai command thêm của AC4 làm con số lên 12. Bỏ AC6 nếu pilot không
cần thì còn 9.

## 3. Pilot A/B

Chi tiết nằm ở report HTML, phần "Pilot A/B". Phần chốt lại ở đây:

- Arm A: `798cd53`. Arm B: commit sau PR 6 (AC1 + AC2 + AC3). Trong pilot không có AC4-AC6.
- Ba task: T1 thêm env `ATTENDANCE_REMINDER_ENABLED`; T2 trang admin thống kê 4 tuần (full-stack);
  T3 icon "đang nghỉ" trong danh sách thành viên.
- 3 task × 2 arm × 3 lần = 18 lượt `claude -p --output-format json`, mỗi lượt một worktree mới.
- Không thêm gì vào repo. Judge script, hidden checklist và hook `InstructionsLoaded` truyền qua
  `--settings` lúc chạy.
- Chỉ số chính: số vi phạm convention mỗi lượt. B thắng khi số vi phạm bằng 50% của A hoặc ít hơn.
  Phụ: test/lint pass, token, byte luật đã nạp, Blocker từ reviewer mù nhãn, phút sửa tay.
- N = 3 mỗi ô nên kết quả chỉ mang tính mô tả, không kết luận thống kê.
- Cần xác minh trước khi chạy: `--setting-sources project` có loại plugin và mod user-scope ra khỏi
  cả hai arm không. Hook của mod vẫn chạy trong `claude -p`. Không dùng `--bare`, vì `--bare` tắt
  luôn Stop hook của arm B.

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
