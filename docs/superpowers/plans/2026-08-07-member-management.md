# Quản lý thành viên — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tab "Quản lý thành viên" vào màn Thiết lập, cho quản trị viên thêm/sửa/xoá thành viên và xem/copy mật khẩu điểm danh của họ.

**Architecture:** Mật khẩu điểm danh chuyển từ hash scrypt sang plaintext (cột `Character.password`) để quản trị viên xem lại được. Backend thêm module `characters` (CRUD, chỉ admin, `id` tự sinh từ slug tên + hậu tố ngẫu nhiên). Frontend thêm feature `members` và bọc màn `/thiet-lap` bằng hai tab.

**Tech Stack:** NestJS 11 + Prisma 7 + PostgreSQL · Next.js 16 App Router + TanStack Query + shadcn/ui · Zod 4 dùng chung qua `@guild/shared` · Jest cho backend.

Spec: [`docs/superpowers/specs/2026-08-07-member-management-design.md`](../specs/2026-08-07-member-management-design.md)

## Global Constraints

- Mọi text hiển thị cho người dùng **phải bằng tiếng Việt**. Commit message bằng tiếng Anh.
- Bảng chữ cái sinh mật khẩu và hậu tố id: `abcdefghijkmnpqrstuvwxyz23456789` (32 ký tự — đã bỏ `l`, `o`, `0`, `1`).
- Mật khẩu dài **8** ký tự; hậu tố id dài **6** ký tự.
- Prefix fallback khi tên không slug hoá được: `thanh-vien`.
- Backend: flow Controller → Service → Prisma, không thêm lớp repository. Controller không đụng Prisma. Trả về entity, không trả model Prisma.
- Frontend: `app/` chỉ lo routing/layout, logic nằm ở `features/`. Gọi API qua `apiFetch` của `lib/api-client`. Server state dùng TanStack Query. Không import file nội bộ của feature khác — chỉ qua `index.ts`.
- Không sửa file trong `apps/web/components/ui/` (shadcn giữ nguyên, chỉ bọc).
- Mọi hàm/component export đều có JSDoc tiếng Việt kèm `@param`/`@returns` như code hiện có.
- Lệnh chạy: `pnpm --filter api test`, `pnpm --filter api lint`, `pnpm --filter web lint`.
- Commit trên `main`, không tạo branch. Không thêm trailer `Co-Authored-By`.

---

### Task 1: Schema dùng chung cho thành viên

**Files:**
- Create: `packages/shared/schemas/character.schema.ts`
- Modify: `packages/shared/schemas/index.ts`

**Interfaces:**
- Consumes: `GuildClass` từ `packages/shared/enums/guild-class.enum.ts`
- Produces: `createCharacterSchema`, `updateCharacterSchema`, `CreateCharacterInput` (`{ name: string; guildClass: GuildClass }`), `UpdateCharacterInput` (`{ name?: string; guildClass?: GuildClass }`) — export từ `@guild/shared/schemas` (backend) và `@shared/schemas` (frontend).

- [ ] **Step 1: Tạo file schema**

`packages/shared/schemas/character.schema.ts`:

```ts
import { z } from "zod";

import { GuildClass } from "../enums/guild-class.enum";

/**
 * Body của POST /characters.
 * Dùng chung: FE validate form, BE validate request body (nestjs-zod).
 * Tên không ràng buộc duy nhất — trong game trùng tên vẫn được, id mới là thứ phân biệt.
 */
export const createCharacterSchema = z.object({
  /** Tên hiển thị của nhân vật */
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên thành viên.")
    .max(50, "Tên thành viên tối đa 50 ký tự."),
  /** Lưu phái của nhân vật */
  guildClass: z.enum(GuildClass),
});

/** Body của PATCH /characters/:id — sửa được từng phần. */
export const updateCharacterSchema = createCharacterSchema.partial();

/** Kiểu body tạo thành viên đã validate. */
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;

/** Kiểu body sửa thành viên đã validate. */
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
```

- [ ] **Step 2: Export ra ngoài package**

`packages/shared/schemas/index.ts` — thêm một dòng, giữ thứ tự alphabet:

```ts
export * from "./attendance.schema";
export * from "./auth.schema";
export * from "./battle-session.schema";
export * from "./character.schema";
export * from "./formation.schema";
```

- [ ] **Step 3: Kiểm tra type còn build được**

Run: `pnpm --filter api exec tsc --noEmit -p tsconfig.json`
Expected: PASS, không có lỗi.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/schemas
git commit -m "feat(shared): add character create and update schemas"
```

---

### Task 2: Chuyển mật khẩu điểm danh sang plaintext

Đây là một task duy nhất vì đổi tên cột làm Prisma client mất `passwordHash` — `attendance.service.ts` và bộ test của nó phải sửa cùng lúc thì repo mới build được.

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model `Character`)
- Create: `apps/api/prisma/migrations/<timestamp>_rename_password_hash_to_password/migration.sql`
- Modify: `apps/api/prisma/seed.ts`
- Modify: `apps/api/src/modules/attendance/attendance.service.ts`
- Modify: `apps/api/src/modules/attendance/entities/attendance.entity.ts` (chỉ sửa comment)
- Modify: `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`
- Delete: `apps/api/src/shared/utils/password.util.ts`

**Interfaces:**
- Produces: `Character.password` (plaintext) thay cho `Character.passwordHash`. Không còn `hashPassword` / `verifyPassword` ở bất cứ đâu.

- [ ] **Step 1: Sửa test của attendance trước**

Trong `apps/api/src/modules/attendance/__tests__/attendance.service.spec.ts`:

Bỏ import `hashPassword`:

```ts
// XOÁ dòng này
import { hashPassword } from '@/shared/utils/password.util';
```

Trong `describe('AttendanceService.mark')`, bỏ biến `passwordHash` và khối `beforeAll` đang hash nó:

```ts
  // XOÁ hai chỗ này
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword(PASSWORD);
  });
```

Trong `beforeEach`, đổi field của character giả lập:

```ts
        findUnique: jest.fn().mockResolvedValue({
          id: CHARACTER_ID,
          name: 'Mèo Béo',
          password: PASSWORD,
        }),
```

(Giữ nguyên phần còn lại của object nếu có thêm field.)

- [ ] **Step 2: Chạy test để thấy nó hỏng**

Run: `pnpm --filter api test attendance`
Expected: FAIL — test "sai mật khẩu" vẫn pass nhầm hoặc báo lỗi so khớp, vì service vẫn đang gọi `verifyPassword` trên chuỗi plaintext.

- [ ] **Step 3: Sửa Prisma schema**

`apps/api/prisma/schema.prisma`, trong model `Character`, thay hai dòng:

```prisma
  /// Khoá chính do hệ thống sinh: slug tên + hậu tố ngẫu nhiên ("meo-beo-k7ma3x").
  id         String     @id
  /// Tên hiển thị của nhân vật.
  name       String
  guildClass GuildClass
  /// Mật khẩu điểm danh dạng plaintext — quản trị viên cấp và xem lại được.
  password   String
```

(Comment cũ của `id` là "ID trong game — dùng luôn làm khóa chính…" và của mật khẩu là "Hash mật khẩu điểm danh riêng… không bao giờ lưu plaintext" — thay bằng hai comment trên.)

- [ ] **Step 4: Sinh file migration rỗng để tự viết SQL**

Prisma mặc định sẽ DROP cột cũ rồi ADD cột mới; ta cần RENAME nên phải tự viết.

Run: `pnpm --filter api exec prisma migrate dev --create-only --name rename_password_hash_to_password`
Expected: In ra đường dẫn file migration vừa tạo, chưa apply.

- [ ] **Step 5: Thay nội dung file migration**

Mở file `apps/api/prisma/migrations/<timestamp>_rename_password_hash_to_password/migration.sql`, xoá hết và thay bằng:

```sql
-- Hash scrypt không đọc ngược được nên đổi tên cột xong phải cấp lại mật khẩu mới cho mọi hàng.
ALTER TABLE "Character" RENAME COLUMN "passwordHash" TO "password";

