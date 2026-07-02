-- Enable Row-Level Security on every public table and revoke the Supabase
-- PostgREST roles (anon, authenticated) so tables are NOT reachable through
-- the public data API. This closes the Supabase advisor findings
-- (rls_disabled_in_public / sensitive_columns_exposed).
--
-- The application connects with its own role via DATABASE_URL. As the table
-- OWNER that role bypasses RLS (no FORCE), so app queries keep working. This
-- migration adds NO permissive policies — with RLS on and no policy, any role
-- that does NOT bypass RLS (anon/authenticated) is denied by default.
--
-- Apply:  psql "$DATABASE_URL" -f drizzle/manual/0003_enable_rls.sql
-- NOTE: run this as the role that owns the tables.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users','accounts','sessions','user_active_sessions','verification_tokens',
    'operators','stops','buses','bus_routes','bus_requests','routes',
    'route_stops','fares','conductor_access','trips','trip_stops','tickets',
    'transactions','subscriptions','passes','notifications','complaints',
    'payments','travel_history','trip_reports'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      -- Belt-and-suspenders: strip API-role grants so even a policy mistake
      -- can't expose data through PostgREST.
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated;', t);
    END IF;
  END LOOP;
END $$;
