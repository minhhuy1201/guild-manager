-- Đổi khoá ngoại của FormationSlot.characterId từ CASCADE sang SET NULL.
--
-- Trước đây xoá một thành viên là xoá luôn cả hàng FormationSlot, ghi chú của ô đi theo. Ghi chú mô
-- tả vị trí chứ không mô tả con người — đúng quy tắc `releaseCharacterFromSession` đã cài khi ai đó
-- trả lời "Không". Từ giờ xoá thành viên chỉ làm ô trống người; ô nào vốn không có ghi chú thì
-- `CharactersService.remove` xoá trong cùng transaction.
--
-- Không mất dữ liệu: chỉ đổi ràng buộc, không đụng cột và không đụng hàng nào. Đã đọc SQL Prisma
-- sinh ra trước khi commit — nó không sinh DROP COLUMN + ADD COLUMN ở đây.

-- DropForeignKey
ALTER TABLE "FormationSlot" DROP CONSTRAINT "FormationSlot_characterId_fkey";

-- AddForeignKey
ALTER TABLE "FormationSlot" ADD CONSTRAINT "FormationSlot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
