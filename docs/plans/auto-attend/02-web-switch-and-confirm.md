# 02: Switch trên màn điểm danh và dialog xác nhận

Spec: [`docs/specs/2026-10-27-auto-attend.md`](../../specs/2026-10-27-auto-attend.md)

**What to build:** Trên màn điểm danh, thành viên thấy trạng thái Tự động điểm danh của mình và bật/tắt
nó bằng một switch đặt cạnh nút `Xin nghỉ`. Bật cần xác nhận qua dialog cảnh báo mọi trận trong tương
lai sẽ được điểm danh "Có"; tắt thì tắt ngay. Ô tự động có icon riêng do bước thiết kế chốt.

**Blocked by:** 01 (Bật/tắt qua API và lưới hiện "Có · Tự động")

**Status:** todo

- [ ] Trước khi code: chạy `redesign-skill` cho switch, dialog và icon ô tự động, theo
      `docs/design-direction.md` và `.claude/rules/web/`; ghi quyết định thiết kế vào ticket này.
- [ ] Hàm fetch cho `GET`/`PUT /auto-attend/me` trong `api/` của feature `attendance`, typed bằng schema
      shared; hook đọc trạng thái.
- [ ] Switch hiện đúng trạng thái đọc từ API, cạnh nút `Xin nghỉ`; nhãn "Tự động điểm danh".
- [ ] Bật: mở dialog (cùng shell dialog các thao tác ghi), tiêu đề "Bật tự động điểm danh?", nội dung
      cảnh báo mọi trận trong tương lai sẽ được điểm danh **Có**, nhắc đổi thành **Không** trước hạn
      chót hoặc dùng Xin nghỉ; nút `Bật` / `Để sau`. API chỉ được gọi sau khi bấm `Bật`; `Để sau` giữ
      switch tắt.
- [ ] Tắt: gọi API ngay, không dialog.
- [ ] Thành công → toast; điểm danh và tally tải lại, ô đổi giữa `Có · Tự động` và "chưa phản hồi".
      Lỗi → hiện message tiếng Việt từ API, switch về trạng thái cũ.
- [ ] Ô `auto` dùng icon đã thiết kế, vẫn có nhãn `Có · Tự động` cho trình đọc màn hình.
- [ ] Không tràn ngang ở 360px.
- [ ] Test theo mẫu `attendance-screen.test.tsx`, `leave-dialog.test.tsx`: switch hiện trạng thái, bật
      mở dialog và chỉ gọi API sau xác nhận, `Để sau` không gọi, tắt gọi ngay.
- [ ] `pnpm --filter web` test, typecheck, lint xanh.
