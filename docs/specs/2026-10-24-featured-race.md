# Trang chủ mới và Bảng vàng đua mèo

Status: approved

## Problem Statement

Trang chủ `/trang-chu` là nơi khách từ Discord đến đầu tiên. Nó giới thiệu bang qua năm khối: hero,
trụ cột, ban chỉ huy, cách gia nhập, lời mời điểm danh. Bang thấy trang này nhạt: mọi khối cùng một
khuôn, và trang không cho thấy bang đang sống. Đua mèo là hoạt động vui nhất của bang và có kết quả
cụ thể (ai thắng giải gì), nhưng hiện chỉ người có quyền đua mèo mới xem được, trong màn quản trị.
Admin không có cách nào khoe các đợt đua với khách và với cả bang.

## Solution

- **Trang chủ được làm lại về visual**, giữ nguyên nội dung và copy của năm khối hiện có. Hero vẫn
  dùng cảnh `landing.jpg`, cao, nhưng typography lớn và mạnh hơn, có con dấu bang, CTA rõ hơn.
- **Khối Bảng vàng** đứng ngay dưới hero. Nó hiện tối đa 3 **Featured race** mới nhất, xếp theo
  ngày kết thúc. Mỗi đợt hiện tên đợt, ngày kết thúc, tổng số người tham gia, và các hạng mục xếp
  theo hạng giải (HIGH, MEDIUM, LOW), mỗi hạng mục liệt kê người thắng (tên nhân vật, class).
  - Desktop: đợt mới nhất là thẻ lớn bên trái, tối đa 2 đợt cũ hơn xếp dọc bên phải. Chỉ một đợt
    thì thẻ lớn chiếm cả chiều ngang.
  - Phone: các thẻ xếp dọc, đợt mới nhất trên cùng.
  - Khi cuộn tới, người thắng hiện lần lượt, giải HIGH lấp lánh vàng một lần. Không lặp. Mọi chuyển
    động tắt khi `prefers-reduced-motion`.
  - Chưa có Featured race nào thì khối bị ẩn hẳn.
- **Công tắc "Hiện ở trang chủ"** nằm ở trang chi tiết đợt đua `/dua-meo/[id]`. Chỉ bật được khi
  đợt đã kết thúc và còn ít nhất một vòng chưa bị huỷ; nếu không, công tắc bị vô hiệu kèm lý do.
  Danh sách `/dua-meo` gắn huy hiệu "Bảng vàng" cho đợt đang bật.
- Bật hay tắt có hiệu lực ở lần tải trang chủ kế tiếp. Không đăng gì lên Discord.

## User Stories

1. Là khách chưa đăng nhập, tôi muốn thấy hero ấn tượng khi mở trang chủ, để biết ngay đây là bang
   nào và bang nghiêm túc.
2. Là khách, tôi muốn thấy Bảng vàng ngay dưới hero, để thấy bang có hoạt động thật và có thưởng.
3. Là khách, tôi muốn thấy ai thắng giải gì ở đợt đua mới nhất, để biết bang thưởng cho thành viên.
4. Là khách, tôi muốn giải HIGH nổi bật hơn giải MEDIUM và LOW, để biết giải nào giá trị nhất.
5. Là khách, tôi muốn thấy ngày kết thúc và số người tham gia của mỗi đợt, để biết đợt đó gần đây và
   đông vui ra sao.
6. Là khách trên điện thoại, tôi muốn các thẻ Bảng vàng xếp dọc và dễ đọc, để không phải vuốt ngang.
7. Là khách bật giảm chuyển động, tôi muốn Bảng vàng hiện tĩnh, để không bị chóng mặt.
8. Là khách, tôi không muốn thấy khối trống khi bang chưa khoe đợt nào, để trang không trông bỏ dở.
9. Là thành viên, tôi muốn thấy tên mình trên Bảng vàng ở trang public, để có cái khoe với bạn.
10. Là thành viên, tôi không muốn trang public lộ Discord hay số vé của tôi, để thông tin cá nhân
    chỉ ở trong bang.
