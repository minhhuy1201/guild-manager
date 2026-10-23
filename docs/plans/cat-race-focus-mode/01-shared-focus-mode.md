# 01: Tách hook và khung focus mode dùng chung

Spec: [`docs/specs/cat-race-focus-mode.md`](../../specs/cat-race-focus-mode.md).

**What to build:** Chuẩn bị trước (prefactor) để màn đua dùng lại được chế độ toàn màn hình của
màn xếp đội. Hook focus mode chuyển từ feature xếp đội ra chỗ dùng chung của web app. Tham số "đang
kéo" đổi thành một điều kiện chung "`Esc` đã có chủ", và màn xếp đội truyền trạng thái kéo vào đó.
Phần khung của lớp phủ thành một shell dùng chung: dialog có tên, giữ focus, đánh dấu "dialog chính là
màn hình", `fixed inset-0 z-40`, fade, thanh trên với nút ✕ có cap `Esc`. Shell phải dùng được tại
chỗ: khi `active` đổi, cây con không bị mount lại. Lớp phủ của màn xếp đội thành một bố cục mỏng
dựng trên shell. Với admin xếp đội, không có gì thay đổi.

Hình dạng shell đã chốt trong plan:

```tsx
interface FocusModeShellProps {
  active: boolean;       // false: plain wrapper, same subtree, no dialog semantics
  label: string;
  bar: ReactNode;        // the shell appends the exit button
  onExit: () => void;
  barClassName?: string;
  hideExit?: boolean;
  className?: string;
  children: ReactNode;
}
```

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Hook focus mode nằm ở chỗ dùng chung. Feature xếp đội không còn bản riêng.
- [x] Shell dùng chung có test riêng: là dialog có tên khi active, giữ Tab bên trong, ✕ gọi `onExit`, và khi inactive thì không có dialog.
- [x] Đổi `active` từ false sang true rồi về false thì một con của shell không bị mount lại
- [x] Test hiện có của `TeamBuilderScreen` xanh mà không sửa assertion nào
- [x] Quy ước focus mode trong `.claude/rules/web/interaction.md` được viết lại thành quy ước chung (hook + shell), không còn chỉ riêng cho màn xếp đội
- [x] Typecheck, lint, test của web xanh
