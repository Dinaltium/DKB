-- ── BusLink seed data ─────────────────────────────────────────────────────────
-- ⚠️  SUPERSEDED — Use the TypeScript seed script instead:
--
--     pnpm db:seed-ts
--     # or: npx tsx --env-file=.env.local scripts/seed.ts
--
-- This SQL file is kept for reference / emergency manual seeding only.
-- The TypeScript version (scripts/seed.ts) is idempotent, bcrypt-hashes
-- passwords correctly, and is easier to modify.
--
-- TODO: This file can be deleted once scripts/seed.ts is confirmed working.
-- ─────────────────────────────────────────────────────────────────────────────
-- Run after the initial Drizzle migration.
-- Creates the admin user, seed operators, stops, buses and bus routes.
-- Passwords are bcrypt hashes of the demo values shown in the comments.

-- ── Stops ─────────────────────────────────────────────────────────────────────
INSERT INTO stops (id, name, lat, lng) VALUES
  ('mangalore-central', 'Mangalore Central', 12.9141,   74.8560),
  ('hampankatta',       'Hampankatta',       12.8678,   74.8422),
  ('jyothi',            'Jyothi',            12.8725,   74.8483),
  ('surathkal',         'Surathkal',         13.0118,   74.7927),
  ('mulki',             'Mulki',             13.0908,   74.7875),
  ('padubidri',         'Padubidri',         13.139905, 74.771194),
  ('brahmavar',         'Brahmavar',         13.2518,   74.7464),
  ('udupi',             'Udupi',             13.3420,   74.7470),
  ('manipal',           'Manipal',           13.3523,   74.7860),
  ('karkala',           'Karkala',           13.2140,   74.9923)
ON CONFLICT (id) DO NOTHING;

-- ── Admin user ────────────────────────────────────────────────────────────────
-- email: admin@buslink.in  password: admin123 (bcrypt, 12 rounds)
INSERT INTO users (id, name, email, password, role) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'BusLink Admin',
   'admin@buslink.in',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBYhT.bZ9NKQWK',
   'admin')
ON CONFLICT (email) DO NOTHING;

-- ── Operator users ────────────────────────────────────────────────────────────
-- password: demo123 (bcrypt, 12 rounds)
INSERT INTO users (id, name, email, password, role) VALUES
  ('00000000-0000-0000-0000-000000000002',
   'Coastal Rider Pvt Ltd',
   'coastal@express.com',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uuf/yHfWy',
   'operator'),
  ('00000000-0000-0000-0000-000000000003',
   'DK Connect Lines',
   'operator@udupitravel.com',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uuf/yHfWy',
   'operator'),
  ('00000000-0000-0000-0000-000000000004',
   'Malpe Mobility',
   'malpe@mobility.com',
   '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uuf/yHfWy',
   'operator')
ON CONFLICT (email) DO NOTHING;

-- ── Operators ─────────────────────────────────────────────────────────────────
INSERT INTO operators (id, user_id, company_name, approved) VALUES
  ('op-coastal-uuid', '00000000-0000-0000-0000-000000000002', 'Coastal Rider Pvt Ltd', true),
  ('op-dk-uuid',      '00000000-0000-0000-0000-000000000003', 'DK Connect Lines',      true),
  ('op-new-uuid',     '00000000-0000-0000-0000-000000000004', 'Malpe Mobility',         false)
ON CONFLICT (id) DO NOTHING;

-- ── Buses ─────────────────────────────────────────────────────────────────────
INSERT INTO buses (
  id, number, operator_id, license_plate,
  origin, destination, full_fare,
  driver_name, conductor_name,
  status, status_note,
  schedule, total_seats, occupied_seats,
  women_reserved_total, women_reserved_available,
  student_card_accepted, student_discount_percent,
  votes
) VALUES
  ('MNG-101', 'MNG-101', 'op-coastal-uuid', 'KA-19-AB-1101',
   'Mangalore Central', 'Udupi', 35,
   'Raju Shetty', 'Mohan Nayak',
   'Running', 'Timings are approximate. Delays are common on this corridor.',
   '["06:00","08:30","11:00","14:00","17:30","20:00"]', 44, 21,
   8, 5, true, 30,
   '{"onTime":12,"slightlyLate":4,"veryLate":1}'),

  ('MNG-205', 'MNG-205', 'op-dk-uuid', 'KA-19-AC-2205',
   'Mangalore Central', 'Manipal', 45,
   'Suresh Kumar', 'Anand Rao',
   'Running', 'Timings are approximate. Delays are common on this corridor.',
   '["07:00","10:00","13:00","16:30","19:00"]', 40, 14,
   7, 6, true, 25,
   '{"onTime":8,"slightlyLate":6,"veryLate":2}'),

  ('UDU-310', 'UDU-310', 'op-new-uuid', 'KA-20-BD-3310',
   'Udupi', 'Mangalore Central', 40,
   'Prakash Gowda', 'Vivek Nayak',
   'Delayed', 'Express service with limited stops. Timings are approximate.',
   '["08:00","12:00","16:00","20:00"]', 46, 18,
   9, 7, false, 0,
   '{"onTime":3,"slightlyLate":7,"veryLate":5}')
ON CONFLICT (id) DO NOTHING;

-- ── Bus routes (ordered stops) ────────────────────────────────────────────────
INSERT INTO bus_routes (bus_id, stop_id, stop_order) VALUES
  -- MNG-101: Mangalore → Udupi
  ('MNG-101', 'mangalore-central', 0),
  ('MNG-101', 'hampankatta',       1),
  ('MNG-101', 'jyothi',            2),
  ('MNG-101', 'surathkal',         3),
  ('MNG-101', 'mulki',             4),
  ('MNG-101', 'padubidri',         5),
  ('MNG-101', 'brahmavar',         6),
  ('MNG-101', 'udupi',             7),

  -- MNG-205: Mangalore → Manipal
  ('MNG-205', 'mangalore-central', 0),
  ('MNG-205', 'hampankatta',       1),
  ('MNG-205', 'jyothi',            2),
  ('MNG-205', 'surathkal',         3),
  ('MNG-205', 'mulki',             4),
  ('MNG-205', 'padubidri',         5),
  ('MNG-205', 'udupi',             6),
  ('MNG-205', 'manipal',           7),

  -- UDU-310: Udupi → Mangalore (express)
  ('UDU-310', 'udupi',             0),
  ('UDU-310', 'padubidri',         1),
  ('UDU-310', 'hampankatta',       2),
  ('UDU-310', 'mangalore-central', 3)
ON CONFLICT DO NOTHING;

-- ── Loyalty accounts for seed users ──────────────────────────────────────────
INSERT INTO loyalty_accounts (user_id, total_points, total_trips) VALUES
  ('00000000-0000-0000-0000-000000000001', 0, 0),
  ('00000000-0000-0000-0000-000000000002', 0, 0),
  ('00000000-0000-0000-0000-000000000003', 0, 0),
  ('00000000-0000-0000-0000-000000000004', 0, 0)
ON CONFLICT (user_id) DO NOTHING;
