# Setup Frontend

Hướng dẫn khởi tạo `apps/web` với Next.js + Tailwind CSS + shadcn/ui.

## 1. Tạo project Next.js

Chạy tại root monorepo, tạo project trong `apps/web`:

```bash
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Các flag:
- `--typescript` — dùng TypeScript
- `--tailwind` — cài sẵn Tailwind CSS
- `--app` — dùng App Router
- `--src-dir` — code nằm trong `src/`
- `--import-alias "@/*"` — alias import gọn (`@/components`, `@/lib`...)

> Lưu ý: `create-next-app` bản mới nhất mặc định dùng Tailwind CSS v4 (cấu hình qua CSS, không cần `tailwind.config.js` như v3).

## 2. Kiểm tra Tailwind đã chạy đúng

Mở `apps/web/src/app/globals.css`, phải thấy dòng:
```css
@import "tailwindcss";
```

Chạy thử:
```bash
cd apps/web
pnpm dev
```

Sửa `src/app/page.tsx` thêm 1 class Tailwind bất kỳ (vd `className="text-red-500"`) để confirm style áp dụng đúng.

## 3. Cài shadcn/ui

Chạy tại thư mục `apps/web`:

```bash
pnpm dlx shadcn@latest init
```

> CLI package tên là `shadcn` (không phải `shadcn-ui` — package cũ đã đổi tên).

CLI sẽ hỏi vài câu:
- **Style**: chọn `New York` hoặc `Default` (tùy gu)
- **Base color**: `Neutral`/`Zinc`/`Slate`... (chọn 1 màu nền tảng)
- **CSS variables**: chọn **Yes** (để đổi theme dễ hơn sau này)

Sau khi init xong, sẽ tự tạo:
- `components.json` — file config của shadcn
- `src/lib/utils.ts` — chứa hàm `cn()` để merge class Tailwind
- Cập nhật `globals.css` với các CSS variable theme

## 4. Thêm component đầu tiên để test

```bash
pnpm dlx shadcn@latest add button
```

Component sẽ được tạo tại `src/components/ui/button.tsx`.

Test trong `src/app/page.tsx`:
```tsx
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button>Click me</Button>
    </main>
  );
}
```

Chạy `pnpm dev` → nếu thấy nút bấm có style (bo góc, màu nền, hover đổi màu) → cài thành công.

## 5. Các lệnh hay dùng

```bash
# Thêm component mới
pnpm dlx shadcn@latest add <tên-component>
# vd: pnpm dlx shadcn@latest add card dialog input

# Chạy dev server
pnpm dev

# Build thử
pnpm build
```

## Troubleshooting nhanh

| Lỗi | Cách xử lý |
|---|---|
| `shadcn-ui: command not found` | Dùng đúng tên package mới: `shadcn` (không phải `shadcn-ui`) |
| Style Tailwind không áp dụng | Kiểm tra `globals.css` có `@import "tailwindcss";` và file này có được import trong `layout.tsx` không |
| Lỗi peer dependency khi cài component (npm) | Thêm flag `--legacy-peer-deps`, hoặc dùng pnpm (ít gặp lỗi này hơn) |