11. Là thành viên đã đăng nhập, tôi muốn CTA của hero vẫn đưa tôi tới trang điểm danh, như hiện nay.
12. Là admin đua mèo, tôi muốn bật "Hiện ở trang chủ" cho một đợt đã kết thúc, để khoe kết quả.
13. Là admin đua mèo, tôi muốn tắt công tắc đó, để gỡ một đợt khỏi trang chủ.
14. Là admin đua mèo, tôi muốn công tắc bị vô hiệu kèm lý do khi đợt chưa kết thúc, để không khoe
    một kết quả còn có thể huỷ vòng.
15. Là admin đua mèo, tôi muốn công tắc bị vô hiệu khi mọi vòng của đợt đã bị huỷ, để không khoe một
    đợt không có người thắng.
16. Là admin đua mèo, tôi muốn thấy huy hiệu "Bảng vàng" ở danh sách đợt đua, để biết đợt nào đang
    được khoe mà không phải mở từng đợt.
17. Là admin đua mèo, tôi muốn bật nhiều đợt cùng lúc, và trang chủ tự hiện 3 đợt mới nhất trong số
    đó, để không phải tắt đợt cũ mỗi khi khoe đợt mới.
18. Là admin đua mèo, tôi muốn bật hay tắt có hiệu lực ngay ở lần tải trang chủ kế tiếp, để kiểm tra
    được ngay.
19. Là người không có quyền đua mèo, tôi không được bật hay tắt Featured race.
20. Là admin đua mèo, tôi muốn vòng bị huỷ không bao giờ hiện trên Bảng vàng, để Bảng vàng khớp với
    kết quả thật.

## Implementation Decisions

- **Thuật ngữ**: Featured race (UI: "Bảng vàng"), đã ghi trong `GLOSSARY.md`. Không dùng "quay
  thưởng".
- **Schema**: `CatRaceEvent` thêm cột `featuredAt DateTime?`. Null nghĩa là không được khoe. Giá trị
  được ghi từ `Clock`, giống `endedAt`. Đây là thay đổi cộng thêm, không phá dữ liệu cũ.
- **Quy tắc bật** (trong module `cat-race`): chỉ bật được khi `endedAt` khác null và có ít nhất một
  vòng chưa bị huỷ. Nếu không, trả 409 với thông báo tiếng Việt. Tắt luôn được. Bật lại một đợt đã
  bật không đổi gì (idempotent).
- **Endpoint ghi**: `PUT /cat-races/:id/featured`, body `{ featured: boolean }`. Endpoint nằm trong
  controller đua mèo hiện có, sau `JwtAuthGuard` và `Capability.CAT_RACE`. Nó trả về chi tiết đợt.
- **Endpoint đọc public**: `GET /public/featured-races`, không guard, trong một controller riêng của
  module `cat-race`. Một prefix riêng giúp route public không lẫn với `/cat-races/:id` được bảo vệ.
  Nó trả tối đa `FEATURED_RACE_LIMIT = 3` đợt có `featuredAt` khác null, xếp theo `endedAt` giảm dần.
- **Shape public** (Zod trong `packages/shared`): mỗi đợt gồm `id`, `name`, `endedAt`,
  `participantCount`, và `prizes[]`. Mỗi prize gồm `name`, `tier`, `winners[]`. Mỗi winner gồm
  `name` và `guildClass`. Prize xếp theo tier rồi `sortOrder`; winner xếp theo `drawnAt`. Shape
  **không** có số vé, Discord, id nhân vật, hay vòng bị huỷ. Prize không có người thắng hợp lệ thì
  bị bỏ khỏi shape.
- **Summary và detail** của đợt đua (shape trong `packages/shared`) thêm `featured: boolean`. Danh
  sách cần nó cho huy hiệu, chi tiết cần nó cho công tắc.
