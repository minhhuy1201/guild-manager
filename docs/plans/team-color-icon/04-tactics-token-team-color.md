# 04: Token đội trên map theo Team color

Spec: [`docs/specs/2026-10-31-team-color-icon.md`](../../specs/2026-10-31-team-color-icon.md) ·
Thiết kế: [`docs/specs/2026-10-31-team-color-icon-design.md`](../../specs/2026-10-31-team-color-icon-design.md)

**What to build:** Ai đã đăng nhập (Member, Manager chỉ có `TACTICS`, Admin) mở map chiến thuật đều
thấy token "Đội N" mang **Team color** đã chọn trên team builder, kể cả ở chiến thuật cũ. Token vẫn hiện
số đội, không hiện Team icon. Token không phải đội giữ màu riêng như cũ. Trong lúc màu đang tải, token
hiện màu nhóm mặc định như hôm nay.

Theo thiết kế:
- **API**: một controller mới trong module team builder, chỉ dùng `JwtAuthGuard`, không cần Capability
  (cùng mức quyền với `GET /tactics`). Có `GET /team-builder/team-colors` trả record màu. Controller
  phải tách riêng, vì guard `TEAM_BUILDER` gắn ở cấp class của controller hiện có. Schema trả về đặt
  trong `packages/shared`.
- **Web**: một hook đọc màu đội trong feature tactics, theo mẫu fetch/query đang có của feature. Trong
  lúc tải, hook trả record rỗng. Hàm màu viền token nhận thêm record màu đội và resolve qua bảng tra
  của ticket 01. Mọi nơi vẽ token (stage view, drag preview của palette, xuất ảnh nếu có) truyền record
  này vào.

**Blocked by:** 02 - Team color end to end

**Status:** todo

- [ ] Test controller/service API: endpoint trả `colors`; user đăng nhập mà không có Capability vẫn đọc được; không đăng nhập thì 401.
- [ ] Test web: hàm màu viền token lấy Team color đã chọn cho "Đội N", lấy màu nhóm mặc định khi chưa chọn, và giữ màu riêng cho token không phải đội.
- [ ] Không còn chỗ vẽ token nào gọi hàm màu viền mà thiếu record màu đội (typecheck bắt).
- [ ] `pnpm --filter api test`, `pnpm --filter web test`, typecheck và lint của cả hai app xanh.
