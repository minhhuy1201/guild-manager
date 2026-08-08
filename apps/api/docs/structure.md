# Cấu trúc thư mục (apps/api)

Lý thuyết kiến trúc đầy đủ xem ở [`nestjs-folder-structure.md`](nestjs-folder-structure.md).
File này mô tả cây thư mục **thực tế hiện tại** và những chỗ đã tinh chỉnh cho monorepo này.

```
apps/api/
├── prisma/
│   ├── schema.prisma           # Model: Character, BattleSession, AttendanceRecord
│   └── seed.ts                 # Seed nhân vật mẫu
├── prisma.config.ts            # Config của Prisma CLI (Prisma 7 không đọc `url` trong schema nữa)
├── docker-compose.yml          # PostgreSQL cho dev (pnpm db:up / db:down / db:reset)
├── src/
│   ├── common/                 # Cross-cutting, KHÔNG chứa business logic
│   │   ├── constants/          # REQUEST_ID_HEADER...
│   │   ├── filters/            # all-exceptions.filter.ts — format lỗi thống nhất
│   │   ├── interceptors/       # logging (request-id) + transform ({ data })
│   │   └── index.ts            # Barrel
│   ├── config/
│   │   ├── env.validation.ts   # Zod schema cho env, fail-fast lúc boot
│   │   ├── app.config.ts       # API_PREFIX, SWAGGER_PATH, AppConfigService
│   │   └── index.ts            # Barrel
│   ├── infrastructure/
│   │   └── prisma/             # PrismaService (@Global PrismaModule) + isHealthy()
│   ├── modules/                # Business domain — mỗi module là một "mini-app"
│   │   └── health/             # Mẫu tham chiếu: health.module.ts + health.controller.ts
│   ├── generated/prisma/       # Prisma Client (KHÔNG commit, sinh bằng prisma generate)
│   ├── app.module.ts
│   └── main.ts                 # Pipe/filter/interceptor global, CORS, Swagger (/docs), shutdown hooks
└── test/e2e/                   # e2e test (health.e2e-spec.ts)
```

## Quy tắc theo tầng

```
modules/  ──►  shared/  ──►  common/
   │              │
   └──────────────┴──►  infrastructure/  ──►  config/
```

- `common/` và `config/` **không** import từ `modules/`, `shared/`, `infrastructure/` — ESLint chặn cứng.
- Module chỉ được import **file `*.module`** của module khác, không đụng file nội bộ — ESLint chặn cứng.
- Controller **không** gọi Prisma trực tiếp: Controller → Service → (Repository) → Prisma.
- Chưa cần thì chưa tạo: `guards/`, `decorators/`, `repository` chỉ thêm khi có nhu cầu thật.

## Alias & code dùng chung

| Import | Ý nghĩa |
|---|---|
| `@/...` | `src/...` của app này |
| `@guild/shared/enums` | Enum dùng chung FE/BE (`packages/shared/enums`) |
| `@guild/shared/schemas` | Zod schema dùng chung FE/BE (`packages/shared/schemas`) |

> Tinh chỉnh so với tài liệu gốc: **không** dùng các alias `@modules/*`, `@common/*`, `@shared/*`.
> Bên `apps/web`, `@shared/*` đã mang nghĩa "packages/shared" — dùng lại cho `src/shared` sẽ gây nhập nhằng.
> Vì vậy chỉ có `@/*` cho code nội bộ, còn code dùng chung import qua tên package thật.

Enum trong `schema.prisma` (`GuildClass`, `AttendanceStatus`) phải **giữ khớp giá trị** với
`packages/shared/enums`. `prisma/seed.ts` import trực tiếp enum từ package dùng chung để lệch giá trị
là compile error, không phải bug lúc chạy.

## Ghi chú kỹ thuật

- **Build bằng webpack** (`nest-cli.json` → `builder: "webpack"`) để bundle luôn source TypeScript của
  `packages/shared`; output là một file `dist/main.js`. Dùng builder `tsc` mặc định sẽ đẩy output thành
  `dist/apps/api/src/main.js` vì có file nằm ngoài `rootDir`.
- **Prisma Client sinh ở dạng CJS** (`moduleFormat = "cjs"`, `importFileExtension = ""`) vì app chạy
  CommonJS: để mặc định ESM thì jest/ts-node vỡ do `import.meta`, còn để import kèm đuôi `.js` thì
  ts-node không resolve được khi chạy `prisma/seed.ts`.
- **Response format**: thành công `{ data }`, lỗi `{ statusCode, message, errors?, path, requestId, timestamp }`.
- Mọi response đều có header `x-request-id` để đối chiếu log.

## Khi thêm một module mới

1. `src/modules/<domain>/` gồm `<domain>.module.ts`, `<domain>.controller.ts`, `<domain>.service.ts`.
2. DTO đặt ở `dto/`, tạo từ zod schema dùng chung: `class XDto extends createZodDto(xSchema) {}`.
3. Query phức tạp/lặp lại mới tách `<domain>.repository.ts`, còn CRUD đơn giản thì service gọi thẳng `PrismaService`.
4. Khai báo module trong `app.module.ts`.