- **Web, trang chủ**: page server-render gọi endpoint public không kèm token. Trang vốn đã dynamic
  vì đọc session, nên không có cache. Nếu lời gọi lỗi, trang vẫn render và khối Bảng vàng bị ẩn,
  vì khách không được thấy trang chủ hỏng chỉ vì một khối phụ. Lỗi đó được ghi log ở server.
- **Web, landing feature**: thêm khối Bảng vàng, nhận danh sách Featured race làm prop. Năm khối cũ
  được làm lại visual bằng `redesign-skill`, tuân `docs/design-direction.md`: đúng vai trò màu,
  `font-heading` cho tiêu đề, ScrollReveal cho các khối dưới hero.
- **Web, cat-race feature**: thêm công tắc ở màn chi tiết, theo `interaction.md`, dùng mutation như
  các thao tác đua mèo khác. Thêm huy hiệu ở màn danh sách.
- **Design direction**: mở rộng vai trò vàng (`--gold`). Vàng được dùng cho Featured race: tiêu đề
  Bảng vàng, viền và huy chương của giải HIGH. Vàng vẫn không bao giờ là màu trạng thái. Cập nhật
  `docs/design-direction.md`.

## Testing Decisions

- Test chỉ kiểm hành vi nhìn từ ngoài: dữ liệu vào và ra, phần tử người dùng thấy. Không kiểm
  class CSS hay cấu trúc nội bộ.
- **Seam 1 - `CatRaceService`** (Jest, Prisma mock bằng `cat-race.fixtures.ts`, giống
  `cat-race.service.spec.ts` và `cat-race.service.writes.spec.ts`):
  - bật đợt đang mở trả 409; bật đợt mà mọi vòng đã huỷ trả 409; bật đợt hợp lệ ghi `featuredAt`
    từ Clock; tắt ghi null; bật lại không đổi `featuredAt`.
  - đọc public: tối đa 3 đợt, xếp theo `endedAt`; vòng bị huỷ và prize không người thắng bị bỏ;
    shape không có số vé.
- **Seam 2 - controller** (giống `cat-race.controller.spec.ts`): route ghi đòi `CAT_RACE`; route
  public không có guard.
- **Seam 3 - `LandingScreen`** (Vitest + Testing Library, giống `landing-screen.test.tsx`):
  - không có Featured race thì không có khối Bảng vàng.
  - có đợt thì hiện tên đợt, tên hạng mục, tên người thắng; không có số vé.
  - năm khối cũ vẫn có đủ nội dung (các test hiện có tiếp tục xanh).
- **Seam 4 - màn chi tiết đua mèo** (Vitest): công tắc bị vô hiệu kèm lý do khi đợt chưa kết thúc
  hoặc không còn vòng hợp lệ; bấm công tắc gọi mutation với giá trị đúng.
- Schema Zod public có test trong `cat-race.schema.spec.ts` nếu nó có quy tắc riêng.

## Out of Scope

- Số liệu live mới trên trang chủ (số thành viên, lịch trận, ...) ngoài Featured race.
- Đăng thông báo Discord khi bật Featured race.
- Trang public riêng cho từng đợt đua, hay xem hết các đợt cũ.
- Đổi nội dung hay copy của năm khối cũ.
- Phát lại cuộc đua (Staging) trên trang chủ.

## Further Notes

- Trang chủ là public: ai trên internet cũng đọc được tên nhân vật và class của người thắng. Bang đã
  đồng ý điều này (2026-10-24).
- Đợt đã kết thúc bị khoá mọi thao tác ghi, nên kết quả của Featured race là kết quả cuối.
- Thay đổi schema chạm `apps/api`, nên khi merge, CI migrate production trước rồi mới deploy. Cột mới
  nullable, nên code cũ vẫn chạy với schema mới.
