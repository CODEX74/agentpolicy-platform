-- CreateTable
CREATE TABLE "PendingRealTransaction" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "valueWei" TEXT NOT NULL,
    "data" TEXT,
    "networkId" TEXT NOT NULL DEFAULT 'base-sepolia',
    "asset" TEXT NOT NULL DEFAULT 'USDC',
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingRealTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingRealTransaction_agentId_status_idx" ON "PendingRealTransaction"("agentId", "status");

-- CreateIndex
CREATE INDEX "PendingRealTransaction_userId_status_idx" ON "PendingRealTransaction"("userId", "status");

-- AddForeignKey
ALTER TABLE "PendingRealTransaction" ADD CONSTRAINT "PendingRealTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingRealTransaction" ADD CONSTRAINT "PendingRealTransaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
