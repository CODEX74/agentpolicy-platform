-- Rename Agent.mode to agent_mode to avoid conflict with PostgreSQL mode() aggregate function
-- (fixes: WITHIN GROUP is required for ordered-set aggregate mode)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Agent' AND column_name = 'mode')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Agent' AND column_name = 'agent_mode') THEN
    ALTER TABLE "Agent" RENAME COLUMN "mode" TO "agent_mode";
  END IF;
END $$;
