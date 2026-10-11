# AC4 - Command cho workflow chạm nhiều chỗ

Ngày: 2026-10-10 · Trạng thái: **không làm** (quyết định 2026-10-11, mục 4) · Tổng quan:
[`2026-10-10-agent-context-review-overview.md`](2026-10-10-agent-context-review-overview.md) · Phụ
thuộc: AC3 (drift spec là bước kiểm cuối của command)

## 1. Vấn đề

Ba workflow có checklist nhiều chỗ, hiện chỉ mô tả bằng văn:

| Workflow | Chỗ phải chạm | Nguồn |
|---|---|---|
| Env var mới cho api | `env.validation.ts`, `.env.example`, `development.md` §3, `production.md` §3 | `CLAUDE.md:50-51` |
| Route admin mới | `ADMIN_PATH_PREFIXES`, `getSession()` trong page, guard ở API (+ `ROUTES`) | `apps/web/CLAUDE.md:35-36` |
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
   - Từ chối trùng: key đã có thì báo và exit 1, không ghi gì.
   - Script đặt trong `.claude/skills/new-env-var/scripts/`, không đặt ở root.
2. Agent điền mô tả cho hàng doc và code đọc biến (`AppConfigService`).
3. Chạy drift spec của AC3 và sửa cho tới khi xanh.

## 4. Quyết định: không làm (2026-10-11)

User chọn không làm AC4. Lý do:

- **AC3 đã bắt phần script định sinh.** `apps/api/src/config/__tests__/env-example.spec.ts` đỏ ở cả
  3 chỗ (`.env.example`, bảng `development.md`, bảng `production.md`) khi một trong số đó lệch với
  `env.validation.ts` (tổng quan, mục 3, "Kết quả đo tất định"). Script chỉ sinh cái test đã ép.
- **Script không chạm phần agent dễ sót.** Mô tả hàng doc và code đọc biến qua `AppConfigService`
  (bước 2 ở mục 3) vẫn do agent làm tay, và AC3 không bắt bước đó.
- **Workflow hiếm.** Cả lịch sử repo có 11 commit chạm `env.validation.ts`; commit gần nhất là
  `322942d` (2026-09-20). Chưa đếm bao nhiêu commit trong đó thêm biến.
- **Không có dữ liệu cho thấy cần.** Pilot T1: mỗi arm một lượt, cả hai sửa đủ 4 chỗ (N = 1).
- **Giá giữ code.** Khoảng 200 dòng script chèn văn bản theo marker, dễ vỡ khi file đổi format.

Câu hỏi chèn văn bản hay AST không còn cần trả lời. `/new-admin-route` và `/new-discord-command` cũng
không làm. Xem lại AC4 chỉ khi có bằng chứng agent sót một trong 4 chỗ mà AC3 không bắt.

Việc liên quan đáng làm hơn: tổng quan mục 3 ghi rule `.claude/rules/api/config.md` không nạp khi
agent sửa `env.validation.ts`, dù glob là `apps/api/src/config/**`. Đó là chỗ hở thật của luồng thêm
env var; cần điều tra trước khi tin AC1 cho task sửa env.

## 5. Kích thước

Ước tính trước quyết định: 1 PR khoảng 200 dòng, mỗi command sau thêm 1 PR khoảng 150-250 dòng. Không
làm nên 0 PR.