UPDATE "Character" SET "password" = (
  SELECT string_agg(
    substr('abcdefghijkmnpqrstuvwxyz23456789', floor(random() * 32)::int + 1, 1),
    ''
  )
  FROM generate_series(1, 8)
);
```

- [ ] **Step 6: Apply migration và sinh lại client**

Run: `pnpm --filter api db:up && pnpm --filter api prisma:migrate`
Expected: migration applied, Prisma Client generated.

- [ ] **Step 7: Sửa attendance service sang so sánh plaintext**

`apps/api/src/modules/attendance/attendance.service.ts`:

Bỏ import `verifyPassword`:

```ts
// XOÁ dòng này
import { verifyPassword } from '@/shared/utils/password.util';
```

Trong `mark`, đổi lời gọi:

```ts
    if (!isAdmin) {
      this.verifyCharacterPassword(password, character.password);
    }
```

Thay cả hàm private ở cuối class:

```ts
  /**
   * Kiểm tra mật khẩu điểm danh của một nhân vật.
   * @param password - Mật khẩu người dùng nhập (undefined khi request không gửi)
   * @param expected - Mật khẩu lưu trong database
   * @throws BadRequestException khi request không kèm mật khẩu
   * @throws UnauthorizedException khi mật khẩu sai
   */
  private verifyCharacterPassword(
    password: string | undefined,
    expected: string,
  ): void {
    if (!password?.trim()) {
      throw new BadRequestException('Vui lòng nhập mật khẩu.');
    }

    if (password.trim() !== expected) {
      throw new UnauthorizedException('Sai mật khẩu thành viên.');
    }
  }
```

Trong `entities/attendance.entity.ts`, sửa comment của `CharacterEntity` cho khớp:

```ts
/**
 * Nhân vật trả về cho client ở luồng điểm danh công khai.
 * Không bao giờ chứa `password` — mật khẩu chỉ quản trị viên xem được, qua module characters.
 */
```

và comment của field `id`:

```ts
  /** Khoá chính do hệ thống sinh. */
```

- [ ] **Step 8: Xoá util không còn ai dùng**

```bash
rm apps/api/src/shared/utils/password.util.ts
```

Kiểm tra không còn chỗ nào tham chiếu:

Run: `grep -rn "password.util\|hashPassword\|verifyPassword\|passwordHash" apps/api/src apps/api/prisma`
Expected: không có kết quả nào.

- [ ] **Step 9: Sửa seed sang plaintext**

`apps/api/prisma/seed.ts`:

Bỏ import `hashPassword`:

```ts
// XOÁ dòng này
import { hashPassword } from '../src/shared/utils/password.util';
```

Sửa comment của mảng `CHARACTERS` (bỏ vế "seed sẽ hash trước khi ghi"):

```ts
/**
 * Danh sách nhân vật mẫu — giữ khớp với mock data của frontend
 * (apps/web/features/attendance/api/mock-data.ts) để FE chuyển sang API thật không lệch dữ liệu.
 */
```

Thay khối dựng `rows` và `upsert` trong `main` bằng:

```ts
    const rows = CHARACTERS.map((character) => ({
      id: character.id,
      name: character.name,
      guildClass: character.guildClass,
      password: character.password,
    }));

    await Promise.all(
      rows.map((row) =>
        prisma.character.upsert({
          where: { id: row.id },
          create: row,
          // Ghi đè cả mật khẩu: migration đã cấp mật khẩu ngẫu nhiên, chạy seed là về lại mẫu.
          update: row,
        }),
      ),
    );
```

- [ ] **Step 10: Chạy lại seed và test**

Run: `pnpm --filter api db:seed && pnpm --filter api test`
Expected: seed in "Đã seed 25 nhân vật.", toàn bộ test PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/api/prisma apps/api/src
git commit -m "refactor(api): store attendance passwords in plaintext"
```

---

### Task 3: Hàm thuần sinh id và mật khẩu

**Files:**
- Create: `apps/api/src/modules/characters/characters.lib.ts`
- Test: `apps/api/src/modules/characters/__tests__/characters.lib.spec.ts`

**Interfaces:**
- Produces:
  - `slugifyName(name: string): string` — slug hoá tên, trả `thanh-vien` nếu không còn ký tự nào.
  - `generateId(name: string): string` — `slugifyName(name) + '-' + 6 ký tự ngẫu nhiên`.
  - `generatePassword(): string` — 8 ký tự ngẫu nhiên.

- [ ] **Step 1: Viết test trước**

`apps/api/src/modules/characters/__tests__/characters.lib.spec.ts`:

```ts
import {
  generateId,
  generatePassword,
  slugifyName,
} from '../characters.lib';

/** Bảng chữ cái dùng cho mật khẩu và hậu tố id — đã bỏ các ký tự dễ nhầm. */
const ALPHABET = /^[abcdefghijkmnpqrstuvwxyz23456789]+$/;

describe('slugifyName', () => {
  it('bỏ dấu tiếng Việt và nối bằng gạch ngang', () => {
    expect(slugifyName('Mèo Béo')).toBe('meo-beo');
    expect(slugifyName('Nhậm Doanh Doanh')).toBe('nham-doanh-doanh');
  });

  it('quy chữ đ về d', () => {
    expect(slugifyName('Đông Phương Bất Bại')).toBe('dong-phuong-bat-bai');
  });

  it('gộp ký tự lạ và khoảng trắng thừa thành một gạch ngang', () => {
    expect(slugifyName('  Mèo___Mập !! Giang  Hồ  ')).toBe(
      'meo-map-giang-ho',
    );
  });

  it('trả về thanh-vien khi không còn ký tự nào slug hoá được', () => {
    expect(slugifyName('小明')).toBe('thanh-vien');
    expect(slugifyName('!!!')).toBe('thanh-vien');
  });
});

describe('generateId', () => {
  it('ghép prefix từ tên với hậu tố 6 ký tự', () => {
    const id = generateId('Mèo Béo');

    expect(id).toMatch(/^meo-beo-[abcdefghijkmnpqrstuvwxyz23456789]{6}$/);
  });

  it('sinh id khác nhau cho cùng một tên', () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => generateId('Mèo Béo')),
    );

    expect(ids.size).toBe(50);
  });
});

describe('generatePassword', () => {
  it('dài đúng 8 ký tự và chỉ dùng bảng chữ cái đã chọn', () => {
    for (let i = 0; i < 100; i += 1) {
      const password = generatePassword();

      expect(password).toHaveLength(8);
      expect(password).toMatch(ALPHABET);
    }
  });

  it('không sinh ra hai mật khẩu giống nhau liên tiếp', () => {
    const passwords = new Set(
      Array.from({ length: 50 }, () => generatePassword()),
    );

    expect(passwords.size).toBe(50);
  });
});
```

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test characters.lib`
Expected: FAIL — "Cannot find module '../characters.lib'".

- [ ] **Step 3: Viết implementation**

`apps/api/src/modules/characters/characters.lib.ts`:

```ts
import { randomInt } from 'node:crypto';

/**
 * Bảng chữ cái dùng cho mật khẩu và hậu tố id.
 * Bỏ `l`, `o`, `0`, `1` để đọc lại và gõ lại không nhầm.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Độ dài mật khẩu điểm danh. */
const PASSWORD_LENGTH = 8;

/** Độ dài phần ngẫu nhiên trong id — phần đảm bảo id không trùng. */
const ID_SUFFIX_LENGTH = 6;

