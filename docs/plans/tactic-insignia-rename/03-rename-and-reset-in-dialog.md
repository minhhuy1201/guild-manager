# 03: Đổi tên và khôi phục Quân hiệu trong dialog

Spec: [`docs/specs/2026-11-03-tactic-insignia-rename.md`](../../specs/2026-11-03-tactic-insignia-rename.md)

**What to build:** Luồng ghi. Người có Capability `TACTICS` đổi tên và khôi phục Quân hiệu ngay trong
dialog quản lý quân cờ.

API:
- `PUT /tactics/insignia/:key` với body `{ label }` (`renameInsigniaSchema`: trim, 1-40 ký tự) ghi tên
  riêng (upsert) và trả về phần tử đã cập nhật. Nếu tên sau khi chuẩn hoá bằng tên mặc định thì xoá
  hàng, tức là khôi phục.
- `DELETE /tactics/insignia/:key` khôi phục tên mặc định. Gọi khi quân đã ở tên mặc định thì vẫn
  thành công (idempotent).
- Cả hai endpoint cần `TACTICS`. Key không hợp lệ trả về 400.

Kiểm tra trùng tên ở service. Tên được chuẩn hoá trước khi so (trim, NFC, chữ thường), rồi so với tên
hiện tại và tên mặc định của các Quân hiệu khác, các nhãn "Đội 1"-"Đội 10" và mọi Token preset. Nếu
trùng thì trả về 409 với thông báo "Đã có quân cờ trùng tên.". Luồng tạo Token preset cũng so với tên
hiện tại và tên mặc định của mọi Quân hiệu và các nhãn "Đội N" theo cùng cách. Tên mặc định luôn được
giữ chỗ, nên khôi phục không cần kiểm tra trùng. `@@unique([label])` của preset vẫn giữ nguyên.

Web: dialog quản lý quân cờ có phần "Quân hiệu" ở trên phần Custom. Mỗi dòng gồm:
- icon của Quân hiệu;
- ô tên, placeholder là tên mặc định;
- nút ✓ để lưu;
- nút "Khôi phục", chỉ hiện khi quân đã đổi tên.

Dòng lưu bằng Enter hoặc nút ✓. Lưu xong hiện toast "Đã đổi tên …". Rời ô mà chưa lưu thì ô trở lại
tên hiện tại. Lỗi 400 và 409 hiện ở dòng đó. Mutation invalidate query của danh sách Quân hiệu, nên
palette cập nhật ngay.

Làm theo các rule `web/` (`components`, `interaction`, `display`) và theo cách `MutationDialogShell`
đang được dùng.

**Blocked by:** 02 (Palette hiện tên hiện tại của Quân hiệu)

**Model:** sonnet - có rule trùng tên hai chiều, quyền truy cập và UI mới

**Status:** done

- [x] Schema test (shared): `renameInsigniaSchema` trim, từ chối tên rỗng và tên quá 40 ký tự.
- [x] Service test:
  - tên bằng tên mặc định thì xoá hàng;
  - trả về 409 khi trùng Quân hiệu khác (tên hiện tại, hoặc tên mặc định của một Quân hiệu đã đổi tên), trùng "Đội N" hoặc trùng preset, kể cả khác hoa thường hoặc có khoảng trắng thừa;
  - tạo preset trùng tên hiện tại hoặc tên mặc định của một Quân hiệu đã đổi tên trả về 409;
  - `DELETE` idempotent.
- [x] HTTP test: `PUT`/`DELETE` cần `TACTICS` (member nhận 403, manager có grant thì được). Key không hợp lệ trả về 400.
- [x] Dialog test:
  - lưu bằng Enter và bằng nút ✓;
  - rời ô thì bỏ thay đổi;
  - "Khôi phục" chỉ hiện khi đã đổi tên;
  - hiện lỗi 409.
- [x] Test, typecheck và lint của api, web và shared đều xanh.
