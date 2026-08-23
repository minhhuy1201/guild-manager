# W1 — Giao thức "dialog gọi mutation" thành một module sâu

Ngày: 2026-08-21 · Phạm vi: `apps/web`.
Bối cảnh chung: [tổng quan đợt 2](./2026-08-21-architecture-review-2-overview.md).
Nên làm **sau** [W3](./2026-08-21-w3-query-group-design.md) — cả hai đụng cùng bốn màn, và W3 rẻ hơn.

## Bối cảnh

Bốn dialog, mỗi cái tự viết cùng năm mẩu. Ví dụ đầy đủ nhất:

```tsx
// features/members/components/delete-member-dialog.tsx:37-58
const deleteMutation = useDeleteMember();
const [error, setError] = useState<string | null>(null);

async function handleDelete() {
  if (!member) return;
  setError(null);
  try {
    await deleteMutation.mutateAsync(member.id);
    onClose();
  } catch (caught) {
    setError(
      caught instanceof ApiError ? caught.message : "Không xoá được thành viên này."
    );
  }
}
```

`features/settings/components/delete-session-dialog.tsx:57-73` là **cùng năm bước, cùng thứ tự**,
khác đúng câu fallback (`"Không xoá được trận này."`).

Hai form dialog cũng vậy, và ở đây bằng chứng chép tay là chuỗi trùng từng chữ:

```tsx
// member-form-dialog.tsx:90-115 và session-form-dialog.tsx:96-161
const saving = createMutation.isPending || updateMutation.isPending;
…
: "Không lưu được thay đổi."     // ← cùng một câu, hai file
…
// khối lỗi, cùng class:
<AlertCircle className="mt-0.5 size-4 shrink-0" />
// nút, cùng cấu trúc:
{saving ? <LoaderCircle className="animate-spin" /> : <Save />}
{saving ? "Đang lưu…" : "Lưu"}
```

Đếm: 4 dialog × (1 `useState` lỗi + 1 `try/catch instanceof ApiError` + 1 cờ `isPending` + 1 khối
JSX lỗi + 1 nút hai nhãn) = **20 mẩu lặp**.

Luật thật sự đang được chép — không nằm ở đâu cả — là:

1. reset lỗi **trước** khi gửi
2. chỉ đóng dialog khi **thành công**
3. lỗi thì **giữ dialog lại** và hiện message
4. `ApiError` thì hiện `message` của backend nguyên văn; lỗi khác thì hiện câu fallback
5. đang chạy thì khoá nút và đổi nhãn

Và không có chỗ nào kiểm được năm luật đó: `find apps/web -name "*.test.tsx"` cho **0 kết quả** —
31 file test hiện có đều là `.ts` (hook và hàm thuần), không có test render nào.

## Quyết định thiết kế

### 1. `MutationDialog` giữ toàn bộ giao thức

```tsx
// components/shared/mutation-dialog.tsx

// Chín khoá của giao thức ghi, dùng chung cho cả MutationForm.
export interface MutationFormProps {
  title: string;
  description?: ReactNode;
  /** Nhãn nút xác nhận lúc rảnh và lúc đang chạy */
  submitLabel: string;
  pendingLabel: string;
  /** Icon nút xác nhận (Save, Trash2…) */
  submitIcon: ReactNode;
  /** Câu hiện khi lỗi không mang message nào */
  fallbackError: string;
  /** Kiểu nút xác nhận */
  variant?: "default" | "destructive";
  /** Thao tác ghi. Ném thì dialog giữ nguyên và hiện lỗi; xong êm thì dialog đóng. */
  run: () => Promise<unknown>;
  /** Gọi sau khi ghi xong êm */
  onDone: () => void;
  /** Nút "Huỷ". Không truyền thì không có nút — X ở góc vẫn còn. */
  onCancel?: () => void;
  /** Thân dialog: các ô nhập, hoặc câu cảnh báo xoá */
  children?: ReactNode;
}

// Bản ghép vỏ + giao thức tự nối onDone/onCancel vào onOpenChange, nên nó
// không nhận hai khoá đó mà nhận một cờ bật/tắt nút "Huỷ".
export interface MutationDialogProps
  extends Omit<MutationFormProps, "onDone" | "onCancel"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hiện nút "Huỷ" cạnh nút xác nhận */
  showCancel?: boolean;
}
```

