# 06: Xoá prototype

Spec: [`docs/specs/cat-race-broadcast-drama.md`](../../specs/cat-race-broadcast-drama.md)

**What to build:** Không còn dấu vết prototype trong repo. Xoá:

- thư mục `features/cat-race/prototype/` (bản copy canvas, mock, hook bình luận thử, overlay thử, thanh bình luận thử);
- route `app/dua-meo/prototype/`;
- thư mục `features/cat-race/_prototype/` (file HTML thử nghiệm đầu tiên).

Kiểm tra lại không còn import nào trỏ vào các đường dẫn đó.

**Blocked by:** 02 (Finish camera), 04 (Công tắc "Bình luận"), 05 (Màn công bố)

**Model:** sonnet - theo luật chọn model thì đụng hơn 2 file, dù chỉ là xoá

**Status:** done

- [x] Ba đường dẫn trên không còn tồn tại
- [x] `/dua-meo/prototype` không còn là route (build không sinh trang đó)
- [x] `pnpm --filter web test`, `pnpm --filter web typecheck` và `pnpm --filter web lint` xanh
