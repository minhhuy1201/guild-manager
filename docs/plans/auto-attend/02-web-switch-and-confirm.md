# 02: Switch trên màn điểm danh và dialog xác nhận

Spec: [`docs/specs/2026-10-27-auto-attend.md`](../../specs/2026-10-27-auto-attend.md)

**What to build:** Trên màn điểm danh, thành viên thấy trạng thái Tự động điểm danh của mình và bật/tắt
nó bằng một switch đặt cạnh nút `Xin nghỉ`. Bật cần xác nhận qua dialog cảnh báo mọi trận trong tương
lai sẽ được điểm danh "Có"; tắt thì tắt ngay. Ô tự động có icon riêng do bước thiết kế chốt.

**Blocked by:** 01 (Bật/tắt qua API và lưới hiện "Có · Tự động")

**Status:** done

- [x] Trước khi code: chạy `redesign-skill` cho switch, dialog và icon ô tự động, theo
      `docs/design-direction.md` và `.claude/rules/web/`; ghi quyết định thiết kế vào ticket này.
- [x] Hàm fetch cho `GET`/`PUT /auto-attend/me` trong `api/` của feature `attendance`, typed bằng schema
      shared; hook đọc trạng thái.
- [x] Switch hiện đúng trạng thái đọc từ API, cạnh nút `Xin nghỉ`; nhãn "Tự động điểm danh".
- [x] Bật: mở dialog (cùng shell dialog các thao tác ghi), tiêu đề "Bật tự động điểm danh?", nội dung
      cảnh báo mọi trận trong tương lai sẽ được điểm danh **Có**, nhắc đổi thành **Không** trước hạn
      chót hoặc dùng Xin nghỉ; nút `Bật` / `Để sau`. API chỉ được gọi sau khi bấm `Bật`; `Để sau` giữ
      switch tắt.
- [x] Tắt: gọi API ngay, không dialog.
- [x] Thành công → toast; điểm danh và tally tải lại, ô đổi giữa `Có · Tự động` và "chưa phản hồi".
      Lỗi → hiện message tiếng Việt từ API, switch về trạng thái cũ.
- [x] Ô `auto` dùng icon đã thiết kế, vẫn có nhãn `Có · Tự động` cho trình đọc màn hình.
- [ ] Không tràn ngang ở 360px (chưa kiểm bằng mắt: hàng dùng `flex-wrap`, ô công tắc co theo độ dài nhãn).
- [x] Test theo mẫu `attendance-screen.test.tsx`, `leave-dialog.test.tsx`: switch hiện trạng thái, bật
      mở dialog và chỉ gọi API sau xác nhận, `Để sau` không gọi, tắt gọi ngay.
- [x] `pnpm --filter web` test, typecheck, lint xanh.

## Quyết định thiết kế

`redesign-skill` chỉ áp dụng phần còn hợp lệ với app này; `docs/design-direction.md` và
`.claude/rules/web/` thắng khi hai bên khác nhau (không đổi font, không đổi palette, không thêm thư viện).

- **Công tắc** là một ô viền `bg-card`, `h-10`, bo `rounded-inner`, đứng cạnh nút `Xin nghỉ phép`
  trong một hàng `flex-wrap`: icon `Repeat` + nhãn "Tự động điểm danh" (`FieldLabel`, bấm nhãn cũng
  bật được) + `Switch`. Khi bật, viền và nền ngả emerald (`border-emerald-500 bg-emerald-500/5`,
  công tắc `emerald-600`), cùng ngôn ngữ với ô "Có" của thẻ thành viên; emerald được phép vì đây
  chính là trạng thái "Có".
- **Trạng thái tải:** khung chờ `Skeleton` cùng kích thước, để hàng không nhảy. Không đọc được trạng
  thái (admin cứu hộ chưa có nhân vật nhận 404) thì không hiện gì: không có câu trả lời thường trực
  để bật.
- **Hộp thoại xác nhận** dùng `MutationDialog` (tiêu đề `font-heading` do `DialogTitle`): "Bật tự động
  điểm danh?", một câu nói thẳng cam kết, ba gạch đầu dòng (đổi thành Không trước hạn chót hoặc dùng
  Xin nghỉ phép; câu trả lời đã bấm giữ nguyên; tắt bất cứ lúc nào, ngày đã khoá giữ Có), nút `Bật`
  (icon `Repeat`) và `Để sau`. Không dùng amber hay đỏ: đây là một lời nhắc, không phải cảnh báo
  phá huỷ.
- **Ô lưới `auto`:** `StatusIcon` tone success với icon `Repeat` thay cho thanh kiếm, nhãn
  `Có · Tự động`. Cùng icon với công tắc và nút Discord (🔁) nên người dùng nhận ra một thứ ở cả ba nơi.
- **Chuyển động và phản hồi:** chỉ `transition-colors` `--duration-fast` trên ô công tắc; toast
  thành công khi bật (qua `MutationDialog`) và khi tắt, toast lỗi khi tắt thất bại.
- **Chưa kiểm bằng mắt:** màn này cần đăng nhập Discord nên chưa chạy thử trên trình duyệt; kiểm bằng
  test hành vi (`auto-attend-toggle.test.tsx`).
