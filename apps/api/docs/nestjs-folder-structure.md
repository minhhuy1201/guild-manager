# NestJS Project Structure — Feature-Based Architecture

> Tài liệu hướng dẫn tổ chức thư mục cho backend NestJS theo hướng **feature/domain-based**, áp dụng cho dự án vừa và lớn, có Prisma + PostgreSQL.

---

## 1. Triết lý

Có 2 cách chia thư mục phổ biến:

| Cách chia | Ví dụ | Vấn đề |
|---|---|---|
| **Layer-based** (theo kỹ thuật) | `controllers/`, `services/`, `dtos/` | Sửa 1 tính năng phải nhảy 5 thư mục. Không scale. |
| **Feature-based** (theo domain) | `modules/auth/`, `modules/user/` | ✅ Mọi thứ liên quan 1 domain nằm cùng chỗ |

Nguyên tắc chính: **"Things that change together, stay together"** (Screaming Architecture — nhìn vào folder là biết app làm gì, không phải biết app dùng framework gì).

---

## 2. Cấu trúc tổng thể

```
api/
├── src/
│   ├── modules/                    # ⭐ Business domains
│   │   ├── auth/
│   │   ├── user/
│   │   └── guild/
│   │
│   ├── shared/                     # ⭐ Code tái sử dụng CÓ logic
│   │   ├── services/               # MailService, CacheService, S3Service...
│   │   ├── utils/                  # pure functions: slugify, hashPassword
│   │   └── shared.module.ts        # @Global() nếu cần
│   │
│   ├── common/                     # ⭐ Cross-cutting concerns (KHÔNG có business logic)
│   │   ├── guards/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   ├── constants/
│   │   └── types/
│   │
│   ├── infrastructure/             # ⭐ Kết nối thế giới bên ngoài
│   │   ├── prisma/
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma.module.ts
│   │   ├── redis/
│   │   └── queue/                  # BullMQ
│   │
│   ├── config/
│   │   ├── env.validation.ts       # Zod / class-validator
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── index.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma               # ⭐ Single source of truth cho model
│   ├── migrations/
│   └── seed.ts
│
├── test/
│   └── e2e/
│
├── .env.example
├── tsconfig.json
├── eslint.config.mjs
├── nest-cli.json
└── package.json
```

### Cải tiến so với cấu trúc ban đầu

1. **Tách `common/` và `shared/`** — `common/` chỉ chứa thứ vô hại, không phụ thuộc business (guard, filter, decorator). `shared/` chứa service có logic dùng chung. Trộn 2 thứ này là nguồn gốc của circular dependency.
2. **Thêm `infrastructure/`** — Prisma, Redis, S3 không phải "business domain", đừng để chung `modules/`.
3. **`config/` có index barrel** + validate env lúc boot, fail fast nếu thiếu biến.
4. **`schema.prisma` có thể split** khi > 300 dòng (Prisma 5.15+ hỗ trợ `prismaSchemaFolder`).

---

## 3. Cấu trúc bên trong 1 module

Đây là phần quan trọng nhất. Mỗi module là một "mini-app" tự chứa.

```
modules/user/
├── user.module.ts
├── user.controller.ts              # HTTP layer — chỉ nhận request, trả response
├── user.service.ts                 # Business logic
├── user.repository.ts              # (optional) Data access, wrap Prisma
│
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── query-user.dto.ts           # pagination, filter
│
├── entities/                       # hoặc types/ — response shape
│   └── user.entity.ts
│
├── guards/                         # guard CHỈ dùng cho module này
│   └── user-owner.guard.ts
│
├── events/                         # (optional) domain events
│   └── user-created.event.ts
│
└── __tests__/
    ├── user.service.spec.ts
    └── user.controller.spec.ts
```

Ví dụ module phức tạp hơn (`auth`):

```
modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── token.service.ts                # ⭐ tách service khi 1 file > ~300 dòng
├── strategies/
│   ├── jwt.strategy.ts
│   ├── jwt-refresh.strategy.ts
│   └── discord.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── dto/
│   ├── login.dto.ts
│   └── refresh-token.dto.ts
└── __tests__/
```

---

## 4. Quy tắc phụ thuộc (Dependency Rules)

Đây là thứ giữ cho dự án không thành "big ball of mud":

```
modules/  ──►  shared/  ──►  common/
   │              │
   └──────────────┴──►  infrastructure/
                             │
                             └──►  config/
```

**Luật cứng:**

1. `common/`, `config/` **không được** import từ `modules/`.
2. `modules/` **được** import lẫn nhau, nhưng chỉ qua **module public API** (service được `exports` trong `@Module`), không import trực tiếp file nội bộ.
3. Nếu `A` cần `B` và `B` cần `A` → đây là dấu hiệu logic đó thuộc về `shared/` hoặc cần một module thứ 3. **Đừng** dùng `forwardRef()` như giải pháp mặc định.
4. Controller **không bao giờ** gọi Prisma trực tiếp.

### Enforce bằng ESLint

```js
// eslint.config.mjs
rules: {
  'no-restricted-imports': ['error', {
    patterns: [
      { group: ['**/modules/*/*'], message: 'Import qua module public API, không import file nội bộ.' },
      { group: ['src/modules/*'], importNames: ['*'] },
    ],
  }],
}
```

