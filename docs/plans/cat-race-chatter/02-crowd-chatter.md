# 02: Bong bóng thoại của khán giả

Spec: [`docs/specs/2026-10-23-cat-race-chatter.md`](../../specs/2026-10-23-cat-race-chatter.md) §2-§4.

**What to build:** Module thuần `race-chatter` (chỉ phần khán giả), bộ vẽ `paint-chat-bubbles`, và nối
vào `RaceCanvas` + `paintStageBand` để khán giả hô theo cue và cổ vũ ngẫu nhiên trong lúc replay.

**Blocked by:** None (can start immediately)

**Status:** done (chưa xem bằng mắt: app cần DB và đăng nhập Discord)

- [x] `stepChatter` (khán giả): cue -> câu/tone, câu ngẫu nhiên theo excitement, giới hạn 3 (2 khi
      hẹp), cue đẩy bong bóng ngẫu nhiên cũ nhất, hết hạn thì bỏ, không mutate.
- [x] Test `race-chatter` cho các ý trên với `seeded-random`.
- [x] `paint-chat-bubbles`: 3 tone, đuôi, bóng đặc, pop lò xo, trôi lên, mờ cuối đời.
- [x] Vẽ trong dải trời, sau cùng (không bị cổng đích che); chỉ ở `replay`.
- [ ] Chạy app, xem một vòng 8 mèo và một vòng 240 mèo.
- [x] `pnpm --filter web test`, `typecheck`, `lint` xanh.
