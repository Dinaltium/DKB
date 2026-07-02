-- Ticket active-panel lifecycle: archive-to-History columns.
-- Idempotent and additive — safe to run on an existing DB.
--
-- Apply with:
--   psql "$DATABASE_URL" -f drizzle/manual/0001_ticket_archive_lifecycle.sql
-- (or regenerate the tracked drizzle migration in an interactive terminal:
--   pnpm db:generate  →  pnpm db:migrate)

DO $$ BEGIN
  CREATE TYPE "ticket_archive_reason" AS ENUM ('gps_arrival', 'time_estimate', 'stop_passed', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "archived_at"    timestamp;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "archive_reason" "ticket_archive_reason";
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "last_known_lat"  real;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "last_known_lng"  real;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "last_seen_at"    timestamp;

-- Speeds up the resolver's "my active tickets" scan.
CREATE INDEX IF NOT EXISTS "idx_tickets_user_active"
  ON "tickets" ("user_id")
  WHERE "archived_at" IS NULL;