/** Prefix dùng khi tên không còn ký tự nào slug hoá được (ví dụ tên thuần chữ Hán). */
const FALLBACK_PREFIX = 'thanh-vien';

/**
 * Sinh chuỗi ngẫu nhiên từ ALPHABET.
 * @param length - Số ký tự cần sinh
 * @returns Chuỗi ngẫu nhiên
 */
function randomString(length: number): string {
  return Array.from(
    { length },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join('');
}

/**
 * Slug hoá tên nhân vật: bỏ dấu tiếng Việt, hạ chữ thường, nối bằng gạch ngang.
 * @param name - Tên hiển thị của nhân vật
 * @returns Slug chỉ gồm [a-z0-9-], hoặc `thanh-vien` nếu không còn ký tự nào
 */
export function slugifyName(name: string): string {
  const slug = name
    .normalize('NFD')
    // Bỏ dấu thanh và dấu mũ đã tách ra sau NFD.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // NFD không tách đ/Đ nên phải quy riêng.
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug === '' ? FALLBACK_PREFIX : slug;
}

/**
 * Sinh khoá chính cho một nhân vật mới: slug tên + hậu tố ngẫu nhiên.
 * Prefix chỉ để nhìn vào database còn đoán được là ai; hậu tố mới là thứ đảm bảo duy nhất.
 * @param name - Tên hiển thị của nhân vật
 * @returns Id dạng `meo-beo-k7ma3x`
 */
export function generateId(name: string): string {
  return `${slugifyName(name)}-${randomString(ID_SUFFIX_LENGTH)}`;
}

/**
 * Sinh mật khẩu điểm danh ngẫu nhiên.
 * @returns Mật khẩu 8 ký tự
 */
export function generatePassword(): string {
  return randomString(PASSWORD_LENGTH);
}
```

- [ ] **Step 4: Chạy test để xác nhận pass**

Run: `pnpm --filter api test characters.lib`
Expected: PASS, 8 test.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/characters
git commit -m "feat(api): add pure helpers for member id and password"
```

---

### Task 4: Module `characters` (CRUD chỉ admin)

**Files:**
- Create: `apps/api/src/modules/characters/entities/character.entity.ts`
- Create: `apps/api/src/modules/characters/dto/character.dto.ts`
- Create: `apps/api/src/modules/characters/characters.service.ts`
- Create: `apps/api/src/modules/characters/characters.controller.ts`
- Create: `apps/api/src/modules/characters/characters.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/src/modules/characters/__tests__/characters.service.spec.ts`

**Interfaces:**
- Consumes: `generateId`, `generatePassword` từ Task 3; `createCharacterSchema`, `updateCharacterSchema`, `CreateCharacterInput`, `UpdateCharacterInput` từ Task 1; `PrismaService` từ `@/infrastructure/prisma/prisma.service`; `JwtAuthGuard` từ `@/common`.
- Produces:
  - `MemberEntity` = `{ id: string; name: string; guildClass: GuildClass; password: string }`
  - `CharactersService` với `list()`, `create(input)`, `update(id, input)`, `resetPassword(id)`, `remove(id)`
  - Endpoint: `GET /api/characters`, `POST /api/characters`, `PATCH /api/characters/:id`, `POST /api/characters/:id/password`, `DELETE /api/characters/:id`

- [ ] **Step 1: Viết test trước**

`apps/api/src/modules/characters/__tests__/characters.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { GuildClass } from '@guild/shared/enums';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { CharactersService } from '../characters.service';

/** Một hàng Character như Prisma trả về. */
const ROW = {
  id: 'meo-beo-k7ma3x',
  name: 'Mèo Béo',
  guildClass: GuildClass.CUU_LINH,
  password: 'k7ma3xt9',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Lỗi trùng khoá chính của Prisma. */
const UNIQUE_VIOLATION = Object.assign(new Error('Unique constraint failed'), {
  code: 'P2002',
});

/** Lỗi Prisma khác — service phải để nó nổi lên, không được nuốt. */
const OTHER_ERROR = Object.assign(new Error('Connection lost'), {
  code: 'P1001',
});

describe('CharactersService', () => {
  let service: CharactersService;
  let prisma: {
    character: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      character: {
        findMany: jest.fn().mockResolvedValue([ROW]),
        findUnique: jest.fn().mockResolvedValue(ROW),
        create: jest.fn().mockResolvedValue(ROW),
        update: jest.fn().mockResolvedValue(ROW),
        delete: jest.fn().mockResolvedValue(ROW),
      },
    };
    service = new CharactersService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('trả về danh sách kèm mật khẩu, sắp theo tên', async () => {
      const members = await service.list();

      expect(prisma.character.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(members).toEqual([
        {
          id: ROW.id,
          name: ROW.name,
          guildClass: ROW.guildClass,
          password: ROW.password,
        },
      ]);
    });
  });

  describe('create', () => {
    it('sinh id mang prefix từ tên và mật khẩu 8 ký tự', async () => {
      await service.create({
        name: 'Mèo Béo',
        guildClass: GuildClass.CUU_LINH,
      });

      const { data } = prisma.character.create.mock.calls[0][0];
      expect(data.id).toMatch(/^meo-beo-[a-z0-9]{6}$/);
      expect(data.password).toHaveLength(8);
      expect(data.name).toBe('Mèo Béo');
      expect(data.guildClass).toBe(GuildClass.CUU_LINH);
    });

    it('sinh lại id và thử lần nữa khi đụng khoá chính', async () => {
      prisma.character.create
        .mockRejectedValueOnce(UNIQUE_VIOLATION)
        .mockResolvedValueOnce(ROW);

      const member = await service.create({
        name: 'Mèo Béo',
        guildClass: GuildClass.CUU_LINH,
      });

      expect(prisma.character.create).toHaveBeenCalledTimes(2);
      const firstId = prisma.character.create.mock.calls[0][0].data.id;
      const secondId = prisma.character.create.mock.calls[1][0].data.id;
      expect(firstId).not.toBe(secondId);
      expect(member.id).toBe(ROW.id);
    });

    it('không nuốt lỗi Prisma khác', async () => {
      prisma.character.create.mockRejectedValue(OTHER_ERROR);

      await expect(
        service.create({ name: 'Mèo Béo', guildClass: GuildClass.CUU_LINH }),
      ).rejects.toThrow('Connection lost');
      expect(prisma.character.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('chỉ gửi xuống Prisma những field được truyền vào', async () => {
      await service.update(ROW.id, { name: 'Mèo Mập' });

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: ROW.id },
        data: { name: 'Mèo Mập' },
      });
    });

    it('ném NotFoundException khi không có thành viên đó', async () => {
      prisma.character.findUnique.mockResolvedValue(null);

      await expect(service.update('khong-co', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('ghi mật khẩu mới khác mật khẩu cũ', async () => {
      await service.resetPassword(ROW.id);

      const { where, data } = prisma.character.update.mock.calls[0][0];
      expect(where).toEqual({ id: ROW.id });
      expect(data.password).toHaveLength(8);
      expect(data.password).not.toBe(ROW.password);
    });

    it('ném NotFoundException khi không có thành viên đó', async () => {
      prisma.character.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword('khong-co')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('xoá theo id', async () => {
      await service.remove(ROW.id);

      expect(prisma.character.delete).toHaveBeenCalledWith({
        where: { id: ROW.id },
      });
    });

    it('ném NotFoundException khi không có thành viên đó', async () => {
      prisma.character.findUnique.mockResolvedValue(null);

      await expect(service.remove('khong-co')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.character.delete).not.toHaveBeenCalled();
    });
  });
});
```

Lưu ý test "ghi mật khẩu mới khác mật khẩu cũ": xác suất `generatePassword()` trùng đúng `'k7ma3xt9'` là 1/32⁸ — coi như không xảy ra.

- [ ] **Step 2: Chạy test để chắc chắn nó fail**

Run: `pnpm --filter api test characters.service`
Expected: FAIL — "Cannot find module '../characters.service'".

- [ ] **Step 3: Tạo entity**

`apps/api/src/modules/characters/entities/character.entity.ts`:

```ts
import type { GuildClass } from '@guild/shared/enums';

/**
 * Một thành viên trả về cho màn quản lý của quản trị viên.
 * Khác `CharacterEntity` của module attendance (bản rút gọn, không có mật khẩu):
 * entity này **có** mật khẩu, nên mọi endpoint trả nó ra đều phải khoá bằng JwtAuthGuard.
 */
export interface MemberEntity {
  /** Khoá chính do hệ thống sinh. */
  id: string;
  name: string;
  guildClass: GuildClass;
  /** Mật khẩu điểm danh dạng plaintext. */
  password: string;
}
```

- [ ] **Step 4: Tạo DTO**

`apps/api/src/modules/characters/dto/character.dto.ts`:

```ts
import {
  createCharacterSchema,
  updateCharacterSchema,
} from '@guild/shared/schemas';
import { createZodDto } from 'nestjs-zod';

/**
 * Body của request thêm thành viên.
 * Schema dùng chung với frontend (packages/shared/schemas) để hai bên không lệch nhau.
 */
export class CreateCharacterDto extends createZodDto(createCharacterSchema) {}

/** Body của request sửa thành viên — mọi field đều không bắt buộc. */
export class UpdateCharacterDto extends createZodDto(updateCharacterSchema) {}
```

- [ ] **Step 5: Tạo service**

`apps/api/src/modules/characters/characters.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import type { GuildClass } from '@guild/shared/enums';
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from '@guild/shared/schemas';

import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { generateId, generatePassword } from './characters.lib';
import type { MemberEntity } from './entities/character.entity';

/** Mã lỗi Prisma khi vi phạm ràng buộc duy nhất (ở đây là trùng khoá chính). */
const UNIQUE_VIOLATION = 'P2002';

/** Thông báo dùng chung khi id không tồn tại. */
const NOT_FOUND = 'Không tìm thấy thành viên.';

/**
 * CRUD thành viên cho quản trị viên. Trả về cả mật khẩu điểm danh, nên controller
 * phải khoá toàn bộ endpoint bằng JwtAuthGuard.
 */
@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Danh sách toàn bộ thành viên kèm mật khẩu.
   * @returns Mảng thành viên sắp theo tên
   */
  async list(): Promise<MemberEntity[]> {
    const rows = await this.prisma.character.findMany({
      orderBy: { name: 'asc' },
    });

    return rows.map(toEntity);
  }

  /**
   * Thêm một thành viên: id và mật khẩu đều do hệ thống sinh.
   * @param input - Tên và lưu phái
   * @returns Thành viên vừa tạo, kèm mật khẩu để quản trị viên gửi cho họ
   */
  async create(input: CreateCharacterInput): Promise<MemberEntity> {
    try {
      return await this.insert(input);
    } catch (error) {
      // Hậu tố ngẫu nhiên đụng id đã có — sinh lại một lần nữa là đủ.
      if (!isUniqueViolation(error)) throw error;

      return this.insert(input);
    }
  }

  /**
   * Sửa tên và/hoặc lưu phái. Id không đổi vì các bảng khác đang trỏ vào nó.
   * @param id - Id thành viên
   * @param input - Các field cần đổi
   * @returns Thành viên sau khi sửa
   * @throws NotFoundException khi không có thành viên đó
   */
  async update(
    id: string,
    input: UpdateCharacterInput,
  ): Promise<MemberEntity> {
    await this.ensureExists(id);

    const row = await this.prisma.character.update({
      where: { id },
      data: input,
    });

    return toEntity(row);
  }

  /**
   * Cấp lại mật khẩu điểm danh mới cho một thành viên.
   * @param id - Id thành viên
   * @returns Thành viên kèm mật khẩu mới
   * @throws NotFoundException khi không có thành viên đó
   */
  async resetPassword(id: string): Promise<MemberEntity> {
    await this.ensureExists(id);

    const row = await this.prisma.character.update({
      where: { id },
      data: { password: generatePassword() },
    });

    return toEntity(row);
  }

  /**
   * Xoá một thành viên cùng toàn bộ điểm danh và ô đội hình của họ (cascade ở database).
   * @param id - Id thành viên
   * @returns Promise hoàn tất khi đã xoá
   * @throws NotFoundException khi không có thành viên đó
   */
  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    await this.prisma.character.delete({ where: { id } });
  }

  /**
   * Ghi một hàng Character mới với id và mật khẩu vừa sinh.
   * @param input - Tên và lưu phái
   * @returns Thành viên vừa tạo
   */
  private async insert(input: CreateCharacterInput): Promise<MemberEntity> {
    const row = await this.prisma.character.create({
      data: {
        id: generateId(input.name),
        name: input.name,
        guildClass: input.guildClass,
        password: generatePassword(),
      },
    });

    return toEntity(row);
  }

  /**
   * Kiểm tra thành viên có tồn tại không.
   * @param id - Id thành viên
   * @returns Promise hoàn tất khi thành viên tồn tại
   * @throws NotFoundException khi không có thành viên đó
   */
  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.character.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(NOT_FOUND);
    }
  }
}

/**
 * Đổi một hàng Prisma thành entity trả cho client.
 * @param row - Hàng Character đọc từ database
 * @returns Entity thành viên
 */
function toEntity(row: {
  id: string;
  name: string;
  guildClass: string;
  password: string;
}): MemberEntity {
  return {
    id: row.id,
    name: row.name,
    // Prisma sinh ra union string literal, enum dùng chung là TS enum — cùng giá trị,
    // ràng buộc bởi enum trong database nên cast ở đây là an toàn.
    guildClass: row.guildClass as GuildClass,
    password: row.password,
  };
}

/**
 * Lỗi này có phải vi phạm ràng buộc duy nhất của Prisma không.
 * @param error - Lỗi bắt được
 * @returns true nếu là P2002
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === UNIQUE_VIOLATION
  );
}
```

- [ ] **Step 6: Chạy test service để xác nhận pass**

Run: `pnpm --filter api test characters.service`
Expected: PASS, 9 test.

- [ ] **Step 7: Tạo controller**

`apps/api/src/modules/characters/characters.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common';
import { CharactersService } from './characters.service';
import {
  CreateCharacterDto,
  UpdateCharacterDto,
} from './dto/character.dto';
import type { MemberEntity } from './entities/character.entity';

/**
 * Quản lý thành viên — toàn bộ endpoint đều trả về mật khẩu điểm danh,
 * nên guard đặt ở cấp controller chứ không đặt lẻ từng route.
 */
@ApiTags('characters')
@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  /**
   * Danh sách thành viên kèm mật khẩu.
   * @returns Mảng thành viên sắp theo tên
   */
  @Get()
  @ApiOperation({ summary: 'Danh sách thành viên kèm mật khẩu' })
  list(): Promise<MemberEntity[]> {
    return this.characters.list();
  }

  /**
   * Thêm một thành viên.
   * @param body - Tên và lưu phái
   * @returns Thành viên vừa tạo, kèm mật khẩu vừa cấp
   */
  @Post()
  @ApiOperation({ summary: 'Thêm một thành viên' })
  create(@Body() body: CreateCharacterDto): Promise<MemberEntity> {
    return this.characters.create(body);
  }

  /**
   * Sửa tên hoặc lưu phái của một thành viên.
   * @param id - Id thành viên
   * @param body - Các field cần đổi
   * @returns Thành viên sau khi sửa
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Sửa một thành viên' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCharacterDto,
  ): Promise<MemberEntity> {
    return this.characters.update(id, body);
  }

  /**
   * Cấp lại mật khẩu điểm danh cho một thành viên.
   * @param id - Id thành viên
   * @returns Thành viên kèm mật khẩu mới
   */
  @Post(':id/password')
  @ApiOperation({ summary: 'Cấp lại mật khẩu cho một thành viên' })
  resetPassword(@Param('id') id: string): Promise<MemberEntity> {
    return this.characters.resetPassword(id);
  }

  /**
   * Xoá một thành viên cùng toàn bộ lịch sử điểm danh và đội hình của họ.
   * @param id - Id thành viên
   * @returns Promise hoàn tất khi đã xoá
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá một thành viên' })
  remove(@Param('id') id: string): Promise<void> {
    return this.characters.remove(id);
  }
}
```

- [ ] **Step 8: Tạo module và đăng ký vào app**

`apps/api/src/modules/characters/characters.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';

/**
 * Public API của module: module khác chỉ được import từ file này, không đụng
 * file nội bộ (luật no-restricted-imports trong eslint.config.mjs).
 */
export type { MemberEntity } from './entities/character.entity';

/** Module quản lý thành viên: CRUD nhân vật trong bang, chỉ quản trị viên dùng. */
@Module({
  controllers: [CharactersController],
  providers: [CharactersService],
})
export class CharactersModule {}
```

`apps/api/src/app.module.ts` — thêm import và đưa vào mảng `imports`, đặt ngay sau `BattleSessionsModule`:

```ts
import { CharactersModule } from '@/modules/characters/characters.module';
```

```ts
    BattleSessionsModule,
    CharactersModule,
    AttendanceModule,
```

- [ ] **Step 9: Chạy toàn bộ test và lint**

Run: `pnpm --filter api test && pnpm --filter api lint`
Expected: toàn bộ PASS, lint sạch.

- [ ] **Step 10: Thử endpoint thật**

Khởi động API (`pnpm --filter api dev`), rồi:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"huy","password":"testne"}' | jq -r '.data.accessToken')

