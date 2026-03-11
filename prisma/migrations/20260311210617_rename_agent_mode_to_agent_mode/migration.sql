-- CreateEnum
CREATE TYPE "AgentMode" AS ENUM ('DEMO', 'WALLET');

-- AlterTable: add agent_mode only if not exists (may already exist if "mode" was renamed by previous migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Agent' AND column_name = 'agent_mode') THEN
    ALTER TABLE "Agent" ADD COLUMN "agent_mode" "AgentMode" NOT NULL DEFAULT 'DEMO';
  END IF;
END $$;
-- Other new columns (agent_mode already added above if needed)
ALTER TABLE "Agent" ADD COLUMN     "realDailyLimitUsd" DOUBLE PRECISION,
ADD COLUMN     "realMaxPositionUsd" DOUBLE PRECISION,
ADD COLUMN     "realNotes" TEXT,
ADD COLUMN     "realTradingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "realWalletAddress" TEXT,
ADD COLUMN     "realWalletAsset" TEXT DEFAULT 'USDC',
ADD COLUMN     "realWalletNetwork" TEXT DEFAULT 'base';

-- CreateTable
CREATE TABLE "RealTransaction" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "side" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'base',
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RealTransaction_userId_createdAt_idx" ON "RealTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RealTransaction_agentId_createdAt_idx" ON "RealTransaction"("agentId", "createdAt");

-- AddForeignKey
ALTER TABLE "RealTransaction" ADD CONSTRAINT "RealTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealTransaction" ADD CONSTRAINT "RealTransaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
