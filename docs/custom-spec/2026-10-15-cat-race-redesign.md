# Đua mèo - Làm lại màn đua cho rõ và minh bạch

Ngày: 2026-10-15 · Trạng thái: **đã chốt, chưa triển khai** · Nối tiếp:
[`2026-10-12-cat-race-design.md`](2026-10-12-cat-race-design.md) (spec gốc, giữ nguyên làm lịch sử).
Spec này **thay** các quyết định D18, D19, D22 (phần loại dần), mục 8.3, 8.4, 8.5 của spec gốc; mọi
phần khác (dữ liệu, API, quy tắc quay, Discord) giữ nguyên. Chỉ sửa web và nhãn enum dùng chung,
không đổi API, không migration.

## 1. Vấn đề

Phản hồi của admin sau khi chạy thử màn `/dua-meo/[id]`:

1. **Độ tương phản thấp.** Đường đua tô bằng `--card`, cùng màu khung bao quanh; vạch xuất phát là
   nét đứt màu `--border`; mèo nhỏ nhất 10px, tên chữ 12px. Hạng mục bậc `LOW` có viền và nền trùng
   với card.
2. **Nhãn bậc "Cao / Vừa / Thấp" khó hiểu.** Người dùng không biết bậc là gì và để làm gì (thực tế
   bậc chỉ đổi màu hiển thị).
3. **Không chỉnh được thời lượng.** Chỉ có Nhanh / Vừa / Chậm (6 / 12 / 20 giây).
4. **Thiếu minh bạch.** Mèo xếp lưới nhiều cột sau vạch xuất phát, mỗi cột xuất phát ở một chỗ khác
   nhau, nên **vị trí trên màn hình không khớp thứ hạng thật**. Quá 20 mèo thì chỉ top 3 có tên. Ở
   mốc 40% nửa đàn mờ dần rồi biến mất, người xem không kiểm tra được ai đã chạy.
5. **Bảng dẫn đầu chỉ 5 người**, là một dòng chữ nằm dưới canvas.
6. **Bảng người thắng chật** ở cột phải; các hạng mục chỉ khác nhau bằng một dòng tiêu đề nhỏ.

## 2. Quyết định đã chốt

| # | Quyết định |
|---|---|
| R1 | **Bỏ loại dần, bỏ zoom.** Mỗi mèo (mỗi vé) một làn riêng, **mọi mèo xuất phát trên cùng một vạch**, tên luôn hiện trong làn, không con nào bị ẩn. Thay D19 và bước 3-5 mục 8.4 spec gốc. |
| R2 | **Vị trí trên màn hình = tiến độ thật.** Mọi mèo cùng tiến độ đứng cùng một toạ độ dọc đường đua; bảng xếp hạng và đường đua đọc chung một hàm thứ hạng. |
| R3 | **Thời lượng nhập bằng số giây**, số nguyên **10-40**, mặc định 12. Bỏ hẳn Nhanh / Vừa / Chậm. Nhớ bằng `localStorage` (khoá mới; giá trị cũ không đọc được thì về mặc định). Thời lượng là lúc con thắng chạm đích, chưa tính đếm ngược. Thay D18. |
| R4 | **Bậc giải đổi nhãn**: `HIGH` "Đặc biệt", `MEDIUM` "Lớn", `LOW` "Thường". Ô chọn đổi tên "Độ quý của giải", kèm một dòng giải thích bậc chỉ đổi màu và icon hiển thị. Enum và giá trị lưu DB giữ nguyên. |
| R5 | **Mỗi bậc một icon và một màu**, dùng chung ở chip hạng mục, khối người thắng và thẻ kết quả: Đặc biệt - `Crown`, vàng (`gold`); Lớn - `Gem`, ngọc (`jade`); Thường - `Gift`, navy (`primary`). Thường không còn trùng nền card. |
| R6 | **Màn đua to, bảng xếp hạng live bên phải**, liệt kê **toàn bộ mèo, mỗi mèo một dòng** (chế độ Vé: "An #2", khớp đúng làn), sắp lại liên tục, cuộn trong bảng. Thay bảng top 5. |
| R7 | **Bảng người thắng chuyển xuống dưới màn đua**, trải hết chiều ngang; mỗi hạng mục là một khối có viền, nền nhạt và icon theo bậc (R5). Thẻ chúc mừng sau mỗi vòng vẫn phủ lên đường đua như cũ. |
| R8 | **Điện thoại cũng chạy ngang** (mỗi làn một hàng, xuất phát bên trái). Thay mục 8.5 spec gốc: đường đua dọc với 80-240 cột thì mỗi làn còn vài pixel, không đặt nổi tên. Bảng xếp hạng nằm dưới đường đua. |