curl -s http://localhost:3001/api/characters -H "Authorization: Bearer $TOKEN" | jq '.data[0]'

curl -s -X POST http://localhost:3001/api/characters \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Mèo Thử Nghiệm","guildClass":"CUU_LINH"}' | jq
```

Expected: lệnh đầu trả một thành viên có field `password`; lệnh sau trả `id` dạng `meo-thu-nghiem-xxxxxx` và `password` 8 ký tự. Không có token thì phải nhận `401`. Xoá thành viên vừa tạo bằng `DELETE /api/characters/<id>` cho sạch.

(Nếu response bọc trong `data` khác với ví dụ trên thì đọc `transform.interceptor.ts` để lấy đúng đường dẫn jq — phần này chỉ để kiểm tra bằng mắt.)

- [ ] **Step 11: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): add admin CRUD for guild members"
```

---

### Task 5: Tầng dữ liệu frontend cho thành viên

**Files:**
- Create: `apps/web/features/members/types/member.ts`
- Create: `apps/web/features/members/api/members-api.ts`
- Create: `apps/web/features/members/api/members-keys.ts`
- Create: `apps/web/features/members/hooks/use-members.ts`
- Create: `apps/web/features/members/hooks/use-member-mutations.ts`

**Interfaces:**
- Consumes: `apiFetch`, `ApiError` từ `@/lib/api-client`; `getAccessToken` từ `@/features/auth`; `CreateCharacterInput`, `UpdateCharacterInput` từ `@shared/schemas`; `attendanceKeys` từ `@/features/attendance`; `teamBuilderKeys` từ `@/features/team-builder`.
- Produces:
  - `Member` = `{ id: string; name: string; guildClass: GuildClass; password: string }` (đặt ở `types/member.ts`)
  - `memberKeys.all`, `memberKeys.list()`
  - `useMembers()`, `useCreateMember()`, `useUpdateMember()`, `useResetMemberPassword()`, `useDeleteMember()`
  - `UpdateMemberVariables` = `{ id: string; input: UpdateCharacterInput }`

