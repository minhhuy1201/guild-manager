# 01: Một bảng tra màu đội duy nhất

Spec: [`docs/specs/2026-10-31-team-color-icon.md`](../../specs/2026-10-31-team-color-icon.md) ·
Thiết kế: [`docs/specs/2026-10-31-team-color-icon-design.md`](../../specs/2026-10-31-team-color-icon-design.md)

**What to build:** Prefactor, không đổi hành vi. Hôm nay màu đội nằm ở 3 danh sách phải đồng bộ tay: bảng đội →
nhóm màu dùng chung phía web, bảng nhóm → class Tailwind của team builder, và bảng nhóm → hex trong
icon token của map chiến thuật. Gộp cả ba thành một bảng tra duy nhất phía web, đánh khoá bằng enum
**Team color** mới trong `packages/shared/enums`. Enum có 8 giá trị: `JADE`, `STONE`, `NAVY`, `GOLD`,
`RED`, `PURPLE`, `ORANGE`, `SKY`. Mỗi màu có class header, class marker (literal đầy đủ, vì Tailwind
quét source) và mã hex cho canvas. Một hàm resolve trả màu của một đội từ record màu đã chọn. Record
rỗng thì trả màu nhóm mặc định hiện tại (1-5 jade, 6-7 stone, 8 navy, 9-10 gold). Số đội ngoài bảng
mặc định thì throw, thay cho fallback âm thầm đang có. Card trên team builder và token "Đội N" trên map
đều đọc qua bảng này, với record rỗng.

Thêm token CSS light/dark cho 4 màu mới, theo cách các token `jade`/`gold` đang được khai báo. Dùng
skill `redesign-skill`, CHỈ để chọn giá trị 4 màu mới cho hợp palette hiện có và kiểm tra độ phân biệt
giữa 8 màu ở cả hai theme. Cần chú ý `SKY` so với `NAVY`. Nếu `SKY` không phân biệt được, đổi sang một
hue khác và cập nhật spec cùng thiết kế. Không thiết kế lại phần nào khác.

Prisma chưa cần enum này ở ticket này (ticket 02 thêm), nên chưa đụng `prisma-enum-sync`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Enum Team color 8 giá trị có trong `@guild/shared/enums` và được export.
- [x] Một bảng tra duy nhất phía web. Ba danh sách cũ bị xoá, không còn import nào tới chúng.
- [x] Card team builder và token map hiện đúng màu như trước (test có sẵn vẫn xanh, thêm test cho hàm resolve: mặc định theo nhóm, màu đã chọn thắng, số đội lạ throw).
- [x] 4 màu mới có token light/dark, đã kiểm tra độ phân biệt ở cả hai theme.
- [x] `pnpm --filter web test`, `typecheck`, `lint` và build `@guild/shared` đều xanh.
