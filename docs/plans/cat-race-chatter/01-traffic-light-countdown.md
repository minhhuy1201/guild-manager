# 01: Đếm ngược kiểu đèn giao thông

Spec: [`docs/specs/2026-10-23-cat-race-chatter.md`](../../specs/2026-10-23-cat-race-chatter.md) §1.

**What to build:** 3 đèn tròn trong hộp đèn, mỗi bước chỉ sáng một đèn: đỏ -> vàng -> xanh lá; số đếm
cùng màu đèn đang sáng.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `CountdownSignal` type alias và mảng màu theo vị trí trong `race-countdown.tsx`; bỏ `data-gold`.
- [x] Token `--stage-signal-red|amber|green` và style hộp đèn trong `globals.css`.
- [x] Test `race-overlays` cập nhật: màu theo vị trí, một đèn sáng mỗi bước, `data-signal` trên số.
- [x] `pnpm --filter web test`, `typecheck`, `lint` xanh.
