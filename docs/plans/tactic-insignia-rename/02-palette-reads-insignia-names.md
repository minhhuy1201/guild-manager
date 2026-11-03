# 02: Palette hiện tên hiện tại của Quân hiệu

Spec: [`docs/specs/2026-11-03-tactic-insignia-rename.md`](../../specs/2026-11-03-tactic-insignia-rename.md)

**What to build:** Luồng đọc, xuyên từ DB tới palette. Có bảng mới `TacticInsigniaName` (`key` là khoá
chính kiểu `String`, `label VarChar(40)`, `updatedAt`), là cấu hình chung của guild giống
`TacticTokenPreset`. `GET /tactics/insignia` mở cho mọi người đã đăng nhập, trả về đủ 7 Quân hiệu
theo thứ tự hiển thị, mỗi phần tử là `{ key, icon, label, defaultLabel }`. `label` là tên riêng nếu
có, nếu không thì là tên mặc định. Hàng có key không còn trong danh sách shared bị bỏ qua và ghi log.
Palette của web đọc endpoint này qua một hook mới đặt cạnh `useTokenPresets`, và hiện tên hiện tại
(cả nút, tooltip và `sr-only`). Trong lúc đang tải, palette hiện tên mặc định từ shared.

Làm theo `docs/architecture.md` §5 và §7, `.claude/rules/prisma.md`, `.claude/rules/api/module.md`
và các rule `web/` (data-flow, tests). Placed token không bị đụng tới.

**Blocked by:** 01 (Chuyển danh sách Quân hiệu sang shared)

**Model:** sonnet - có bảng mới, migration và endpoint

**Status:** done

- [x] Migration được tạo bằng `prisma:migrate` trên DB local và được commit. Migration có `ENABLE ROW LEVEL SECURITY` cho bảng mới, nên `migration-rls.spec` xanh. Data API grants đã được kiểm theo `docs/production.md` §5.
- [x] `tacticInsigniaSchema` nằm trong shared. Response được type bằng schema này ở cả hai phía.
- [x] Service test: không có hàng thì trả về tên mặc định, có hàng thì trả về tên riêng, hàng có key lạ bị bỏ qua, thứ tự đúng.
- [x] HTTP test: member đọc được `GET /tactics/insignia`. Request chưa đăng nhập bị chặn.
- [x] Web test: palette hiện tên đã đổi khi API trả về tên riêng, và hiện tên mặc định khi đang tải.
- [x] Test, typecheck và lint của api, web và shared đều xanh.

Ghi chú khi làm: local đã kiểm (`relrowsecurity = t`, không có grant nào ngoài `postgres`). Hai câu query
của `docs/production.md` §5 cần chạy lại trên Supabase sau khi merge. Quân mặc định đang chọn trong
editor lấy theo tên hiện tại của Quân hiệu đầu tiên, nên đặt quân trước khi chọn gì vẫn mang tên mới
(story 16).
