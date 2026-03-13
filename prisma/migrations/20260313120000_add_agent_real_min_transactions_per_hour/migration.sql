-- Add realMinTransactionsPerHour: max real transactions per hour for agents with real balance (UI label: "Минимальное кол-во транзакций в час")
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "realMinTransactionsPerHour" INTEGER;
