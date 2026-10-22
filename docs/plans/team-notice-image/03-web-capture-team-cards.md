# 03: Web chụp card team và gửi kèm Team notice

Spec: [`docs/specs/2026-10-22-team-notice-image.md`](../../specs/2026-10-22-team-notice-image.md)

**What to build:** Admin bấm "Gửi thông báo" với "Nhắn riêng từng người" đang bật. Web chụp ảnh trận và gửi Formation announcement như cũ. Chỉ sau khi announcement thành công, web mới chụp card của từng team có người và gửi các ảnh đó trong request notify-members. Mỗi thành viên nhận DM có ảnh card team của mình. "Nhắn lại người lỗi" và "Thử lại" chụp lại đúng các cặp cần.

**Blocked by:** 02

**Status:** todo

- [ ] Card team trong sheet chụp off-screen mang data attribute ghi số trận và số team. Hàm chụp đọc node theo attribute đó, đếm sai số thì báo lỗi, giống `readCaptureNodes`.
- [ ] Chụp ảnh team dùng cùng thông số với ảnh trận (webp, scale, dpr 1, nhúng font). Chỉ chụp cặp (trận, team) có người. Khi nhắn lại, chỉ chụp cặp chứa người trong `notices`.
- [ ] Thứ tự: chụp ảnh trận → announce → chụp ảnh team → notify-members. Chụp ảnh trận lỗi thì dừng như cũ.
- [ ] Chụp ảnh team lỗi (toàn bộ hoặc một team) vẫn gọi notify-members, không kèm ảnh của team lỗi. Không toast lỗi riêng.
- [ ] Ảnh dài hơn `TEAM_IMAGE_MAX_CHARS` thì bỏ khỏi body.
- [ ] Request API mang `teamImages`. Test API web và test hook cập nhật.
- [ ] Spec lát 1 trỏ sang spec này ở chỗ nói "lát ảnh làm sau".
- [ ] `pnpm --filter web typecheck`, `lint`, `test` xanh. `pnpm --filter api test` vẫn xanh.
