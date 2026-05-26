-- Presenza spettatori tabellone pubblico
CREATE TABLE "PublicBoardPresence" (
    "clientId" TEXT NOT NULL,
    "boardToken" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicBoardPresence_pkey" PRIMARY KEY ("clientId","boardToken")
);

CREATE INDEX "PublicBoardPresence_boardToken_lastSeenAt_idx" ON "PublicBoardPresence"("boardToken", "lastSeenAt");
