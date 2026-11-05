# 04: Công tắc "Bình luận"

Spec: [`docs/specs/cat-race-broadcast-drama.md`](../../specs/cat-race-broadcast-drama.md)

**What to build:** Admin bật/tắt bình luận bằng một `Switch` có nhãn "Bình luận", đặt cạnh ô thời lượng
trong `RaceControls`. Mặc định bật. Trình duyệt nhớ lựa chọn qua `localStorage`, theo đúng cách
`race-store` đang nhớ thời lượng: đọc lỗi hay không có thì về mặc định; ghi lỗi thì vẫn đổi trong
phiên. Công tắc bị khoá khi đang đua (cùng cờ khoá với ô thời lượng). Khi tắt, `RaceStage` không đưa
cue hay bảng cho bình luận, không hiện thanh bình luận, và thanh "ĐỔI NGÔI" hiện lại như trước
ticket 03. Chế độ toàn màn hình không có công tắc riêng; nó dùng giá trị đã chọn.

Dùng `Switch` và `Label` của `components/ui`. Nhãn là thẻ `Label` có `htmlFor` trỏ tới `id` của
switch (quy ước `FieldLabel` trong `.claude/rules/web/display.md` áp cho field sửa được).

**Blocked by:** 03 (Bình luận trên màn đua)

**Model:** sonnet - thêm giá trị vào store kèm lưu trữ, thêm control, rẽ nhánh trong `RaceStage`

**Status:** todo

- [ ] Test store: mặc định bật; đổi giá trị thì ghi `localStorage`; store mới đọc lại giá trị đã lưu; `localStorage` ném lỗi thì về mặc định và đổi vẫn có tác dụng
- [ ] Test `RaceControls`: công tắc hiện với nhãn "Bình luận", đổi được, bị khoá khi `isLocked`
- [ ] Test `RaceStage`: bình luận tắt thì không có thanh bình luận và cue `lead-change` hiện thanh "ĐỔI NGÔI"; bật thì như ticket 03
- [ ] `pnpm --filter web test`, `pnpm --filter web typecheck` và `pnpm --filter web lint` xanh