- [ ] **Step 1: Tạo type và file API (server actions)**

`apps/web/features/members/types/member.ts` — để riêng khỏi `members-api.ts` vì file `"use server"`
chỉ nên export hàm async:

```ts
import type { GuildClass } from "@shared/enums";

/** Một thành viên trong bang, kèm mật khẩu điểm danh. */
export interface Member {
  id: string;
  name: string;
  guildClass: GuildClass;
  /** Mật khẩu điểm danh dạng plaintext — chỉ quản trị viên đọc được. */
  password: string;
}
```

`apps/web/features/members/api/members-api.ts`:

```ts
"use server";

import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@shared/schemas";

import { getAccessToken } from "@/features/auth";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Member } from "../types/member";

/**
 * Lấy access token của quản trị viên đang đăng nhập.
 * Chạy ở server vì token nằm trong cookie httpOnly, client không đọc được.
 * (Trùng với helper cùng tên ở features/settings và features/team-builder —
 * file "use server" chỉ được export hàm async nên không dùng chung được.)
 * @returns Header Authorization đã dựng sẵn
 * @throws ApiError khi phiên đăng nhập đã hết hạn
 */
async function authHeader(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ApiError(
      "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      401
    );
  }

  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Lấy danh sách thành viên kèm mật khẩu.
 * @returns Mảng thành viên sắp theo tên
 */
export async function fetchMembers(): Promise<Member[]> {
  return apiFetch<Member[]>("/characters", { headers: await authHeader() });
}

/**
 * Thêm một thành viên.
 * @param input - Tên và lưu phái
 * @returns Thành viên vừa tạo, kèm mật khẩu vừa cấp
 * @throws ApiError với message tiếng Việt của backend khi bị từ chối
 */
export async function createMember(
  input: CreateCharacterInput
): Promise<Member> {
  return apiFetch<Member>("/characters", {
    method: "POST",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Sửa tên hoặc lưu phái của một thành viên.
 * @param id - Id thành viên
 * @param input - Các field cần đổi
 * @returns Thành viên sau khi sửa
 * @throws ApiError khi thành viên đã bị xoá (404) hoặc backend từ chối
 */
export async function updateMember(
  id: string,
  input: UpdateCharacterInput
): Promise<Member> {
  return apiFetch<Member>(`/characters/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: await authHeader(),
  });
}

/**
 * Cấp lại mật khẩu điểm danh cho một thành viên.
 * @param id - Id thành viên
 * @returns Thành viên kèm mật khẩu mới
 * @throws ApiError khi thành viên đã bị xoá (404)
 */
export async function resetMemberPassword(id: string): Promise<Member> {
  return apiFetch<Member>(`/characters/${encodeURIComponent(id)}/password`, {
    method: "POST",
    headers: await authHeader(),
  });
}

/**
 * Xoá một thành viên cùng lịch sử điểm danh và đội hình của họ.
 * @param id - Id thành viên
 * @returns Promise hoàn tất khi đã xoá
 * @throws ApiError khi thành viên đã bị xoá (404)
 */