Hoặc dùng `dependency-cruiser` cho luật phức tạp hơn.

---

## 5. Path alias

`tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*":       ["src/*"],
      "@modules/*": ["src/modules/*"],
      "@common/*":  ["src/common/*"],
      "@shared/*":  ["src/shared/*"],
      "@config/*":  ["src/config/*"],
      "@infra/*":   ["src/infrastructure/*"]
    },
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

> Nhớ thêm alias tương ứng vào `jest.config` (`moduleNameMapper`) nếu không test sẽ fail.

---

## 6. Repository pattern — dùng hay không?

**Không bắt buộc.** Prisma Client đã là một repository rồi.

| Trường hợp | Khuyến nghị |
|---|---|
| CRUD đơn giản | Service gọi thẳng `PrismaService` |
| Query phức tạp, lặp lại nhiều nơi | Tách `user.repository.ts` |
| Cần unit test service mà không mock Prisma | Tách repository |
| Có kế hoạch đổi ORM | Tách repository |

Ví dụ khi tách:

```ts
// user.repository.ts
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findManyPaginated({ skip, take, search }: QueryUserDto) {
    return this.prisma.user.findMany({
      skip, take,
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

---

## 7. Config & environment

```ts
// config/env.validation.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): Env => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`❌ Invalid env:\n${JSON.stringify(parsed.error.format(), null, 2)}`);
  }
  return parsed.data;
};
```

```ts
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnv,
  envFilePath: ['.env.local', '.env'],
})
```

App crash ngay lúc boot nếu thiếu env — tốt hơn nhiều so với crash lúc 2h sáng ở production.

---

## 8. Naming conventions

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Folder | `kebab-case`, **số ít** | `user/`, `guild-member/` |
| File | `kebab-case.type.ts` | `create-user.dto.ts` |
| Class | `PascalCase` | `CreateUserDto` |
| Interface | `PascalCase`, **không** prefix `I` | `TokenPayload` |
| Constant | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_SIZE` |
| Barrel file | `index.ts` — chỉ ở `common/`, `config/` | |

> ⚠️ Tránh lạm dụng `index.ts` barrel trong `modules/` — dễ gây circular dependency với NestJS DI.

---

## 9. Khi nào cần tách nhỏ hơn nữa?

Cấu trúc trên đủ tốt tới ~40-50 modules. Sau đó:

**Nested feature** khi domain có sub-domain rõ ràng:

```
modules/guild/
├── guild.module.ts
├── guild.controller.ts
├── guild.service.ts
├── members/                  # sub-feature
│   ├── guild-member.controller.ts
│   ├── guild-member.service.ts
│   └── dto/
└── settings/
```

**Monorepo (Nx / Turborepo)** khi có nhiều app (api, worker, admin) chia sẻ code:

```
apps/
├── api/
├── worker/
└── web/
libs/
├── database/
├── shared-types/            # ⭐ share type giữa NestJS và NextJS
└── validation/              # ⭐ share Zod schema
```

Với stack NestJS + NextJS, `libs/shared-types` là thứ đáng làm sớm — hết cảnh định nghĩa type 2 lần.

---

## 10. Checklist khởi tạo dự án

- [ ] `strict: true` trong `tsconfig.json` ngay từ đầu
- [ ] `ValidationPipe` global với `whitelist: true, transform: true`
- [ ] `HttpExceptionFilter` global + response format thống nhất
- [ ] `LoggingInterceptor` + request ID (correlation ID)
- [ ] Env validation fail-fast
- [ ] Swagger tự động từ DTO (`@nestjs/swagger` + CLI plugin)
- [ ] Health check endpoint (`@nestjs/terminus`)
- [ ] Graceful shutdown (`app.enableShutdownHooks()`)
- [ ] Path alias + `jest moduleNameMapper` khớp nhau
- [ ] ESLint rule chặn import xuyên tầng

---

## 11. Anti-patterns thường gặp

| ❌ Sai | ✅ Đúng |
|---|---|
| `utils/index.ts` 800 dòng chứa mọi thứ | Chia theo domain: `utils/date.ts`, `utils/string.ts` |
| Controller gọi thẳng Prisma | Controller → Service → (Repository) → Prisma |
| `forwardRef()` khắp nơi | Tái cấu trúc: tách module thứ 3 hoặc dùng event |
| Business logic trong DTO | DTO chỉ validate shape, logic ở service |
| Trả thẳng Prisma model ra API | Map sang entity/serializer, tránh lộ `password`, `deletedAt` |
| `any` "để sau sửa" | `unknown` + type guard |
| Một `shared.module.ts` chứa 30 provider | Chia nhỏ theo mục đích |

---

## 12. Tóm tắt

Cấu trúc tốt không phải là cấu trúc đẹp nhất, mà là cấu trúc **dễ đoán**. Khi một dev mới vào dự án hỏi "file này nằm ở đâu?", câu trả lời phải là hiển nhiên.

Ba câu hỏi để kiểm tra:

1. Thêm 1 feature mới → cần tạo bao nhiêu file, ở bao nhiêu thư mục? (Lý tưởng: 1 thư mục)
2. Xóa 1 feature → có xóa được gọn 1 thư mục không? (Nếu không, coupling đang quá cao)
3. Nhìn `src/modules/` → có hiểu app này làm gì không?
