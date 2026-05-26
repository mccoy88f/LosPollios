-- Tabellone pubblico elezione (polling, no SSE)
ALTER TABLE "Election" ADD COLUMN "publicBoardEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Election" ADD COLUMN "publicBoardToken" TEXT;
ALTER TABLE "Election" ADD COLUMN "publicBoardRefreshSeconds" INTEGER NOT NULL DEFAULT 60;

CREATE UNIQUE INDEX "Election_publicBoardToken_key" ON "Election"("publicBoardToken");
