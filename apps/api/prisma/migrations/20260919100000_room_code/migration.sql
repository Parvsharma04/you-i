-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "code" TEXT,
ADD COLUMN     "codeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "SessionPlayer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "deviceId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SessionPlayer_pkey" PRIMARY KEY ("id")
);

-- Migrate existing player columns into SessionPlayer
INSERT INTO "SessionPlayer" ("id", "sessionId", "playerId", "role", "joinedAt")
SELECT gen_random_uuid(), "id", "player1Id", 'player1', "createdAt"
FROM "Session"
WHERE "player1Id" IS NOT NULL;

INSERT INTO "SessionPlayer" ("id", "sessionId", "playerId", "role", "joinedAt")
SELECT gen_random_uuid(), "id", "player2Id", 'player2', "createdAt"
FROM "Session"
WHERE "player2Id" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SessionPlayer_sessionId_role_key" ON "SessionPlayer"("sessionId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "SessionPlayer_sessionId_playerId_key" ON "SessionPlayer"("sessionId", "playerId");

-- AddForeignKey
ALTER TABLE "SessionPlayer" ADD CONSTRAINT "SessionPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Session_code_key" ON "Session"("code");

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "player1Id",
DROP COLUMN "player2Id";