Toàn bộ năm luật ở trên nằm **bên trong** module này. Người gọi chỉ nói *cái gì được ghi* (`run`) và
*trông thế nào* (`children`, nhãn).

`MutationDialogProps` 12 khoá, nhưng 7 trong số đó chỉ nói *trông thế nào* (6 nhãn/icon +
`children`), 2 là cờ (`variant`, `showCancel`), 2 là cặp mở/đóng quen thuộc của mọi dialog
(`open`, `onOpenChange`) — phần *hành vi* người gọi phải hiểu chỉ có `run` và hợp đồng
"ném = giữ dialog". Đó là chỗ độ sâu nằm.

### 2. `run` trả `Promise`, không nhận callback

`run: () => Promise<unknown>` chứ không `onSuccess`/`onError`: người gọi viết `await mutateAsync(...)`
đúng như họ đang viết, chỉ bỏ đi `try/catch` và `onClose()`. Ai cần chạy thêm việc sau khi thành công
thì `await` tiếp trong chính `run` — thứ tự rõ ràng, không có callback chạy ngoài luồng.

### 3. Không tự suy ra `isPending` từ mutation

Module giữ cờ chạy của **chính nó** (`useState` quanh `await run()`), không nhận `isPending` từ
ngoài. Lý do: `member-form-dialog` phải gộp hai mutation (`createMutation.isPending ||
updateMutation.isPending`, `:90`); nếu module nhận cờ từ ngoài thì phép gộp đó lại là thứ mỗi caller
tự làm — đúng cái đang muốn xoá.

### 4. Biến thể xoá là adapter mỏng

```tsx
export function ConfirmDeleteDialog(props): ReactNode  // MutationDialog + variant="destructive" + icon Trash2
```

Không thêm luật mới, chỉ đặt sẵn ba prop. Nếu chỉ có một dialog xoá thì không đáng; ở đây có hai
(`delete-member`, `delete-session`), nên có adapter thật.

### 5. Vỏ và giao thức là hai component

`MutationForm` giữ năm luật và **không** biết tới `Dialog`. `MutationDialogShell` giữ
`Dialog`/`DialogContent`, chỉ mount thân khi `open`, và chặn yêu cầu đóng lúc đang chạy.
`MutationDialog` là hai cái ghép lại.

Lý do tách: state các ô nhập của hai form dialog nằm ở component con để tự reset mỗi lần mở lại,
trong khi `<Dialog>` phải luôn mounted thì animation đóng mới chạy. Nếu module ôm cả hai vai thì
`run` — vốn phải đọc state đó — bị đẩy ra ngoài vỏ, kéo state lên theo và mất cơ chế reset. Hai form
dialog vì vậy tự dựng vỏ bằng `MutationDialogShell` và đặt `MutationForm` ở component con.

Cờ chạy đi từ thân lên vỏ qua `MutationPendingContext`. Vỏ là chỗ duy nhất cầm `onOpenChange`, nên
luật "đang chạy thì bỏ qua yêu cầu đóng" áp cho cả bốn dialog chứ không riêng hai cái xoá.

## Thay đổi cụ thể

