# Cấu trúc thư mục

Quy ước kiến trúc đầy đủ (feature-based, TanStack Query, Zustand...) xem ở **root `CLAUDE.md`** mục "Frontend". File này chỉ mô tả cây thư mục thực tế hiện tại.

```
apps/web/
├── app/                        # CHỈ routing/compose (App Router)
│   ├── globals.css
│   ├── layout.tsx              # Root layout: <Providers> + <SiteHeader> + <main>
│   ├── page.tsx                # Route "/" — render <AttendanceScreen/>
│   ├── lich-su-diem-danh/
│   │   └── page.tsx            # Route "/lich-su-diem-danh" — render <AttendanceLogTable/>
│   └── xep-team/
│       └── page.tsx            # Route "/xep-team" — CHỈ admin (check lại session ở server)
├── middleware.ts               # Chặn route admin ("/xep-team/*") khi chưa có phiên hợp lệ
├── features/
│   └── attendance/             # Feature điểm danh
│       ├── api/                # mock-data (backend stub) + query key factory + async stubs
│       ├── hooks/              # TanStack Query hooks (useCharacters, useMarkAttendance...)
│       ├── store/              # Zustand: UI state của bộ lọc (search/lưu phái/mật khẩu)
│       ├── types/              # Type nội bộ feature (Character, BattleSession...)
│       ├── components/         # Component của feature + attendance-screen (compose)
│       └── index.ts            # Barrel (AttendanceScreen, AttendanceLogTable)
│   ├── auth/                   # Feature đăng nhập quản trị
│   │   ├── api/                # login-action.ts (server action) + session.ts (cookie)
│   │   ├── lib/                # session-token.ts — ký/verify HMAC, edge-safe
│   │   ├── store/              # Zustand: chỉ trạng thái modal đăng nhập
│   │   ├── components/         # login-button.tsx, login-dialog.tsx
│   │   └── index.ts            # Barrel (LoginButton, getSession)
│   └── team-builder/           # Feature xếp team (chỉ admin)
│       ├── components/         # team-builder-screen.tsx
│       └── index.ts            # Barrel (TeamBuilderScreen)
├── components/
│   ├── ui/                     # Component do shadcn generate (CLI) — không sửa tay
│   ├── shared/                 # Wrapper tái sử dụng cross-feature + app shell
│   │                           #   site-header.tsx, main-nav.tsx, status-badge...
│   └── providers.tsx           # QueryClientProvider (TanStack Query)
├── config/
│   └── routes.ts               # ROUTES — hằng đường dẫn dùng cho nav/điều hướng
└── lib/
    ├── utils.ts                # cn() — merge Tailwind class
    └── format.ts               # formatDate/formatDateTime
```

## Quy tắc cơ bản

- Server data (records, characters...) → **TanStack Query** qua `features/<feature>/hooks`. Không lưu vào Zustand.
- UI/client state (bộ lọc, modal...) → **Zustand** trong `features/<feature>/store`.
- `app/` giữ mỏng: mọi logic nằm trong `features/`.
- Component shadcn → luôn ở `components/ui/`, không sửa trực tiếp file generate. Biến thể riêng (vd tone badge success/danger) → wrap ở `components/shared/`.
- Không import trực tiếp file nội bộ của feature khác — chỉ qua `index.ts` của feature đó.
- Phân quyền: trạng thái đăng nhập nằm ở **cookie httpOnly ký HMAC** (`AUTH_SECRET`), không lưu ở client.
  Ẩn/hiện nav chỉ là UI; chặn thật nằm ở `middleware.ts` + kiểm tra `getSession()` trong page server.
