-- CreateTable
CREATE TABLE "TacticInsigniaName" (
    "key" TEXT NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TacticInsigniaName_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "TacticInsigniaName" ENABLE ROW LEVEL SECURITY;
