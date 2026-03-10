-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('INVESTOR', 'TRADER');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "agentType" "AgentType" NOT NULL DEFAULT 'INVESTOR';
