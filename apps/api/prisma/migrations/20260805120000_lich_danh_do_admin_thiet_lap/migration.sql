-- Guild War chuyển sang id tất định `gw-<ngày Thứ 2 giờ VN>` để upsert idempotent.
-- Không làm bước này thì lần đầu chạy sẽ sinh thêm một trận Guild War thứ hai cho
-- tuần đang mở. Khóa ngoại của AttendanceRecord/Formation mặc định ON UPDATE CASCADE
-- nên điểm danh và đội hình đi theo id mới.
UPDATE "BattleSession"
SET "id" = 'gw-' || to_char("weekStart" + interval '7 hours', 'YYYY-MM-DD')
WHERE "isGuildWar" = true;

-- DropIndex
DROP INDEX "BattleSession_weekStart_label_key";

-- AlterTable
ALTER TABLE "BattleSession" DROP COLUMN "label",
ADD COLUMN     "opponent" TEXT;
