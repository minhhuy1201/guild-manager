# 02: Team color end to end

Spec: [`docs/specs/2026-10-31-team-color-icon.md`](../../specs/2026-10-31-team-color-icon.md) ·
Thiết kế: [`docs/specs/2026-10-31-team-color-icon-design.md`](../../specs/2026-10-31-team-color-icon-design.md)

**What to build:** Manager có `TEAM_BUILDER` bấm chấm màu trên header card để mở popover gồm lưới 8
màu, ô "Mặc định" đứng đầu. Chọn một màu thì card đổi ngay trong draft. Nút Save của màn hình lưu màu
cùng tên đội trong một version. Version cũ thì hiện dialog xung đột như tên đội. "Mặc định" xoá màu đã
chọn. Ở chế độ `readOnly` (tuần cũ, trận đã đánh), chấm màu chỉ là ảnh tĩnh. Ảnh Formation
announcement và ảnh Team notice hiện đúng Team color, vì grid capture nhận màu qua cùng props với card.

Theo thiết kế:
- **DB**: thêm Prisma enum `TeamColor` (khớp shared) và bảng `TeamColorChoice` (khoá là số đội, cột màu
  không nullable, chỉ có dòng khi đội đã chọn). Migration chỉ thêm, có `ENABLE ROW LEVEL SECURITY` cho
  bảng mới. `TeamNameVersion` giữ tên, comment ghi rõ nó là lock của tên, màu (và icon sau này).
- **Shared**: schema record màu theo số đội, và bundle `TeamSettings` (`names` + `colors`) với bản
  save (thêm `version`) và bản state. Xoá `TeamNamesState` và `SaveTeamNamesInput`, không giữ hai
  cách làm một việc. `teamNamesSchema` giữ nguyên.
- **API**: `GET` và `PUT /team-builder/team-settings` thay cho `team-names`, quyền `TEAM_BUILDER`. Save
  bump version một lần, rồi xoá và tạo lại cả hai bảng trong một transaction. `getSavedFormation` vẫn
  trả `teamNames`, Team notice không đổi.
- **Web**: store và draft hook của tên đội đổi thành bản cho `TeamSettings`, có thêm thao tác đặt màu
  (`null` xoá key). Hàm đếm thay đổi đếm theo từng trường của từng đội. Component nút màu mới dùng
  `Popover` shadcn có sẵn. Card nhận màu đã resolve thay vì tự tính theo số đội. Grid và capture sheet
  truyền record màu cạnh `names`. Trên điện thoại, nút cao ít nhất 44px. Nút có `aria-label` đọc ra
  màu hiện tại.
- UI popover làm bằng skill `redesign-skill`, CHỈ trong header card và popover. Giữ quy ước trong
  `.claude/rules/web/`.

**Blocked by:** 01 - Một bảng tra màu đội duy nhất

**Status:** done

- [x] Test service API: lưu/đọc `colors` cùng `names`; đội không màu thì không có key; đội có màu mà không tên vẫn lưu được; version cũ trả 412 và không ghi gì.
- [x] Test màn `TeamBuilderScreen`: mở popover, chọn màu, card đổi; Save gửi `names` + `colors` + version; "Mặc định" xoá key; `readOnly` không có nút; 412 hiện dialog xung đột.
- [x] Migration mới có RLS, `migration-rls.spec.ts` và `prisma-enum-sync.spec.ts` xanh.
- [x] Không còn tham chiếu nào tới `team-names` (path), `TeamNamesState`, `SaveTeamNamesInput`.
- [x] `pnpm --filter api test`, `pnpm --filter web test`, typecheck và lint của cả hai app xanh.