Giữ nguyên từ spec gốc: server chọn người thắng trước (D4); "Bỏ qua" nhảy tới kết quả và
`prefers-reduced-motion` hiện kết quả ngay (D22, bỏ phần nói về loại dần); đếm ngược 3-2-1; confetti;
sprite pixel tô màu theo phái (D20).

## 3. Một vòng đua

1. Bấm Đua: gọi API, nút khoá. Lỗi thì toast, không chạy animation (như cũ).
2. Đường đua dựng đủ làn: cột tên bên trái, vạch xuất phát liền nét ngay sau cột tên, vạch đích
   ca-rô gần mép phải. Mọi mèo đứng trên vạch xuất phát. Đếm ngược 3-2-1.
3. Cả đàn chạy tới đích. Tốc độ dao động, có vượt mặt; vài con bám sát con thắng ở đoạn cuối.
   Không con nào chạy lùi.
4. Con mang vé thắng chạm đích đúng thời lượng đã nhập (R3). Cuộc đua dừng ngay lúc đó (cộng một
   nhịp giữ ngắn): mọi con khác đứng yên ở chỗ đang chạy, bảng xếp hạng chốt theo vị trí đó.
5. Thẻ người thắng + confetti. "Đua tiếp" về màn quay với dữ liệu mới.

Quy tắc kịch bản (thuần hàm trong `lib/`, test được):

- Con thắng về nhất; tại mọi thời điểm sau khi nó chạm đích, không con nào có tiến độ ≥ nó.
- Tiến độ của mọi con không giảm theo thời gian.
- Thứ hạng tại một thời điểm = sắp theo tiến độ; đường đua và bảng xếp hạng dùng cùng hàm này.
- Tổng thời lượng = thời lượng đã nhập + nhịp giữ; không phụ thuộc số mèo.

## 4. Giao diện

### 4.1 Bố cục `/dua-meo/[id]`

```
┌─ PageHeader: tên đợt · chế độ ─────────────────── [Kết thúc đợt] ┐
│ Chip hạng mục (icon + màu theo bậc)            [+ Hạng mục]       │
├───────────────────────────────────────────────┬──────────────────┤
│ ĐƯỜNG ĐUA (canvas, to)                        │ Xếp hạng (live)  │
│  An      |🐈·········→                    ▓▓│ 1. An            │
│  Bình    |🐈········→                     ▓▓│ 2. Bình #2       │
│  Bình #2 |🐈··········→                   ▓▓│ 3. ...           │
│  ...  (cuộn dọc khi nhiều làn)                │  (toàn bộ, cuộn)  │
├───────────────────────────────────────────────┴──────────────────┤
│ Thời gian đua [12] giây · Danh sách đua 78 · Người tham gia 80   │
│                     [ ĐUA: Thẻ tháng #9 ]                         │
├───────────────────────────────────────────────────────────────────┤
│ Người thắng đợt này                                               │
│ ┌ 👑 Thiên thưởng 1/2 ┐ ┌ 💎 Tiền mặt 3/5 ┐ ┌ 🎁 Thẻ tháng 8/15 ┐  │
│ │ An                  │ │ Bình, ...       │ │ ...               │  │
└───────────────────────────────────────────────────────────────────┘
```

- Màn đua trải hết chiều ngang nội dung. Từ `lg`: lưới hai cột, đường đua bên trái, bảng xếp hạng
  bên phải cố định độ rộng. Dưới `lg`: bảng xếp hạng nằm dưới đường đua.
- Khung đua cao khoảng 70% chiều cao màn hình (`dvh`). Khi không đua, khung hiện số người / số vé và
  hạng mục như cũ.
- Bảng người thắng (R7): lưới khối, 1 cột trên điện thoại, 2 cột từ `sm`, 3 cột từ `lg`. Vòng huỷ
  vẫn gạch ngang kèm lý do; nút huỷ vòng giữ nguyên.
- Bảng người thắng không còn trượt ra khi đua (nó đã nằm dưới); chỉ khoá nút huỷ vòng khi đang đua.

### 4.2 Đường đua

