-- CreateTable
CREATE TABLE "FormationMatch" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "matchIndex" INTEGER NOT NULL,

    CONSTRAINT "FormationMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationSlot" (
    "matchId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "FormationSlot_pkey" PRIMARY KEY ("matchId","slotId")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormationMatch_sessionId_matchIndex_key" ON "FormationMatch"("sessionId", "matchIndex");

-- CreateIndex
CREATE INDEX "FormationSlot_characterId_idx" ON "FormationSlot"("characterId");

-- AddForeignKey
ALTER TABLE "FormationMatch" ADD CONSTRAINT "FormationMatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BattleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationSlot" ADD CONSTRAINT "FormationSlot_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "FormationMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationSlot" ADD CONSTRAINT "FormationSlot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mỗi đội hình cũ thành trận 1 của ngày đó. Dùng lại id của Formation cho tiện đối chiếu.
INSERT INTO "FormationMatch" ("id", "sessionId", "matchIndex")
SELECT "id", "sessionId", 1 FROM "Formation";

-- Bung assignment JSON ra từng ô.
-- Điều kiện EXISTS là bắt buộc: luật cũ chỉ lọc id mồ côi lúc đọc chứ không xoá khỏi
-- database, nên dữ liệu thật gần như chắc chắn có ô trỏ tới nhân vật đã rời bang —
-- không lọc ở đây thì migration vỡ vì khoá ngoại.
INSERT INTO "FormationSlot" ("matchId", "slotId", "characterId")
SELECT f."id", kv.key, kv.value
FROM "Formation" f, jsonb_each_text(f."assignment") AS kv
WHERE EXISTS (SELECT 1 FROM "Character" c WHERE c."id" = kv.value);
