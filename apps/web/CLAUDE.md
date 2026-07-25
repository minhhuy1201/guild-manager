# Frontend (apps/web)

Front-end quản lý bang hội.

**Quy ước làm việc đầy đủ** (stack, cấu trúc `features/`, TanStack Query, Zustand, naming, server vs client component...) nằm ở **root `CLAUDE.md`** — mục "Frontend". Đọc file đó trước khi tạo/sửa code trong `apps/web`.

Cây thư mục thực tế: xem `docs/structure.md`.

## UI components

- Toàn bộ component trong `components/ui/` phải sinh từ **shadcn/ui** qua CLI, dùng biến thể **Base UI** (`style: "base-nova"` trong `components.json`). Primitive import từ `@base-ui/react/*`.
- **Không dùng Radix** (`@radix-ui/*`) hay tự viết primitive tay. Cần biến thể riêng → compose/wrap ở `components/shared/`.
