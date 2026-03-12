-- ============================================
-- LOGITRACK POC - DUMMY DATA INSERTION
-- Realistic Balkan routes and truck data
-- ============================================

-- Clear existing data (for fresh POC setup)
-- DELETE FROM bookings;
-- DELETE FROM trips;
-- DELETE FROM companies;
-- DELETE FROM customers;
-- DELETE FROM trucks;
-- DELETE FROM drivers;

-- ============================================
-- INSERT DRIVERS
-- ============================================
INSERT INTO drivers (phone, email, name, rating, verified) VALUES
  ('381601234567', 'ahmed@example.com', 'Ahmed Halim', 4.8, TRUE),
  ('381612345678', 'marko@example.com', 'Marko Jovanović', 4.6, TRUE),
  ('381623456789', 'fatmir@example.com', 'Fatmir Ademi', 4.5, TRUE),
  ('381634567890', 'petar@example.com', 'Petar Nikolić', 4.7, TRUE),
  ('381645678901', 'ardit@example.com', 'Ardit Rama', 4.4, TRUE),
  ('381656789012', 'dragan@example.com', 'Dragan Marković', 4.9, TRUE),
  ('381667890123', 'flamur@example.com', 'Flamur Krasniqi', 4.3, TRUE),
  ('381678901234', 'milos@example.com', 'Miloš Đorđević', 4.8, TRUE),
  ('381689012345', 'besim@example.com', 'Besim Kelmendi', 4.6, TRUE),
  ('381690123456', 'zoran@example.com', 'Zoran Petrov', 4.7, TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- INSERT TRUCKS
-- ============================================
INSERT INTO trucks (driver_id, truck_type, max_weight_tons, max_volume_m3, license_plate)
SELECT 
  d.id,
  CASE WHEN random() < 0.2 THEN 'van'
       WHEN random() < 0.4 THEN '3.5t'
       WHEN random() < 0.6 THEN '7t'
       WHEN random() < 0.8 THEN '10t'
       ELSE '24t' END AS truck_type,
  CASE WHEN random() < 0.2 THEN 2
       WHEN random() < 0.4 THEN 3.5
       WHEN random() < 0.6 THEN 7
       WHEN random() < 0.8 THEN 10
       ELSE 24 END AS max_weight_tons,
  CASE WHEN random() < 0.2 THEN 12
       WHEN random() < 0.4 THEN 18
       WHEN random() < 0.6 THEN 36
       WHEN random() < 0.8 THEN 56
       ELSE 62 END AS max_volume_m3,
  'PRI-' || LPAD((ROW_NUMBER() OVER (ORDER BY d.id))::TEXT, 4, '0') AS license_plate
FROM drivers d
ON CONFLICT (license_plate) DO NOTHING;

-- ============================================
-- INSERT CUSTOMERS
-- ============================================
INSERT INTO customers (name, email, phone, account_type, rating, total_shipments) VALUES
  ('Sofia Popovic', 'sofia@example.com', '381701234567', 'INDIVIDUAL', 4.8, 5),
  ('Ana Marković', 'ana@example.com', '381702345678', 'INDIVIDUAL', 4.5, 3),
  ('Ema Krasniqi', 'ema@example.com', '381703456789', 'INDIVIDUAL', 4.9, 8),
  ('Luka Jovanović', 'luka@example.com', '381704567890', 'INDIVIDUAL', 4.3, 2),
  ('Agron Daka', 'agron@example.com', '381705678901', 'INDIVIDUAL', 4.6, 4)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- INSERT TRIPS
-- Realistic Balkan routes with multiple waypoints
-- Format: LINESTRING(lng lat, lng lat, ...)
-- ============================================

-- Trip 1: Pristina → Niš → Belgrade (Direct Route)
INSERT INTO trips (
  truck_id, driver_id, 
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(21.1789 42.6526)'::geography,  -- Pristina
  'POINT(20.4581 44.8176)'::geography,  -- Belgrade
  'LINESTRING(21.1789 42.6526, 21.2280 42.7469, 20.9904 42.4304, 21.0059 44.0150, 20.5578 43.8564, 20.4581 44.8176)'::geography,
  ARRAY['42.6526,21.1789', '42.7469,21.2280', '42.4304,20.9904', '44.0150,21.0059', '43.8564,20.5578', '44.8176,20.4581'],
  10, 8,      -- Total: 10t, Remaining: 8t
  56, 45,     -- Total: 56m³, Remaining: 45m³
  50, 0.05, 8,
  'ACTIVE', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '25 hours',
  'Direct route Pristina-Niš-Belgrade'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Ahmed Halim'
LIMIT 1;

-- Trip 2: Niš → Sofia, Bulgaria (Cross-border)
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(21.0059 44.0150)'::geography,  -- Niš
  'POINT(23.3219 42.6977)'::geography,  -- Sofia
  'LINESTRING(21.0059 44.0150, 21.5000 43.8000, 22.5000 43.2000, 23.3219 42.6977)'::geography,
  ARRAY['44.0150,21.0059', '43.8000,21.5000', '43.2000,22.5000', '42.6977,23.3219'],
  7, 6,       -- Total: 7t, Remaining: 6t
  36, 30,     -- Total: 36m³, Remaining: 30m³
  45, 0.06, 10,
  'ACTIVE', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '20 hours',
  'Niš to Sofia, Bulgaria border crossing'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Marko Jovanović'
LIMIT 1;

-- Trip 3: Skopje → Pristina → Mitrovica
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(21.4280 41.9973)'::geography,  -- Skopje
  'POINT(20.8667 42.8945)'::geography,  -- Mitrovica
  'LINESTRING(21.4280 41.9973, 21.3000 42.2000, 21.1789 42.6526, 21.0500 42.7500, 20.8667 42.8945)'::geography,
  ARRAY['41.9973,21.4280', '42.2000,21.3000', '42.6526,21.1789', '42.7500,21.0500', '42.8945,20.8667'],
  3.5, 3,     -- Total: 3.5t, Remaining: 3t (van)
  18, 12,     -- Total: 18m³, Remaining: 12m³
  35, 0.04, 12,
  'ACTIVE', NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '8 hours',
  'Regional route: Skopje-Pristina-Mitrovica'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Fatmir Ademi'
LIMIT 1;

-- Trip 4: Tirana → Durrës (Albania - Short route)
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(19.8187 41.3275)'::geography,  -- Tirana
  'POINT(19.4542 41.3150)'::geography,  -- Durrës
  'LINESTRING(19.8187 41.3275, 19.6364 41.3213, 19.4542 41.3150)'::geography,
  ARRAY['41.3275,19.8187', '41.3213,19.6364', '41.3150,19.4542'],
  24, 20,     -- Total: 24t, Remaining: 20t
  62, 50,     -- Total: 62m³, Remaining: 50m³
  40, 0.04, 7,
  'ACTIVE', NOW() + INTERVAL '45 minutes', NOW() + INTERVAL '3 hours',
  'Short route: Tirana to Durrës'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Petar Nikolić'
LIMIT 1;

-- Trip 5: Podgorica → Bar (Montenegro)
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(19.2644 42.4304)'::geography,  -- Podgorica
  'POINT(19.0944 42.1081)'::geography,  -- Bar
  'LINESTRING(19.2644 42.4304, 19.2400 42.3500, 19.1500 42.2000, 19.0944 42.1081)'::geography,
  ARRAY['42.4304,19.2644', '42.3500,19.2400', '42.2000,19.1500', '42.1081,19.0944'],
  10, 8,      -- Total: 10t, Remaining: 8t
  56, 44,     -- Total: 56m³, Remaining: 44m³
  38, 0.05, 9,
  'ACTIVE', NOW() + INTERVAL '1.5 hours', NOW() + INTERVAL '5 hours',
  'Coastal route: Podgorica to Bar'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Ardit Rama'
LIMIT 1;

-- Trip 6: Belgrade → Zagreb (Serbia to Croatia)
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(20.4581 44.8176)'::geography,  -- Belgrade
  'POINT(16.0122 45.8150)'::geography,  -- Zagreb
  'LINESTRING(20.4581 44.8176, 19.8000 45.0000, 18.5000 45.5000, 16.0122 45.8150)'::geography,
  ARRAY['44.8176,20.4581', '45.0000,19.8000', '45.5000,18.5000', '45.8150,16.0122'],
  7, 5,       -- Total: 7t, Remaining: 5t
  36, 25,     -- Total: 36m³, Remaining: 25m³
  55, 0.05, 11,
  'ACTIVE', NOW() + INTERVAL '2.5 hours', NOW() + INTERVAL '30 hours',
  'International: Belgrade to Zagreb'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Dragan Marković'
LIMIT 1;

-- Trip 7: Prishtina → Tetovë (North Macedonia)
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(21.1789 42.6526)'::geography,  -- Pristina
  'POINT(21.1525 41.9987)'::geography,  -- Tetovë
  'LINESTRING(21.1789 42.6526, 21.1700 42.4000, 21.1600 42.2000, 21.1525 41.9987)'::geography,
  ARRAY['42.6526,21.1789', '42.4000,21.1700', '42.2000,21.1600', '41.9987,21.1525'],
  10, 9,      -- Total: 10t, Remaining: 9t
  56, 48,     -- Total: 56m³, Remaining: 48m³
  42, 0.05, 8,
  'ACTIVE', NOW() + INTERVAL '45 minutes', NOW() + INTERVAL '6 hours',
  'Regional: Pristina to Tetovë'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Flamur Krasniqi'
LIMIT 1;

-- Trip 8: Novo Brdo → Leskovac (Serbia)
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(21.2964 42.3833)'::geography,  -- Novo Brdo
  'POINT(22.2544 42.9833)'::geography,  -- Leskovac
  'LINESTRING(21.2964 42.3833, 21.6000 42.6000, 22.0000 42.8000, 22.2544 42.9833)'::geography,
  ARRAY['42.3833,21.2964', '42.6000,21.6000', '42.8000,22.0000', '42.9833,22.2544'],
  3.5, 2.5,   -- Total: 3.5t, Remaining: 2.5t
  18, 10,     -- Total: 18m³, Remaining: 10m³
  30, 0.06, 13,
  'ACTIVE', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '7 hours',
  'Local: Novo Brdo to Leskovac'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Miloš Đorđević'
LIMIT 1;

-- Trip 9: Prizren → Vlorë (Kosovo to Albania)
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(20.7639 42.2116)'::geography,  -- Prizren
  'POINT(19.4703 40.4619)'::geography,  -- Vlorë
  'LINESTRING(20.7639 42.2116, 20.5000 41.8000, 20.0000 41.2000, 19.4703 40.4619)'::geography,
  ARRAY['42.2116,20.7639', '41.8000,20.5000', '41.2000,20.0000', '40.4619,19.4703'],
  24, 22,     -- Total: 24t, Remaining: 22t
  62, 58,     -- Total: 62m³, Remaining: 58m³
  50, 0.04, 6,
  'ACTIVE', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '28 hours',
  'Cross-border: Prizren to Vlorë'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Besim Kelmendi'
LIMIT 1;

-- Trip 10: Split → Sarajevo (Bosnia, via Serbia)
INSERT INTO trips (
  truck_id, driver_id,
  start_location, end_location, route_polyline, route_waypoints,
  total_weight_tons, remaining_weight_tons,
  total_volume_m3, remaining_volume_m3,
  base_price_eur, price_per_kg, price_per_m3,
  trip_status, start_time, estimated_end_time, notes
)
SELECT 
  t.id, d.id,
  'POINT(16.4401 43.5081)'::geography,  -- Split
  'POINT(18.4131 43.9159)'::geography,  -- Sarajevo
  'LINESTRING(16.4401 43.5081, 17.0000 43.7000, 17.5000 43.8000, 18.4131 43.9159)'::geography,
  ARRAY['43.5081,16.4401', '43.7000,17.0000', '43.8000,17.5000', '43.9159,18.4131'],
  10, 7,      -- Total: 10t, Remaining: 7t
  56, 42,     -- Total: 56m³, Remaining: 42m³
  48, 0.05, 9,
  'ACTIVE', NOW() + INTERVAL '3 hours', NOW() + INTERVAL '24 hours',
  'Regional: Split to Sarajevo'
FROM trucks t
JOIN drivers d ON t.driver_id = d.id
WHERE d.name = 'Zoran Petrov'
LIMIT 1;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Dummy data inserted successfully!' AS status;
SELECT COUNT(*) AS total_drivers FROM drivers;
SELECT COUNT(*) AS total_trucks FROM trucks;
SELECT COUNT(*) AS total_trips FROM trips;
SELECT COUNT(*) AS total_customers FROM customers;