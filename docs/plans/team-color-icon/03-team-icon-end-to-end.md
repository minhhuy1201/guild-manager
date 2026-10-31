# 03: Team icon end to end

Spec: [`docs/specs/2026-10-31-team-color-icon.md`](../../specs/2026-10-31-team-color-icon.md) ·
Thiết kế: [`docs/specs/2026-10-31-team-color-icon-design.md`](../../specs/2026-10-31-team-color-icon-design.md)

**What to build:** Popover của nút màu (từ ticket 02) có thêm lưới **Team icon** bên dưới lưới màu, ô
"Không biểu tượng" đứng đầu. Bộ 9 biểu tượng: Trụ (castle), Công (swords), Thủ (shield), Cơ động
(footprints), Trinh sát (eye), Bảo tiêu (truck), Top lane (`ArrowUpLeft`), Mid lane
(`MoveDiagonal`), Bot lane (`ArrowDownRight`). Tất cả là Lucide, không tự vẽ SVG. Đội có icon thì icon
thay chỗ chấm màu và mang Team color. Đội không có icon thì hiện chấm như cũ. Lưu cùng nút Save và cùng
version với tên và màu. Ảnh Formation announcement và ảnh Team notice hiện icon.

Theo thiết kế:
- **DB**: Prisma enum `TeamIcon` khớp shared, bảng `TeamIconChoice` cùng hình dạng với
  `TeamColorChoice`, migration chỉ thêm và có RLS.
- **Shared**: enum `TeamIcon` (`CASTLE`, `SWORDS`, `SHIELD`, `FOOTPRINTS`, `EYE`, `TRUCK`, `TOP_LANE`,
  `MID_LANE`, `BOT_LANE`), record icon theo số đội, thêm `icons` vào bundle `TeamSettings`.
- **API**: save xoá và tạo lại cả ba bảng trong cùng transaction.
- **Web**: bảng tra icon → `{ label, Icon }` khai báo đủ `Record`, để thiếu icon là lỗi compile. Draft
  có thêm thao tác đặt icon (`null` xoá key). `aria-label` của nút đọc cả màu lẫn icon.
- UI lưới icon làm bằng skill `redesign-skill`, CHỈ trong popover và header card.

**Blocked by:** 02 - Team color end to end

**Status:** done

- [x] Test service API: `icons` lưu/đọc cùng `names` và `colors`, đúng luật key, version cũ trả 412.
- [x] Test màn `TeamBuilderScreen`: chọn icon thì header hiện icon thay chấm; "Không biểu tượng" xoá key và chấm hiện lại; Save gửi đủ ba record; `readOnly` hiện icon nhưng không có nút.
- [x] Migration có RLS, `prisma-enum-sync.spec.ts` xanh.
- [x] `pnpm --filter api test`, `pnpm --filter web test`, typecheck và lint của cả hai app xanh.
