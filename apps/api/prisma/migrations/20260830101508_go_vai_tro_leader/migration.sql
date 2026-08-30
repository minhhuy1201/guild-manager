-- Vai trò LEADER bị gỡ: hạ mọi cán bộ cũ xuống MEMBER trước khi giá trị enum biến mất.
-- Prisma chỉ sinh khối đổi type bên dưới, không sinh bước chuyển dữ liệu này.
UPDATE "Character" SET "role" = 'MEMBER' WHERE "role" = 'LEADER';

-- AlterEnum
BEGIN;
CREATE TYPE "GuildRole_new" AS ENUM ('ADMIN', 'MEMBER');
ALTER TABLE "public"."Character" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Character" ALTER COLUMN "role" TYPE "GuildRole_new" USING ("role"::text::"GuildRole_new");
ALTER TYPE "GuildRole" RENAME TO "GuildRole_old";
ALTER TYPE "GuildRole_new" RENAME TO "GuildRole";
DROP TYPE "public"."GuildRole_old";
ALTER TABLE "Character" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
COMMIT;
