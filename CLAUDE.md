# Frontend

Quy ước làm việc cho folder Frontend. Đọc file này trước khi tạo/sửa code trong `/home/huykirito1201/personal/guild-manager/apps/web`.

## Stack

- **Next.js** (App Router) — routing, RSC, layouts
- **Tailwind CSS** — styling (utility-first)
- **shadcn/ui** — component primitives (Radix + Tailwind)
- **TanStack Query** — server state (fetch/cache/mutate dữ liệu từ API)
- **Zustand** — client state (UI state, không phải server data)
- **TypeScript** — strict mode

Types & Zod schemas dùng chung với backend lấy từ package `/home/huykirito1201/personal/guild-manager/packages` **Không** định nghĩa lại type/schema đã có ở đó.

## Ngôn ngữ nội dung

- **Toàn bộ nội dung hiển thị cho người dùng phải là tiếng Việt.** Áp dụng cho mọi text UI: label, placeholder, tiêu đề, nút, aria-label, thông báo lỗi/toast, empty state...
- Code (tên biến/hàm/type), comment và doc comment (JSDoc) vẫn viết bằng tiếng Anh theo quy ước chung.

## Cấu trúc thư mục

```
web/
├── app/                    # CHỈ routing: layout, page, loading, error
│   ├── (auth)/
│   ├── (dashboard)/
│   └── layout.tsx
├── features/               # Logic nghiệp vụ, tổ chức theo module
│   └── <feature>/
│       ├── components/     # Component riêng của feature
│       ├── hooks/          # Hooks (gồm cả TanStack Query hooks)
│       ├── api/            # Hàm gọi API + query key factory
│       ├── store/          # Zustand store của feature (nếu cần)
│       ├── types/          # Type nội bộ feature
│       └── index.ts        # Public API (barrel) — chỉ export cái cần dùng ngoài
├── components/
│   ├── ui/                 # shadcn/ui (do CLI sinh ra)
│   └── shared/             # Component tái sử dụng cross-feature
├── lib/                    # Tiện ích: cn(), api client, constants...
├── hooks/                  # Hooks dùng chung toàn app
├── stores/                 # Zustand store global (auth, theme...) — dùng khi thật sự cần
└── config/                 # Config, env, route constants
```

**Nguyên tắc:** `app/` chỉ lo routing và compose. Mọi logic thật nằm trong `features/`.

## Quy tắc theo layer

### Server vs Client Components
- Mặc định là **Server Component**. Chỉ thêm `"use client"` khi cần state, hooks, event handler, hoặc browser API.
- TanStack Query và Zustand chạy ở client → component dùng chúng phải là Client Component.
- Đặt `"use client"` càng "sâu" càng tốt (ở component nhỏ nhất cần nó), tránh biến cả trang thành client.

### TanStack Query — server state
- Mọi dữ liệu từ API đi qua TanStack Query. **Không** nhét server data vào Zustand.
- Mỗi feature có **query key factory** trong `api/`, ví dụ:
  ```ts
  export const guildKeys = {
    all: ['guilds'] as const,
    list: (filters: GuildFilters) => [...guildKeys.all, 'list', filters] as const,
    detail: (id: string) => [...guildKeys.all, 'detail', id] as const,
  }
  ```
- Bọc query/mutation trong custom hook (`useGuilds`, `useCreateGuild`), component không gọi `useQuery` trực tiếp.
- Mutation xong thì `invalidateQueries` đúng key liên quan.

### Zustand — client state
- Chỉ dùng cho UI/client state: modal open, filter đang chọn, bước wizard, sidebar collapse...
- Một store cho một domain, đặt trong `features/<feature>/store/` (global thì ở `stores/`).
- Store nhỏ gọn, không side-effect gọi API bên trong. Selector hóa khi đọc để tránh re-render thừa:
  ```ts
  const isOpen = useModalStore((s) => s.isOpen)
  ```

### shadcn/ui
- Cài qua CLI (`npx shadcn@latest add ...`), để nguyên trong `components/ui/`.
- Cần biến thể riêng → **compose/wrap** ở `components/shared/`, hạn chế sửa trực tiếp file CLI sinh ra.

### Styling — Tailwind
- Utility-first. Class có điều kiện dùng `cn()` từ `lib/utils`:
  ```ts
  cn('rounded-md px-3', isActive && 'bg-primary text-white')
  ```
- Dùng theme token (`bg-primary`, `text-muted-foreground`...), tránh hardcode màu và inline `style`.

## Naming & Imports

- File: `kebab-case` (`guild-card.tsx`, `use-guilds.ts`).
- Component: `PascalCase`. Hook: `useCamelCase`. Biến/hàm: `camelCase`. Hằng: `UPPER_SNAKE_CASE`.
- Import qua alias `@/`. Thứ tự: thư viện ngoài → `@/...` → tương đối.
- **Không import trực tiếp file nội bộ của feature khác.** Chỉ dùng qua `index.ts` của feature đó.

## Khi thêm một feature mới

1. Tạo `features/<feature>/` với các thư mục cần dùng (không tạo folder rỗng cho đủ bộ).
2. Query key factory + API hooks trong `api/` và `hooks/`.
3. Component đặt trong `components/`, chỉ export qua `index.ts` cái cần dùng bên ngoài.
4. Route tương ứng trong `app/`, chỉ compose lại các thứ đã export từ feature.

## Nên / Tránh

- ✅ Server data → TanStack Query · UI state → Zustand.
- ✅ Type/schema dùng chung lấy từ package `shared`.
- ✅ Giữ `app/` mỏng, logic nằm ở `features/`.
- ❌ Không gọi `fetch`/`useQuery` rải rác trong component — gói vào hook.
- ❌ Không lưu response API vào Zustand.
- ❌ Không over-engineer: chưa cần thì chưa tạo store/abstraction.