| File | Thay đổi |
|---|---|
| `components/shared/mutation-pending.ts` (mới) | context để thân báo cờ chạy lên vỏ |
| `components/shared/mutation-form.tsx` (mới) | `MutationForm` — năm luật, không có `Dialog` |
| `components/shared/mutation-dialog.tsx` (mới) | `MutationDialogShell`, `MutationDialog` |
| `components/shared/confirm-delete-dialog.tsx` (mới) | `ConfirmDeleteDialog` |
| `lib/error-message.ts` (mới) | `errorMessageOf` — luật 4, tách ra để test ở môi trường node |
| `features/members/components/delete-member-dialog.tsx` | bỏ `useState` lỗi, `try/catch`, khối lỗi, nút — còn phần cảnh báo + `run` |
| `features/settings/components/delete-session-dialog.tsx` | như trên (giữ `describeLoss`) |
| `features/members/components/member-form-dialog.tsx` | bỏ 5 mẩu; giữ 2 ô nhập |
| `features/settings/components/session-form-dialog.tsx` | như trên; giữ luật trần deadline, validate client `throw` thay vì `setError` |
| `vitest.config.ts` | `include` bắt thêm `*.test.tsx` — dependency test đã có sẵn |

Bốn dialog sau khi đổi chỉ còn phần thân riêng của chúng — ước lượng ~15 dòng nội dung mỗi cái.

## Edge case

- **Đóng dialog khi đang chạy.** Hiện mỗi dialog tự xử (hoặc không). Module chốt một luật: đang chạy
  thì `onOpenChange(false)` bị **bỏ qua**, tránh mutation hoàn tất vào một dialog đã biến mất.
- **Mở lại dialog sau khi lỗi.** Lỗi phải bị reset khi `open` chuyển từ `false` → `true`, nếu không
  người dùng thấy lỗi cũ của lần trước.
- **Form có validate phía client** (`session-form-dialog` kiểm trần deadline trước khi gửi): `run`
  tự ném một `Error` với message tiếng Việt là đủ — nhưng nó sẽ rơi vào nhánh fallback. Nên
  `MutationDialog` đọc `message` của **mọi** `Error`, và `fallbackError` chỉ dùng khi `message`
  rỗng. Đây là khác biệt so với hiện tại (chỉ đọc `ApiError`) và là cải thiện có chủ ý.
- **`member` / `session` là `null`** khi dialog đóng: giữ nguyên guard `if (!member) return;` bên
  trong `run` của caller.
- **`Dialog` của `components/ui/`** không được sửa (luật: generated output). `MutationDialog` bọc nó
  từ `components/shared/` — đúng chỗ `frontend.md` §6 chỉ định.

## Kiểm thử

Đây là spec đầu tiên dựng hạ tầng test render, nên bộ test của nó chính là phần trả về lớn nhất:

- `run` resolve → `onOpenChange(false)` được gọi
- `run` ném `ApiError("Không xoá được vì …")` → dialog **vẫn mở**, message backend hiện nguyên văn
- `run` ném `Error` không message → hiện `fallbackError`
- đang chạy → nút bị khoá, nhãn đổi sang `pendingLabel`
- đang chạy → yêu cầu đóng bị bỏ qua
- mở lại sau lỗi → không còn lỗi cũ

Sáu ca này hiện **không thể viết** cho bất kỳ dialog nào trong bốn cái.

## Rủi ro

- **Gộp UI dễ đánh rơi khác biệt nhỏ** giữa bốn dialog (khoảng cách, thứ tự nút). So từng cái trước
  khi chuyển; khác biệt nào có lý do thì để lại ở `children` hoặc thành một prop tường minh — nút
  "Huỷ" của hai dialog xoá là một khác biệt thật, nên nó thành `onCancel?` chứ không bị nuốt.
- **`MutationDialogShell` chỉ mount thân khi mở**, nên lỗi cũ và giá trị ô nhập cũ chết theo lần
  đóng trước. Đây là điều kiện để hai form dialog giữ nguyên được cấu trúc hai lớp của chúng.

## Ngoài phạm vi

- Toast thay cho lỗi inline — đổi quy ước hiển thị toàn app, cần quyết định riêng và cập nhật
  `frontend.md` §6.
- Gom logic form (validate, dirty state) — spec này chỉ gom **giao thức ghi**, không gom form.
