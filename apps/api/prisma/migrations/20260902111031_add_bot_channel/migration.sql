-- CreateTable
CREATE TABLE "BotChannel" (
    "purpose" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotChannel_pkey" PRIMARY KEY ("purpose")
);
