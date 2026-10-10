# AC4 - Command cho workflow chạm nhiều chỗ

Ngày: 2026-10-10 · Trạng thái: **spec, chưa triển khai** · Tổng quan:
[`2026-10-10-agent-context-review-overview.md`](2026-10-10-agent-context-review-overview.md) · Phụ
thuộc: AC3 (drift spec là bước kiểm cuối của command)

## 1. Vấn đề

Ba workflow có checklist nhiều chỗ, hiện chỉ mô tả bằng văn:

| Workflow | Chỗ phải chạm | Nguồn |
|---|---|---|
| Env var mới cho api | `env.validation.ts`, `.env.example`, `development.md` §3, `production.md` §3 | `CLAUDE.md:50-51` |
| Route admin mới | `ADMIN_PATH_PREFIXES`, `getSession()` trong page, guard ở API (+ `ROUTES`) | `apps/web/CLAUDE.md:103-104` |
| Discord slash command | một file trong `commands/`, một dòng trong `commands/index.ts`, chạy `pnpm discord:register` bằng tay | `apps/api/CLAUDE.md:50-58` |

## 2. Mục tiêu

Chỉ làm `/new-env-var` trước, theo YAGNI. Làm hai command còn lại khi workflow đó lặp lại sau khi
command đầu tiên chứng minh có ích.

## 3. Thiết kế `/new-env-var`

`.claude/skills/new-env-var/SKILL.md`, frontmatter `disable-model-invocation: true`. Usage:
`/new-env-var NAME <type> [default]`.

1. Chạy `scripts/new-env-var.mjs NAME type default`.
   - Script thêm một key vào `envSchema`, một dòng vào `.env.example`, và một hàng có placeholder vào
     hai bảng doc.
   - Idempotent: key đã có thì báo và exit 1.
   - Script đặt trong `.claude/skills/new-env-var/scripts/`, không đặt ở root.
2. Agent điền mô tả cho hàng doc và code đọc biến (`AppConfigService`).
3. Chạy drift spec của AC3 và sửa cho tới khi xanh.

## 4. Quyết định mở

- Script sửa `env.validation.ts` bằng chèn văn bản hay bằng AST (ts-morph)? Chèn văn bản đơn giản
  hơn nhưng dễ vỡ khi file đổi format. Đề xuất: chèn văn bản kèm marker comment.
- Bỏ AC4 nếu pilot cho thấy AC3 đã đủ. Agent quên chỗ nào thì drift spec bắt, có thể không cần
  scaffold.

## 5. Kích thước

1 PR, khoảng 200 dòng. Hai command sau, nếu làm, mỗi cái thêm 1 PR khoảng 150-250 dòng.