- Mỗi mèo một làn. Chiều cao làn co theo số làn trong khung, **tối thiểu 22px**; vượt khung thì
  đường đua cuộn dọc bên trong khung, không cuộn cả trang.
- Làn xen kẽ hai sắc nền để mắt dò theo hàng được. Nền đường đua khác hẳn nền card (dùng mặt phẳng
  `--background` hoặc tương đương), vạch xuất phát liền nét màu chữ, vạch đích ca-rô.
- Tên trong cột trái của mỗi làn, cỡ chữ không nhỏ hơn cỡ `text-sm` của app, font Be Vietnam Pro
  (đọc từ `--font-sans`), màu `--foreground`. Tên dài cắt bằng dấu "…".
- Màu lấy từ token, đổi theo theme (như cũ).

### 4.3 Bảng xếp hạng live

- Mọi mèo, mỗi mèo một dòng: thứ hạng (số tabular), chấm màu phái, tên (chế độ Vé thêm `#n` khi
  người đó có nhiều mèo). Top 3 nổi bật.
- Cập nhật vài lần mỗi giây; thứ tự đổi ngay, không animation dịch chuyển dòng
  (`.claude/rules/web/interaction.md`: không `translate` phần tử tại chỗ).
- Sau khi đua xong, bảng giữ thứ hạng chốt cho tới khi bấm "Đua tiếp".

### 4.4 Form hạng mục và thời gian

- Form tạo đợt và form sửa hạng mục: ô "Độ quý của giải" là ba nút có icon + nhãn R4, kèm dòng mô tả.
- Ô "Thời gian đua (giây)": `Input type="number"`, min 10, max 40, bước 1. Giá trị ngoài khoảng hoặc
  không phải số nguyên thì báo lỗi ngay dưới ô và khoá nút Đua. Khoá khi đang đua.

## 5. Ngoài phạm vi

- Đổi API, schema, Discord, quy tắc quay.
- Âm thanh, xem lại vòng cũ, realtime (như spec gốc).
- Bấm tên trên bảng xếp hạng để cuộn tới làn tương ứng.

## 6. Kiểm thử

- Kịch bản (Vitest, thuần hàm): con thắng về nhất đúng thời lượng; sau khi nó chạm đích không con
  nào ngang hoặc vượt; không chạy lùi; mọi mèo có tiến độ 0 ở giây 0; thời lượng 10 và 40 đều đúng.
- Layout: mọi mèo cùng toạ độ xuất phát; cùng tiến độ thì cùng toạ độ dọc đường đua; làn không thấp
  hơn 22px; số làn = số mèo.
- Bảng xếp hạng: đủ mọi mèo, đúng thứ tự `rankAt`, nhãn `#n` chỉ khi một người có nhiều mèo.
- Thời gian: chặn ngoài 10-40 và số lẻ; nhớ / đọc lại `localStorage`; giá trị cũ (`FAST`...) về mặc định.
- Nhãn bậc: chip, form và khối người thắng hiện đúng nhãn và icon R4/R5.
- Kiểm tra bằng mắt trên trình duyệt thật: 2, 20, 80, 240 mèo; theme sáng và tối; 360px và 1440px.

## Nguồn

- Phản hồi của admin, phiên 2026-10-15.
- `apps/web/features/cat-race/components/race-canvas.tsx` (`drawTrack`: nền `--card`, vạch đứt
  `--border`; chữ `12px sans-serif`).
- `apps/web/features/cat-race/lib/race-layout.ts` (`packSlots`, `PACK_ZONE`, `MIN_CAT_SIZE = 10`).
- `apps/web/features/cat-race/lib/race-frame.ts` (`frameAt` nội suy từ ô xuất phát riêng tới đích;
  `LEADER_COUNT = 5`, `ALWAYS_LABELLED = 20`, `EARLY_LABELS = 3`).
- `apps/web/features/cat-race/lib/race-script.ts` (`RACE_DURATION_SECONDS`, `FIRST_CHECKPOINT`).
- `apps/web/features/cat-race/lib/prize-tier-style.ts` (`LOW`: `border-border bg-card`).
- `packages/shared/enums/prize-tier.enum.ts` (`PRIZE_TIER_LABEL`: Cao / Vừa / Thấp); chỉ hai form web
  dùng nhãn này, API và Discord không dùng (grep 2026-10-15).
- `.claude/rules/web/interaction.md` (không animate dịch chuyển tại chỗ), `display.md` (token màu,
  điện thoại).