export async function deleteMember(id: string): Promise<void> {
  await apiFetch<void>(`/characters/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
```

(`@shared/enums` là alias đã có sẵn trong `apps/web/tsconfig.json` — `features/team-builder` đang import `GuildClass` y như vậy.)

- [ ] **Step 2: Tạo query key factory**

`apps/web/features/members/api/members-keys.ts`:

```ts
/**
 * Query key factory cho màn Quản lý thành viên.
 * Tách khỏi `members-api.ts` vì file `"use server"` chỉ được export hàm async.
 */
export const memberKeys = {
  all: ["members"] as const,
  list: () => [...memberKeys.all, "list"] as const,
};
```

- [ ] **Step 3: Tạo hook query**

`apps/web/features/members/hooks/use-members.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMembers } from "../api/members-api";
import { memberKeys } from "../api/members-keys";

/**
 * Query danh sách thành viên kèm mật khẩu.
 * @returns Kết quả query TanStack (data là mảng thành viên)
 */
export function useMembers() {
  return useQuery({
    queryKey: memberKeys.list(),
    queryFn: fetchMembers,
  });
}
```

- [ ] **Step 4: Tạo hook mutation**

`apps/web/features/members/hooks/use-member-mutations.ts`:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@shared/schemas";

import { attendanceKeys } from "@/features/attendance";
import { teamBuilderKeys } from "@/features/team-builder";
import {
  createMember,
  deleteMember,
  resetMemberPassword,
  updateMember,
} from "../api/members-api";
import { memberKeys } from "../api/members-keys";

/** Payload sửa một thành viên. */
export interface UpdateMemberVariables {
  /** Id thành viên cần sửa */
  id: string;
  /** Các field cần đổi */
  input: UpdateCharacterInput;
}

/**
 * Làm mới mọi màn phụ thuộc danh sách thành viên sau khi thêm/sửa/xoá.
 * Bảng điểm danh và trang Xếp team đều liệt kê nhân vật, thiếu chỗ nào là
 * các màn lệch nhau cho tới lần tải lại trang.
 * @returns Hàm invalidate dùng trong onSuccess của mutation
 */
function useInvalidateMembers() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    void queryClient.invalidateQueries({
      queryKey: attendanceKeys.characters(),
    });
    void queryClient.invalidateQueries({ queryKey: attendanceKeys.records() });
    void queryClient.invalidateQueries({ queryKey: teamBuilderKeys.all });
  };
}

/**
 * Mutation thêm thành viên.
 * @returns Mutation TanStack (dùng mutateAsync để lấy mật khẩu vừa cấp)
 */
export function useCreateMember() {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: (input: CreateCharacterInput) => createMember(input),
    onSuccess: invalidate,
  });
}

/**
 * Mutation sửa thành viên.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useUpdateMember() {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: ({ id, input }: UpdateMemberVariables) =>
      updateMember(id, input),
    onSuccess: invalidate,
  });
}

/**
 * Mutation cấp lại mật khẩu.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useResetMemberPassword() {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: (id: string) => resetMemberPassword(id),
    onSuccess: invalidate,
  });
}

/**
 * Mutation xoá thành viên.
 * @returns Mutation TanStack (dùng mutateAsync để bắt lỗi backend)
 */
export function useDeleteMember() {
  const invalidate = useInvalidateMembers();

  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: invalidate,
  });
}
```

(`attendanceKeys.characters()` và `attendanceKeys.records()` đã có sẵn trong `apps/web/features/attendance/api/attendance-api.ts`, export qua `index.ts` của feature; `teamBuilderKeys` export qua `features/team-builder/index.ts`.)

- [ ] **Step 5: Kiểm tra type và lint**

Run: `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/features/members
git commit -m "feat(web): add data layer for member management"
```

---

### Task 6: Giao diện quản lý thành viên

**Files:**
- Create: `apps/web/features/members/components/members-panel.tsx`
- Create: `apps/web/features/members/components/member-row.tsx`
- Create: `apps/web/features/members/components/member-form-dialog.tsx`
- Create: `apps/web/features/members/components/delete-member-dialog.tsx`
- Create: `apps/web/features/members/index.ts`

**Interfaces:**
- Consumes: hook và type từ Task 5; `Table*` từ `@/components/ui/table`; `Dialog*`, `Button`, `Input`, `Label`, `Select*` từ `@/components/ui/*`; `ErrorState` từ `@/components/shared/error-state`; `Skeleton` từ `@/components/ui/skeleton`; `GUILD_CLASS_LABEL`, `GUILD_CLASS_OPTIONS` từ `@shared/enums`.
- Produces: `MembersPanel` export qua `features/members/index.ts` — Task 7 dùng.

`Select` trong repo là bản base-ui: `SelectValue` nhận **render function** làm children và `onValueChange` trả về giá trị chưa hẹp kiểu — xem `apps/web/features/team-builder/components/week-picker.tsx` để đối chiếu. Code dưới đây đã viết theo đúng API đó.

- [ ] **Step 1: Ô mật khẩu + một hàng trong bảng**

`apps/web/features/members/components/member-row.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

import { GUILD_CLASS_LABEL } from "@shared/enums";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Member } from "../types/member";

/** Thời gian giữ icon dấu tích sau khi copy (ms). */
const COPIED_FEEDBACK_MS = 1500;

interface PasswordCellProps {
  /** Mật khẩu điểm danh của thành viên */
  password: string;
}

/**
 * Ô mật khẩu: mặc định che, bấm con mắt để hiện, bấm copy để chép.
 * Che sẵn để lúc chia sẻ màn hình không phơi mật khẩu của cả bang.
 * @param password - Mật khẩu điểm danh của thành viên
 * @returns Ô mật khẩu kèm hai nút
 */
