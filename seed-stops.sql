-- ══════════════════════════════════════════════════════════════════════════════
-- BusLink — Mangalore Bus Stop Seed
-- Source: locations_with_coords.json (geocoded via Nominatim/OpenStreetMap)
-- 
-- HOW TO RUN:
--   Option A (Neon Console): paste into the SQL Editor at console.neon.tech
--   Option B (psql):         psql $DATABASE_URL -f scripts/seed-stops.sql
--   Option C (tsx script):   npx tsx scripts/seed-stops.ts  (see .ts version)
--
-- IMPORTANT: The `id` column in the stops table is a TEXT slug (not UUID).
-- We use url_slug from the source JSON as the primary key.
-- The uuid from the source is stored in geo_address comments only — the DB
-- uses url_slug as the stable identifier.
--
-- All rows use ON CONFLICT (id) DO UPDATE so this script is idempotent —
-- safe to re-run; existing rows will be updated with fresh coordinates.
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO stops (id, name, lat, lng) VALUES
  ('adyar',                'Adyar',                    12.8683434,  74.9310047),
  ('bajpe',                'Bajpe',                    12.9808517,  74.8841277),
  ('hampankatta',          'Hampankatta',               12.8691203,  74.8434320),
  ('jokatte',              'Jokatte',                  12.9605751,  74.8442917),
  ('kaikamba',             'Kaikamba',                 12.9939439,  74.8348033),
  ('kana',                 'Kana',                     12.9806013,  74.8172073),
  ('kodikal',              'Kodikal',                  12.9074593,  74.8297538),
  ('kunjathbail',          'Kunjathbail',              12.9420168,  74.8540408),
  ('mrpl',                 'MRPL',                     12.9892788,  74.8309479),
  ('marnamikatta',         'Marnamikatta',             12.8527191,  74.8516075),
  ('mukka',                'Mukka',                    13.0215750,  74.7902222),
  ('state-bank',           'State Bank',               12.8626976,  74.8365413),
  ('sulthan-battery',      'Sulthan Battery',          12.8897236,  74.8215995),
  ('surathkal',            'Surathkal',                12.9890235,  74.8017211),
  ('urwa-market',          'Urwa Market',              12.8890788,  74.8302454),
  ('alake',                'Alake',                    12.8736233,  74.8338660),
  ('attavar',              'Attavar',                  12.8605480,  74.8480626),
  ('baikampady',           'Baikampady',               12.9492098,  74.8201304),
  ('bajpe-aerodrome',      'Bajpe Aerodrome',          12.9546178,  74.8847182),
  ('balmatta',             'Balmatta',                 12.8791877,  74.8584005),
  ('bejai',                'Bejai',                    12.8857729,  74.8412105),
  ('bejai-church',         'Bejai Church',             12.8840049,  74.8465830),
  ('bengare',              'Bengare',                  12.8618908,  74.8364540),
  ('bhatrakere',           'Bhatrakere',               12.9961008,  74.8865088),
  ('bokkapatna',           'Bokkapatna',               12.8790089,  74.8277760),
  ('bolar',                'Bolar',                    12.8468042,  74.8430182),
  ('boloor',               'Boloor',                   12.8866121,  74.8247716),
  ('bondel',               'Bondel',                   12.9262123,  74.8584061),
  ('bunts-hostel',         'Bunts Hostel',             12.8764943,  74.8479289),
  ('canara-college',       'Canara College',           12.8788605,  74.8417948),
  ('car-street',           'Car Street',               12.8702004,  74.8366794),
  ('chilimbi',             'Chilimbi',                 12.8935984,  74.8375150),
  ('chokkabettu',          'Chokkabettu',              12.9967761,  74.8059738),
  ('dombel',               'Dombel',                   12.9030110,  74.8232353),
  ('empire-mall',          'Empire Mall',              12.8795680,  74.8406548),
  ('falnir',               'Falnir',                   12.8688855,  74.8479308),
  ('gurupura',             'Gurupura',                 12.9382816,  74.9279894),
  ('hosabettu',            'Hosabettu',                12.9628520,  74.7985323),
  ('jm-road',              'J.M. Road',                12.8791191,  74.8409182),
  ('jeppu',                'Jeppu',                    12.8545047,  74.8564146),
  ('jyothi',               'Jyothi',                   12.8688855,  74.8479308),
  ('ks-rao-road',          'K.S. Rao Road',            12.8707850,  74.8419848),
  ('kpt',                  'KPT',                      12.8918834,  74.8539870),
  ('ksrtc-bus-stand',      'KSRTC Bus Stand',          12.8846856,  74.8417756),
  ('kadri',                'Kadri',                    12.8897288,  74.8501424),
  ('kadri-temple',         'Kadri Temple',             12.8805253,  74.8543594),
  ('kankanady',            'Kankanady',                12.8646481,  74.8600033),
  ('katipalla',            'Katipalla',                13.0004744,  74.8310401),
  ('kavoor',               'Kavoor',                   12.8857729,  74.8412105),
  ('kotekar',              'Kotekar',                  12.9137869,  74.8561886),
  ('kottara',              'Kottara',                  12.9020330,  74.8368503),
  ('kottara-chowki',       'Kottara Chowki',           12.9102126,  74.8363056),
  ('kudroli',              'Kudroli',                  12.8765518,  74.8302397),
  ('kudupu',               'Kudupu',                   12.8849079,  74.8794308),
  ('kuloor',               'Kuloor',                   12.8997746,  74.8261261),
  ('ladyhill',             'Ladyhill',                 12.8883693,  74.8373673),
  ('mallikatte',           'Mallikatte',               12.8783034,  74.8553269),
  ('mangaladevi',          'Mangaladevi',              12.8492308,  74.8452609),
  ('mangalapete',          'Mangalapete',              12.9937922,  74.8389932),
  ('mangalore-junction',   'Mangalore Junction',       12.8666280,  74.8792308),
  ('mangalore-university', 'Mangalore University',     12.8650148,  74.8410816),
  ('mannagudda',           'Mannagudda',               12.8819149,  74.8353565),
  ('maroli',               'Maroli',                   12.8753585,  74.8798521),
  ('maryhill',             'Maryhill',                 12.9075486,  74.8631699),
  ('mulihitlu',            'Mulihitlu',                12.8453185,  74.8471599),
  ('nagori',               'Nagori',                   12.8699595,  74.8745171),
  ('nanthoor',             'Nanthoor',                 12.8847697,  74.8607701),
  ('natekal',              'Natekal',                  12.8020234,  74.9037226),
  ('neermarga',            'Neermarga',                12.8932996,  74.9096665),
  ('pvs',                  'PVS',                      12.8738292,  74.8408795),
  ('padil',                'Padil',                    12.8721590,  74.8867594),
  ('padil-railway-station','Padil Railway Station',    12.8752966,  74.8943610),
  ('panambur',             'Panambur',                 12.9469448,  74.8123039),
  ('pandeshwar',           'Pandeshwar',               12.8568400,  74.8379984),
  ('pumpwell',             'Pumpwell',                 12.8696153,  74.8660600),
  ('saibeen-complex',      'Saibeen Complex',          12.8852147,  74.8394237),
  ('saripalla',            'Saripalla',                12.8849079,  74.8794308),
  ('sasihitlu',            'Sasihitlu',                13.0260878,  74.7879522),
  ('soorinje',             'Soorinje',                 13.0243211,  74.8392103),
  ('talapady',             'Talapady',                 12.7673913,  74.8697907),
  ('tannirbhavi-beach',    'Tannirbhavi Beach',        12.9003749,  74.8130662),
  ('thokkottu',            'Thokkottu',                12.8174705,  74.8452304),
  ('ullal',                'Ullal',                    12.7923655,  74.8548862),
  ('urwa-store',           'Urwa Store',               12.8896482,  74.8334844),
  ('valencia',             'Valencia',                 12.8644153,  74.8583112),
  ('vamanjoor',            'Vamanjoor',                12.8849079,  74.8794308),
  ('yemmekere',            'Yemmekere',                12.8499951,  74.8411897),
  ('yeyyadi',              'Yeyyadi',                  12.8979468,  74.8615640)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  lat  = EXCLUDED.lat,
  lng  = EXCLUDED.lng;

-- ── Summary ───────────────────────────────────────────────────────────────────
-- 83 stops inserted / updated from locations_with_coords.json
-- Source coordinates: Nominatim / OpenStreetMap
-- All stops are in the Mangaluru taluk, Dakshina Kannada, Karnataka area
-- Bus route assignments will be added separately via the admin UI
-- ──────────────────────────────────────────────────────────────────────────────