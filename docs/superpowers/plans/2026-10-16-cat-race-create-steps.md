# Form tạo đợt quay: chia 2 bước

## Bối cảnh

`create-cat-race-dialog.tsx` nhồi tên đợt, chế độ, hạng mục và cả danh sách người vào một dialog
`sm:max-w-md`. Mỗi hạng mục là một thẻ viền kèm hàng 3 nút độ quý, ô nhập không có nhãn, "Chế độ"
đứng trước hạng mục dù chỉ ảnh hưởng đến vé, và nút "Tạo đợt" nằm sau cả danh sách người.

## Thiết kế

- Bước 1 "Giải thưởng": tên đợt + hạng mục. Mỗi hạng mục một dòng: dropdown độ quý (chỉ icon),
  tên, số lượng, nút xoá. Một dòng tiêu đề cột cho ô nhập. Gợi ý độ quý một lần dưới danh sách.
- Bước 2 "Người tham gia": chế độ (kèm một câu giải thích) + `RosterChecklist`. Nút "Quay lại" và "Tạo đợt".
- State nằm ở `CreateCatRaceBody`, quay lại không mất dữ liệu. Bước 1 là một `<form>` riêng nên
  `required`/`min`/`max` của trình duyệt chặn "Tiếp" khi tên rỗng hoặc số lượng sai.
- Bước 2 vẫn là `MutationForm`; thêm `cancelLabel` và `cancelIcon` (mặc định "Huỷ" + `X`).
- Payload và API không đổi.

## Việc đã làm

- `components/shared/mutation-form.tsx`: `cancelLabel`, `cancelIcon`.
- `features/cat-race/components/`: `create-cat-race-dialog.tsx` (bước), `create-race-prizes-step.tsx`,
  `create-race-step-indicator.tsx`, `prize-tier-select.tsx`.
- Test: `create-and-list.test.tsx` (flow 2 bước, quay lại giữ giá trị, tên rỗng chặn "Tiếp", câu giải
  thích chế độ Vé), `mutation-dialog.test.tsx` (`cancelLabel`).
