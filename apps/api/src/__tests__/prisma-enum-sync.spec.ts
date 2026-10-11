import * as SharedEnums from '@guild/shared/enums';

import * as PrismaEnums from '../generated/prisma/enums';

type EnumValues = Record<string, string>;

/**
 * Every Prisma enum must have a twin of the same name in `@guild/shared/enums` with the same set of
 * values. The shared side may have more enums: not every shared enum is a database column.
 *
 * @returns One line per Prisma enum with no twin or a different set of values
 */
function enumDrift(
  prismaEnums: Record<string, EnumValues>,
  sharedEnums: Record<string, unknown>,
): string[] {
  return Object.entries(prismaEnums).flatMap(([name, values]) => {
    const twin = sharedEnums[name];
    if (typeof twin !== 'object' || twin === null) {
      return [`${name}: Prisma enum has no twin in @guild/shared/enums`];
    }

    const prismaValues = Object.values(values).sort();
    const sharedValues = Object.values(twin as EnumValues).sort();
    if (JSON.stringify(prismaValues) === JSON.stringify(sharedValues)) {
      return [];
    }

    return [
      `${name}: Prisma has [${prismaValues.join(', ')}], @guild/shared/enums has [${sharedValues.join(', ')}]`,
    ];
  });
}

/**
 * Compares against the **generated** client, not `schema.prisma`: after a schema edit, run
 * `pnpm --filter api prisma:generate` (or `prisma:migrate`) before trusting a green run locally.
 * CI installs from scratch, and `postinstall` regenerates, so CI always compares the real schema.
 *
 * `BotChannel.purpose` is a `String` on purpose, not an enum (schema.prisma:206), so it is out of
 * scope here.
 */
describe('enum Prisma khớp @guild/shared/enums', () => {
  it('mỗi enum Prisma có bản cùng tên, cùng tập giá trị ở shared', () => {
    expect(enumDrift(PrismaEnums, SharedEnums)).toEqual([]);
  });

  describe('đỏ được khi lệch (dữ liệu giả)', () => {
    it('báo enum Prisma không có bản ở shared', () => {
      expect(enumDrift({ Color: { RED: 'RED' } }, {})).toEqual([
        'Color: Prisma enum has no twin in @guild/shared/enums',
      ]);
    });

    it('báo giá trị Prisma có mà shared thiếu', () => {
      expect(
        enumDrift(
          { Role: { ADMIN: 'ADMIN', GUEST: 'GUEST' } },
          { Role: { ADMIN: 'ADMIN' } },
        ),
      ).toEqual([
        'Role: Prisma has [ADMIN, GUEST], @guild/shared/enums has [ADMIN]',
      ]);
    });

    it('báo giá trị shared có mà Prisma thiếu', () => {
      expect(
        enumDrift(
          { Role: { ADMIN: 'ADMIN' } },
          { Role: { ADMIN: 'ADMIN', GUEST: 'GUEST' } },
        ),
      ).toEqual([
        'Role: Prisma has [ADMIN], @guild/shared/enums has [ADMIN, GUEST]',
      ]);
    });

    it('không báo khi shared có thêm enum Prisma không có', () => {
      expect(enumDrift({}, { TacticColor: { BLUE: 'BLUE' } })).toEqual([]);
    });
  });
});
