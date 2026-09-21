-- CreateTable
CREATE TABLE "Tactic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" VARCHAR(500),
    "stages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tactic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacticTokenPreset" (
    "id" TEXT NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TacticTokenPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tactic_updatedAt_idx" ON "Tactic"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TacticTokenPreset_label_key" ON "TacticTokenPreset"("label");
