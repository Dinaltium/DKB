-- Adds tickets.payment_verified — trusted-payment flag.
-- Idempotent & additive.
--   psql "$DATABASE_URL" -f drizzle/manual/0002_payment_verified.sql

ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "payment_verified" boolean NOT NULL DEFAULT false;
