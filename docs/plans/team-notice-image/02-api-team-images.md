# 02: API nhận ảnh team và gửi DM kèm ảnh

Spec: [`docs/specs/2026-10-22-team-notice-image.md`](../../specs/2026-10-22-team-notice-image.md)

**What to build:** `POST team-builder/formations/:sessionId/notify-members` nhận thêm `teamImages` (tuỳ chọn): mỗi phần tử là một cặp (trận, team) kèm một ảnh webp base64. Người nhận ở team có ảnh nhận DM có file đính kèm và text biến thể có ảnh. Team không có ảnh nhận text biến thể không ảnh như ticket 01. Gọi endpoint bằng Swagger hoặc curl với một ảnh là thấy DM có ảnh.

**Blocked by:** 01

**Status:** todo

- [ ] Schema shared: `teamImages` tối đa `TEAM_COUNT × 2` phần tử. `team` nằm trong `1..TEAM_COUNT`, `matchIndex` trong `1..2`. Không trùng cặp. Ảnh cùng regex webp với ảnh announcement, độ dài tối đa `TEAM_IMAGE_MAX_CHARS`. Thiếu `teamImages` là hợp lệ.
- [ ] `TEAM_IMAGE_MAX_CHARS × TEAM_COUNT × 2` cộng phần `notices` lớn nhất vẫn dưới `JSON_BODY_LIMIT`. `body-limit.spec.ts` khẳng định điều này.
- [ ] Team notice có ảnh gửi qua `postMessageWithFiles` vào DM channel, tên file theo mẫu `team-<N>-tran-<i>.webp`. Không có ảnh thì gửi qua `postMessage`.
- [ ] `postMessageWithFiles` có timeout 15 giây như các lệnh gọi JSON. `discord-rest.spec.ts` khẳng định điều này.
- [ ] Ảnh của cặp không có người nhận bị bỏ qua. Xử lý lỗi (`50007`, `429`, `40003`, lỗi khác) và ngân sách thời gian giữ nguyên. Upload lỗi thì vào `unsent`.
- [ ] Nhắn lại với `notices` + `teamImages` gửi đúng ảnh cho đúng người.
- [ ] Web chưa gửi `teamImages` thì hành vi giống ticket 01.
- [ ] `pnpm --filter @guild/shared build`, `pnpm --filter api typecheck`, `lint`, `test` xanh.
