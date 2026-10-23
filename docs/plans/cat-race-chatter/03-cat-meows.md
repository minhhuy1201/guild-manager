# 03: Bong bóng "meow" của mèo

Spec: [`docs/specs/2026-10-23-cat-race-chatter.md`](../../specs/2026-10-23-cat-race-chatter.md) §2-§4.

**What to build:** Mở rộng `race-chatter` cho neo `cat`: mèo trong tầm nhìn kêu ngẫu nhiên, con mới
dẫn đầu "MEOW!!", nước rút vài con "MEEEOW!!", cuối đàn kêu mệt; bong bóng bám theo mèo.

**Blocked by:** 02

**Status:** todo

- [ ] `stepChatter` (mèo): chỉ chọn mèo trong tầm nhìn, giới hạn 4, `lead-change` neo đúng `catKey`,
      20% cuối đàn dùng câu mệt.
- [ ] Test `race-chatter` cho các ý trên.
- [ ] Vẽ phía trên-phải đầu mèo, trong vùng làn, kẹp trong bề ngang canvas.
- [ ] Chạy app, xem một vòng 8 mèo và một vòng 240 mèo (cuộn giữa chừng).
- [ ] `pnpm --filter web test`, `typecheck`, `lint` xanh.