export function PasswordCell({ password }: PasswordCellProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Chép mật khẩu vào clipboard rồi đổi icon trong giây lát làm phản hồi.
   * @returns Promise hoàn tất khi đã chép xong
   */
  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-sm">
        {visible ? password : "••••••••"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Copy mật khẩu"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="size-4 text-emerald-600" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  );
}

interface MemberRowProps {
  /** Thành viên của hàng này */
  member: Member;
  /** Gọi khi bấm Sửa */
  onEdit: (member: Member) => void;
  /** Gọi khi bấm Xoá */
  onDelete: (member: Member) => void;
}

/**
 * Một hàng thành viên trong bảng quản lý.
 * @param member - Thành viên của hàng này
 * @param onEdit - Gọi khi bấm Sửa
 * @param onDelete - Gọi khi bấm Xoá
 * @returns Hàng bảng
 */
export function MemberRow({ member, onEdit, onDelete }: MemberRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{member.name}</TableCell>
      <TableCell>{GUILD_CLASS_LABEL[member.guildClass]}</TableCell>
      <TableCell>
        <PasswordCell password={member.password} />
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Sửa ${member.name}`}
          onClick={() => onEdit(member)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Xoá ${member.name}`}
          onClick={() => onDelete(member)}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 2: Dialog thêm/sửa**

`apps/web/features/members/components/member-form-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";

import {
  GUILD_CLASS_LABEL,
  GUILD_CLASS_OPTIONS,
  type GuildClass,
} from "@shared/enums";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import type { Member } from "../types/member";
import {
  useCreateMember,
  useResetMemberPassword,
  useUpdateMember,
} from "../hooks/use-member-mutations";

/** Thời gian giữ icon dấu tích sau khi copy (ms). */
const COPIED_FEEDBACK_MS = 1500;

interface MemberFormDialogProps {
  /** Dialog đang mở hay không */
  open: boolean;
  /** Thành viên đang sửa; null nghĩa là đang thêm mới */
  member: Member | null;
  /** Gọi khi dialog đóng lại */
  onOpenChange: (open: boolean) => void;
}

/**
 * Form thêm/sửa một thành viên. Thêm xong thì dialog chuyển sang màn kết quả
 * hiện tên + mật khẩu vừa cấp để copy gửi cho họ.
 * @param open - Dialog đang mở hay không
 * @param member - Thành viên đang sửa; null nghĩa là thêm mới
 * @param onOpenChange - Gọi khi dialog đóng lại
 * @returns Dialog form
 */
export function MemberFormDialog({
  open,
  member,
  onOpenChange,
}: MemberFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Form nằm ở component con nên state tự reset mỗi lần mở lại. */}
        {open && (
          <MemberForm member={member} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MemberFormProps {
  /** Thành viên đang sửa; null nghĩa là thêm mới */
  member: Member | null;
  /** Gọi khi đóng dialog */
  onDone: () => void;
}

/**
 * Hai ô nhập của một thành viên: tên và lưu phái, kèm nút cấp lại mật khẩu khi sửa.
 * @param member - Thành viên đang sửa; null nghĩa là thêm mới
 * @param onDone - Gọi khi đóng dialog
 * @returns Form thêm/sửa thành viên
 */
function MemberForm({ member, onDone }: MemberFormProps) {
  const [name, setName] = useState(member?.name ?? "");
  const [guildClass, setGuildClass] = useState<GuildClass>(
    member?.guildClass ?? GUILD_CLASS_OPTIONS[0]
  );
  const [error, setError] = useState<string | null>(null);
  /** Thành viên vừa tạo — có giá trị thì dialog chuyển sang màn kết quả. */
  const [created, setCreated] = useState<Member | null>(null);

  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();
  const saving = createMutation.isPending || updateMutation.isPending;

  /**
   * Gửi form: tạo mới hoặc cập nhật tuỳ theo đang sửa ai.
   * @param event - Sự kiện submit form
   * @returns Promise hoàn tất khi đã lưu xong hoặc đã hiển thị lỗi
   */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input = { name: name.trim(), guildClass };

    try {
      if (member) {
        await updateMutation.mutateAsync({ id: member.id, input });
        onDone();
      } else {
        setCreated(await createMutation.mutateAsync(input));
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Không lưu được thay đổi."
      );
    }
  }

  if (created) {
    return <CreatedMember member={created} onDone={onDone} />;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {member ? "Sửa thành viên" : "Thêm thành viên"}
        </DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="member-name">Tên</Label>
        <Input
          id="member-name"
          required
          maxLength={50}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="member-class">Lưu phái</Label>
        <Select
          value={guildClass}
          onValueChange={(next) => setGuildClass(String(next) as GuildClass)}
        >
          <SelectTrigger id="member-class">
            <SelectValue>{() => GUILD_CLASS_LABEL[guildClass]}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {GUILD_CLASS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {GUILD_CLASS_LABEL[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {member && <ResetPasswordButton member={member} onError={setError} />}

      {error && (
        <div className="flex items-start gap-1.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface ResetPasswordButtonProps {
  /** Thành viên đang sửa */
  member: Member;
  /** Gọi khi cấp lại mật khẩu thất bại */
  onError: (message: string) => void;
}

/**
 * Nút cấp lại mật khẩu, có một bước xác nhận ngay tại chỗ vì thao tác này
 * làm mật khẩu cũ hết hiệu lực ngay lập tức.
 * @param member - Thành viên đang sửa
 * @param onError - Gọi khi cấp lại mật khẩu thất bại
 * @returns Nút cấp lại mật khẩu
 */
function ResetPasswordButton({ member, onError }: ResetPasswordButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const resetMutation = useResetMemberPassword();

  /**
   * Cấp lại mật khẩu mới cho thành viên đang sửa.
   * @returns Promise hoàn tất khi đã cấp xong hoặc đã báo lỗi
   */
  async function handleReset() {
    try {
      await resetMutation.mutateAsync(member.id);
      setConfirming(false);
    } catch (caught) {
      onError(
        caught instanceof ApiError
          ? caught.message
          : "Không cấp lại được mật khẩu."
      );
    }
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setConfirming(true)}
      >
        Cấp lại mật khẩu
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-3 text-sm">
      <p className="mb-2">
        Mật khẩu cũ của {member.name} sẽ hết hiệu lực ngay. Tiếp tục?
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={resetMutation.isPending}
          onClick={handleReset}
        >
          {resetMutation.isPending ? "Đang cấp…" : "Cấp lại"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(false)}
        >
          Huỷ
        </Button>
      </div>
    </div>
  );
}

interface CreatedMemberProps {
  /** Thành viên vừa tạo */
  member: Member;
  /** Gọi khi đóng dialog */
  onDone: () => void;
}

/**
 * Màn kết quả sau khi thêm: hiện tên và mật khẩu vừa cấp để copy gửi cho thành viên.
 * Đóng lại là thôi — mật khẩu vẫn xem lại được ở bảng.
 * @param member - Thành viên vừa tạo
 * @param onDone - Gọi khi đóng dialog
 * @returns Nội dung màn kết quả
 */
function CreatedMember({ member, onDone }: CreatedMemberProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Chép cả tên lẫn mật khẩu để dán thẳng vào tin nhắn.
   * @returns Promise hoàn tất khi đã chép xong
   */
  async function handleCopy() {
    await navigator.clipboard.writeText(`${member.name}: ${member.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Đã thêm {member.name}</DialogTitle>
      </DialogHeader>

      <div className="rounded-lg border p-3">
        <div className="text-sm text-muted-foreground">Mật khẩu điểm danh</div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg">{member.password}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy tên và mật khẩu"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Gửi mật khẩu này cho thành viên. Xem lại được bất cứ lúc nào ở bảng.
      </p>

      <DialogFooter>
        <Button onClick={onDone}>Xong</Button>
      </DialogFooter>
    </div>
  );
}
```

- [ ] **Step 3: Dialog xoá**

`apps/web/features/members/components/delete-member-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
import type { Member } from "../types/member";
import { useDeleteMember } from "../hooks/use-member-mutations";

interface DeleteMemberDialogProps {
  /** Thành viên sắp xoá; null thì dialog đóng */
  member: Member | null;
  /** Gọi khi dialog đóng lại */
  onClose: () => void;
}

/**
 * Xác nhận xoá một thành viên. Nói thẳng là mất cả lịch sử vì database xoá cascade,
 * không có đường khôi phục.
 * @param member - Thành viên sắp xoá; null thì dialog đóng
 * @param onClose - Gọi khi dialog đóng lại
 * @returns Dialog xác nhận xoá
 */
