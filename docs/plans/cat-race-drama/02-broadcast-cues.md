# 02: Lớp phủ kiểu truyền hình theo sự kiện đua

Spec: [`docs/specs/2026-10-22-cat-race-drama.md`](../../specs/2026-10-22-cat-race-drama.md) §2, §7.
Prototype: [`assets/2026-10-22-cat-race-drama-prototype.html`](../../specs/assets/2026-10-22-cat-race-drama-prototype.html).

**What to build:** Trong lúc đua, người xem thấy các lớp phủ y như prototype: đếm ngược bằng 3 đèn lồng
sáng dần (đèn thứ ba vàng) với số to nảy vào; banner "CHẠY!" lúc xuất phát và "NƯỚC RÚT" ở 84%;
thanh "ĐỔI NGÔI · <tên> vượt lên dẫn đầu" khi con nhất đổi (hiện 1.5 giây, cách nhau ít nhất 1.3
giây, chỉ khi `u > 0.08`); viền tối và nhãn "CHẬM ×3" trong slow-mo; chớp trắng khi về đích; ảnh đích
phóng to 2 con đầu với "cách x thân" khi về sát nút. Canvas thôi tự vẽ đếm ngược.

Đường đua báo sự kiện cho màn đua bằng một union có tag (đếm ngược kèm bước, xuất phát, đổi ngôi kèm
khoá mèo, nước rút, slow-mo bật/tắt, về đích kèm có ảnh đích hay không); màn đua xử lý bằng switch kết
thúc `assertNever`. Ảnh đích là canvas nhỏ riêng, vẽ từ kịch bản (không chụp canvas chính, vì làn có
thể đang cuộn khỏi khung nhìn).

Keyframe và thời lượng riêng của sân khấu khai báo một lần trong `globals.css`; thêm ngoại lệ vào
`interaction.md` §Motion và lý do vào `docs/frontend.md`.

**Blocked by:** 01

**Status:** todo

- [ ] Sự kiện phát đúng thứ tự và đúng một lần mỗi vòng; "Bỏ qua" ở bất kỳ pha nào (kể cả đếm ngược,
      ảnh đích) nhảy thẳng tới thẻ kết quả, không chớp, không ảnh đích. Có test.
- [ ] Mỗi lớp phủ phản ứng đúng sự kiện; thanh đổi ngôi tôn trọng giới hạn tần suất. Có test.
- [ ] Ảnh đích chỉ hiện khi á quân cách đích < 0.004 tiến độ. Có test.
- [ ] Canvas không còn vẽ ô đếm ngược; test cũ về đếm ngược chuyển sang lớp phủ.
- [ ] Chữ, màu, nhịp, kích thước khớp prototype.
- [ ] Ngoại lệ motion ghi trong `interaction.md` và `docs/frontend.md`.
- [ ] `pnpm --filter web test`, `typecheck`, `lint` xanh.
