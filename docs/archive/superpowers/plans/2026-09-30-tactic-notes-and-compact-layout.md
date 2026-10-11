# Plan: ghi chú chiến thuật và layout gọn cho màn chi tiết

Spec: [`../specs/2026-09-30-tactic-notes-and-compact-layout-design.md`](../specs/2026-09-30-tactic-notes-and-compact-layout-design.md)

Nhánh: `feat/tactic-notes-compact-layout`. Mỗi bước viết test trước, chạy đỏ, rồi mới code.

## 1. Layout: header một hàng

- `tactic-breadcrumb.tsx` đổi thành `tactic-header.tsx` (`TacticHeader`, prop `title`).
- `tactic-editor-screen.tsx`: thay `PageHeader` bằng `TacticHeader`.
- Test: `__tests__/tactic-header.test.tsx` (thay `tactic-breadcrumb.test.tsx`).

## 2. Layout: khung ba hàng

- `editor-toolbar.tsx`, `stage-bar.tsx`: bỏ `rounded-lg border bg-card shadow-xs` ở phần tử gốc.
- `tactic-editor-screen.tsx`: một khung chứa toolbar (`border-b`), hàng palette + map, stage bar
  (`border-t`).
- Test: `tactic-editor-screen.test.tsx` - toolbar, palette, map, stage bar nằm trong cùng khung.

## 3. Shared: `notes`

- `packages/shared/schemas/tactic.schema.ts`: `TACTIC_LIMITS.tacticNotesLength`, `tacticNotesSchema`,
  `updateTacticSchema.notes`, `tacticDetailSchema.notes`.
- Test: `apps/api/src/modules/tactics/__tests__/tactic.schema.spec.ts`.
- `pnpm --filter @guild/shared build`.

## 4. API: cột và mapping

- `schema.prisma`: `notes String? @db.Text`; `pnpm --filter api prisma:migrate` (tên
  `add_tactic_notes`).
- `tactics.codec.ts`: `TacticRow.notes`, `toDetail` trả `notes`.
- `tactics.service.ts`: `update` ghi `notes`.
- Test: codec, service, http spec (admin được, thành viên 403).

## 5. Web: panel ghi chú

- `hooks/use-tactic-notes-draft.ts`: `editing`, `draft`, `dirty`, `saving`, `error`, `start`,
  `change`, `cancel`, `save(): Promise<boolean>`.
- `components/tactic-notes-panel.tsx`: đóng/mở, xem, sửa.
- `useTacticEditor` trả thêm `notes`.
- `tactic-editor-screen.tsx`: gắn panel vào hàng giữa; leave guard gộp hai phần chưa lưu.
- `leave-dialog.tsx`: câu mô tả nhắc cả ghi chú.
- Test: `tactic-notes-panel.test.tsx`, `tactic-editor-screen.test.tsx`.

## 6. Web: viewer

- `tactic-viewer.tsx`: prop `notes`, khối chỉ đọc bên phải (`lg`) hoặc bên dưới map.
- Test: `tactic-viewer.test.tsx`.

## 7. Tài liệu và kiểm tra

- `docs/architecture.md`, `apps/web/docs/frontend.md` §6.
- `pnpm --filter api test`, `pnpm --filter web test`, lint, typecheck của cả hai.