export function DeleteMemberDialog({
  member,
  onClose,
}: DeleteMemberDialogProps) {
  const deleteMutation = useDeleteMember();
  const [error, setError] = useState<string | null>(null);

  /**
   * Xoá thành viên rồi đóng dialog; thất bại thì giữ dialog và hiện lỗi.
   * @returns Promise hoàn tất khi đã xoá xong hoặc đã hiển thị lỗi
   */
  async function handleDelete() {
    if (!member) return;
    setError(null);

    try {
      await deleteMutation.mutateAsync(member.id);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Không xoá được thành viên này."
      );
    }
  }

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        {member && (
          <div className="grid gap-3">
            <DialogHeader>
              <DialogTitle>Xoá {member.name}?</DialogTitle>
            </DialogHeader>
            <div className="text-sm">
              Toàn bộ lịch sử điểm danh và các ô đội hình đã xếp của thành viên
              này sẽ mất theo, kể cả tuần cũ — không khôi phục được.
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Huỷ
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? "Đang xoá…" : "Xoá thành viên"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Panel chính**

`apps/web/features/members/components/members-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Member } from "../types/member";
import { useMembers } from "../hooks/use-members";
import { DeleteMemberDialog } from "./delete-member-dialog";
import { MemberFormDialog } from "./member-form-dialog";
import { MemberRow } from "./member-row";

/** Số hàng khung xương hiện trong lúc chờ dữ liệu. */
const SKELETON_ROWS = 5;

/**
 * Bảng quản lý thành viên: tìm theo tên, thêm/sửa/xoá, xem và copy mật khẩu.
 * Cả bang chỉ vài chục người nên lọc ngay ở client, không phân trang.
 * @returns Panel quản lý thành viên
 */
export function MembersPanel() {
  const membersQuery = useMembers();
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Member | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Member | null>(null);

  if (membersQuery.isError) {
    return (
      <ErrorState
        message="Không tải được danh sách thành viên."
        onRetry={() => void membersQuery.refetch()}
      />
    );
  }

  if (membersQuery.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-64" />
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const normalized = keyword.trim().toLowerCase();
  const members = normalized
    ? membersQuery.data.filter((member) =>
        member.name.toLowerCase().includes(normalized)
      )
    : membersQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          className="max-w-64"
          placeholder="Tìm theo tên…"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <UserPlus className="size-4" />
          Thêm thành viên
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Lưu phái</TableHead>
            <TableHead>Mật khẩu</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              onEdit={(target) => {
                setEditing(target);
                setFormOpen(true);
              }}
              onDelete={setDeleting}
            />
          ))}
        </TableBody>
      </Table>

      {members.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {normalized
            ? "Không có thành viên nào khớp."
            : "Bang chưa có thành viên nào."}
        </div>
      )}

      <MemberFormDialog
        open={formOpen}
        member={editing}
        onOpenChange={setFormOpen}
      />
      <DeleteMemberDialog
        member={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Public API của feature**

`apps/web/features/members/index.ts`:

```ts
export { MembersPanel } from "./components/members-panel";
```

- [ ] **Step 6: Kiểm tra type và lint**

Run: `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
Expected: PASS.

(`ErrorState` nhận đúng hai props `message` và `onRetry` — xem `apps/web/components/shared/error-state.tsx`.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/features/members
git commit -m "feat(web): add member management panel"
```

---

### Task 7: Chia màn Thiết lập thành hai tab

**Files:**
- Create: `apps/web/features/settings/components/settings-tabs.tsx`
- Modify: `apps/web/features/settings/index.ts`
- Modify: `apps/web/app/thiet-lap/page.tsx`

**Interfaces:**
- Consumes: `SettingsScreen` (nội bộ feature settings), `MembersPanel` từ `@/features/members`, `Tabs*` từ `@/components/ui/tabs`.
- Produces: `SettingsTabs` export qua `@/features/settings`.

- [ ] **Step 1: Tạo component tab**

`apps/web/features/settings/components/settings-tabs.tsx`:

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MembersPanel } from "@/features/members";
import { SettingsScreen } from "./settings-screen";

/** Giá trị của hai tab — mở mặc định ở lịch đánh, việc hay làm nhất. */
const TAB = {
  battles: "battles",
  members: "members",
} as const;

/**
 * Màn Thiết lập với hai tab: lịch đánh và quản lý thành viên.
 * Tab đang mở chỉ là state cục bộ — không đưa vào URL vì không có nhu cầu
 * gửi link thẳng tới một tab.
 * @returns Màn thiết lập dạng tab
 */
export function SettingsTabs() {
  return (
    <Tabs defaultValue={TAB.battles}>
      <TabsList>
        <TabsTrigger value={TAB.battles}>Thiết lập trận đánh</TabsTrigger>
        <TabsTrigger value={TAB.members}>Quản lý thành viên</TabsTrigger>
      </TabsList>

      <TabsContent value={TAB.battles}>
        <SettingsScreen />
      </TabsContent>

      <TabsContent value={TAB.members}>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-semibold">Quản lý thành viên</h1>
              <p className="text-sm text-muted-foreground">
                Thêm thành viên mới, sửa lưu phái, xem và cấp lại mật khẩu điểm
                danh.
              </p>
            </div>
            <MembersPanel />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
```

`SettingsScreen` tự bọc `Card` sẵn nên tab lịch đánh không bọc thêm; tab thành viên bọc ở đây để hai tab trông cùng một kiểu.

- [ ] **Step 2: Export ra ngoài feature**

`apps/web/features/settings/index.ts`:

```ts
export { SettingsScreen } from "./components/settings-screen";
export { SettingsTabs } from "./components/settings-tabs";
```

- [ ] **Step 3: Đổi page sang render tab**

`apps/web/app/thiet-lap/page.tsx` — đổi import và lời gọi, giữ nguyên phần kiểm tra session:

```tsx
import { SettingsTabs } from "@/features/settings";
```

```tsx
  return <SettingsTabs />;
```

Sửa `metadata.description` cho khớp nội dung mới:

```tsx
  description: "Thiết lập lịch đánh và quản lý thành viên (chỉ quản trị viên)",
```

- [ ] **Step 4: Kiểm tra type và lint**

Run: `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
Expected: PASS.

- [ ] **Step 5: Thử tay trên trình duyệt**

Chạy `pnpm --filter api dev` và `pnpm --filter web dev`, đăng nhập `huy` / `testne`, vào `http://localhost:3000/thiet-lap`:

1. Thấy hai tab, mặc định mở "Thiết lập trận đánh" và nội dung y như trước.
2. Sang tab "Quản lý thành viên": bảng liệt kê 25 người, mật khẩu che.
3. Bấm con mắt → hiện mật khẩu; bấm copy → icon đổi thành dấu tích rồi trở lại, dán ra thấy đúng mật khẩu.
4. "Thêm thành viên" với tên có dấu → dialog hiện tên + mật khẩu; đóng lại thấy người mới trong bảng.
5. Sửa tên/lưu phái người vừa tạo → bảng cập nhật.
6. "Cấp lại mật khẩu" trong dialog sửa → xác nhận → mật khẩu ở bảng đổi.
7. Xoá người vừa tạo → biến mất khỏi bảng; sang màn điểm danh kiểm tra danh sách nhân vật cũng không còn người đó.
8. Ô tìm kiếm gõ một phần tên → bảng lọc đúng; gõ chuỗi vô nghĩa → hiện "Không có thành viên nào khớp."

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): split the settings screen into two tabs"
```

---

### Task 8: Cập nhật tài liệu

**Files:**
- Modify: `README.md` (phần "Màn hình" và câu về mật khẩu thành viên)
- Modify: `docs/development.md` (nếu có nhắc tới mật khẩu hash hoặc seed)

**Interfaces:**
- Consumes: hành vi đã hoàn thành ở Task 1–7.

- [ ] **Step 1: Đọc chỗ cần sửa**

Run: `grep -rn "mật khẩu\|seed.ts\|Thiết lập" README.md docs/development.md`
Expected: liệt kê các dòng nói về mật khẩu riêng của nhân vật và màn Thiết lập.

- [ ] **Step 2: Sửa README**

- Ở câu "Thành viên điểm danh bằng mật khẩu riêng của nhân vật — xem `apps/api/prisma/seed.ts`.": bổ sung rằng mật khẩu do quản trị viên cấp và xem lại được ở tab "Quản lý thành viên" của màn Thiết lập.
- Ở phần "Màn hình", mô tả màn Thiết lập giờ có hai tab: "Thiết lập trận đánh" và "Quản lý thành viên".

Giữ nguyên văn phong tiếng Việt và độ dài của các mục xung quanh.

- [ ] **Step 3: Sửa docs/development.md nếu cần**

Nếu file có nhắc "hash mật khẩu" hoặc mô tả cột `passwordHash`, sửa cho khớp cột `password` plaintext. Nếu không có, bỏ qua bước này.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/development.md
git commit -m "docs: describe member management in the settings screen"
```

---

## Ghi chú vận hành sau khi triển khai

Migration ở Task 2 ghi đè mật khẩu của mọi thành viên đang có. Trên production, sau khi chạy
`pnpm --filter api migrate:prod`, phải vào tab "Quản lý thành viên" copy mật khẩu mới của từng người
và báo lại cho họ — mật khẩu cũ không còn dùng được.
