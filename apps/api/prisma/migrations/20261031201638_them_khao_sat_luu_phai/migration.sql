-- CreateEnum
CREATE TYPE "ClassChangeConfidence" AS ENUM ('SURE', 'CONSIDERING');

-- AlterEnum
ALTER TYPE "GrantableCommand" ADD VALUE 'KHAO_SAT_LUU_PHAI';

-- CreateTable
CREATE TABLE "ClassSurvey" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ClassSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSurveyAnswer" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "fromClass" "GuildClass" NOT NULL,
    "targetClass" "GuildClass",
    "confidence" "ClassChangeConfidence",
    "answeredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSurveyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSurvey_closesAt_idx" ON "ClassSurvey"("closesAt");

-- CreateIndex
CREATE INDEX "ClassSurveyAnswer_characterId_idx" ON "ClassSurveyAnswer"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSurveyAnswer_surveyId_characterId_key" ON "ClassSurveyAnswer"("surveyId", "characterId");

-- AddForeignKey
ALTER TABLE "ClassSurveyAnswer" ADD CONSTRAINT "ClassSurveyAnswer_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "ClassSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSurveyAnswer" ADD CONSTRAINT "ClassSurveyAnswer_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cùng lý do như migration 20260829064510_them_bang_ten_doi: bảng mới phải tự bật RLS, không policy
-- nào cả - bật RLS mà không có policy nghĩa là từ chối tất cả.
ALTER TABLE "ClassSurvey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassSurveyAnswer" ENABLE ROW LEVEL SECURITY;

-- Giữ nguyên = cả hai cột null; chuyển = cả hai cùng có. Prisma không biểu diễn được CHECK.
ALTER TABLE "ClassSurveyAnswer" ADD CONSTRAINT "ClassSurveyAnswer_target_confidence_together"
  CHECK (("targetClass" IS NULL) = ("confidence" IS NULL));
