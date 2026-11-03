# 01: Chuyển danh sách Quân hiệu sang shared

Spec: [`docs/specs/2026-11-03-tactic-insignia-rename.md`](../../specs/2026-11-03-tactic-insignia-rename.md)

**What to build:** Prefactor, không đổi hành vi. Mỗi Quân hiệu có một key cố định, đặt trong một enum
của `packages/shared`, ví dụ `attack`, `defense`, `mobile`, `scout`, `rally`, `tower`, `escort`, khớp
theo thứ tự với 7 Quân hiệu hiện có. Danh sách Quân hiệu (key, icon, tên mặc định, thứ tự hiển thị)
và cách đặt nhãn "Đội N" chuyển từ module built-in tokens của web sang shared, để ticket 03 kiểm tra
trùng tên được ở API. Web (palette, các token dựng sẵn, quân mặc định đang chọn) đọc từ shared.
Palette nhìn và hoạt động y như trước.

**Blocked by:** None (can start immediately).

**Model:** sonnet - đổi interface dùng chung giữa shared và web, sửa hơn 2 file

**Status:** done

- [x] Shared export enum key Quân hiệu, danh sách Quân hiệu (key, icon, tên mặc định) theo đúng thứ tự hiện tại, và hàm đặt nhãn "Đội N".
- [x] Web không còn tự khai báo tên mặc định hay pattern "Đội N" nào.
- [x] Theo quy tắc trong `.claude/rules/shared.md`, shared được build lại và các test hiện có của shared, web và API vẫn xanh. Test của built-in tokens và palette không cần sửa nội dung kiểm.
- [x] Đã có test của shared kiểm rằng key là duy nhất và danh sách có đủ 7 Quân hiệu.
- [x] `pnpm --filter web` và `--filter @guild/shared` chạy typecheck và lint đều sạch.
