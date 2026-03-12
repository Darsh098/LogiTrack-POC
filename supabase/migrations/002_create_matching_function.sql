-- ============================================
-- LOGITRACK POC - TRUCK MATCHING FUNCTION
-- Core Algorithm: Route matching + Ranking
-- ============================================

CREATE OR REPLACE FUNCTION find_matching_trucks(
  user_pickup_lat DECIMAL,
  user_pickup_lng DECIMAL,
  user_delivery_lat DECIMAL,
  user_delivery_lng DECIMAL,
  package_weight_kg DECIMAL,
  package_volume_m3 DECIMAL,
  distance_threshold_km INT DEFAULT 5
)
RETURNS TABLE (
  trip_id UUID,
  driver_id UUID,
  driver_name VARCHAR,
  truck_type VARCHAR,
  driver_rating DECIMAL,
  remaining_weight_tons DECIMAL,
  remaining_volume_m3 DECIMAL,
  base_price_eur DECIMAL,
  price_per_kg DECIMAL,
  price_per_m3 DECIMAL,
  distance_to_pickup_km DECIMAL,
  distance_to_delivery_km DECIMAL,
  pickup_to_route_distance_km DECIMAL,
  delivery_to_route_distance_km DECIMAL,
  eta_at_pickup_minutes INT,
  estimated_delivery_hours DECIMAL,
  estimated_price_eur DECIMAL,
  match_score DECIMAL
) AS $$
WITH user_coords AS (
  -- Convert user input to geography points
  SELECT 
    ST_Point(user_pickup_lng, user_pickup_lat)::geography AS pickup_point,
    ST_Point(user_delivery_lng, user_delivery_lat)::geography AS delivery_point
),

package_kg_converted AS (
  -- Convert kg to tons for comparison
  SELECT 
    package_weight_kg / 1000.0 AS package_weight_tons
),

capacity_filtered AS (
  -- STEP 1: Filter by capacity (weight and volume)
  SELECT 
    t.id as trip_id,
    t.truck_id,
    t.driver_id,
    t.route_polyline,
    t.start_location,
    t.remaining_weight_tons,
    t.remaining_volume_m3,
    t.base_price_eur,
    t.price_per_kg,
    t.price_per_m3,
    t.start_time,
    t.estimated_end_time,
    d.name as driver_name,
    d.rating as driver_rating,
    tr.truck_type,
    tr.max_weight_tons,
    tr.max_volume_m3
  FROM trips t
  JOIN drivers d ON t.driver_id = d.id
  JOIN trucks tr ON t.truck_id = tr.id
  WHERE t.trip_status = 'ACTIVE'
    AND d.verified = TRUE
    AND t.remaining_weight_tons >= (SELECT package_weight_tons FROM package_kg_converted)
    AND t.remaining_volume_m3 >= package_volume_m3
),

route_distance_calculated AS (
  -- STEP 2: Calculate distances from pickup/delivery to truck route
  SELECT 
    *,
    -- Distance from user's pickup to truck's route line (in km)
    ST_Distance(
      (SELECT pickup_point FROM user_coords),
      route_polyline::geography
    ) / 1000 AS pickup_to_route_distance_km,
    
    -- Distance from user's delivery to truck's route line (in km)
    ST_Distance(
      (SELECT delivery_point FROM user_coords),
      route_polyline::geography
    ) / 1000 AS delivery_to_route_distance_km,
    
    -- Distance from truck's current location to user's pickup
    ST_Distance(
      start_location::geography,
      (SELECT pickup_point FROM user_coords)
    ) / 1000 AS distance_to_pickup_km,
    
    -- Distance from user's pickup to user's delivery
    ST_Distance(
      (SELECT pickup_point FROM user_coords),
      (SELECT delivery_point FROM user_coords)
    ) / 1000 AS distance_to_delivery_km
  FROM capacity_filtered
),

route_filtered AS (
  -- STEP 3: Filter by route match
  -- Both pickup and delivery must be close to truck's route
  SELECT *
  FROM route_distance_calculated
  WHERE (
    pickup_to_route_distance_km <= distance_threshold_km
    AND delivery_to_route_distance_km <= distance_threshold_km
  )
  -- Additional check: delivery should be further along than pickup
  AND distance_to_delivery_km > 0
),

with_timing AS (
  -- STEP 4: Calculate timing
  SELECT 
    *,
    -- Average truck speed in Balkans: 70 km/h
    -- ETA at pickup in minutes
    ROUND(
      (distance_to_pickup_km / 70.0) * 60
    )::INT AS eta_at_pickup_minutes,
    
    -- Estimated delivery time in hours
    ROUND(
      (distance_to_delivery_km / 70.0)::NUMERIC,
      1
    ) AS estimated_delivery_hours
  FROM route_filtered
),

with_pricing AS (
  -- STEP 5: Calculate pricing
  SELECT 
    *,
    COALESCE(
      -- Price by weight if available
      CASE 
        WHEN price_per_kg IS NOT NULL 
        THEN price_per_kg * (package_weight_kg / 1000.0)
        ELSE NULL
      END,
      -- Price by volume if weight pricing not available
      CASE 
        WHEN price_per_m3 IS NOT NULL 
        THEN price_per_m3 * package_volume_m3
        ELSE NULL
      END,
      -- Default to base price
      base_price_eur
    ) AS estimated_price_eur
  FROM with_timing
),

with_scoring AS (
  -- STEP 6: Calculate match score (0-100) for each truck
  SELECT 
    *,
    
    -- Factor 1: Distance to pickup (closer = higher score)
    -- 0 km = 100, 50 km = 0
    GREATEST(0::DECIMAL, 100 - (distance_to_pickup_km * 2)) AS distance_score,
    
    -- Factor 2: ETA at pickup (sooner = higher score)
    -- 0 min = 100, 1440 min (24h) = 0
    GREATEST(0::DECIMAL, 100 - (eta_at_pickup_minutes::DECIMAL / 14.4)) AS eta_score,
    
    -- Factor 3: Driver rating (higher = higher score)
    -- 5.0 = 100, 0 = 0
    (driver_rating / 5.0) * 100 AS rating_score,
    
    -- Factor 4: Price (lower = higher score)
    -- €0 = 100, €100 = 0
    GREATEST(0::DECIMAL, 100 - estimated_price_eur) AS price_score,
    
    -- Factor 5: Delivery time (faster = higher score)
    -- 12 hours = 100, 72 hours = 0
    GREATEST(0::DECIMAL, 100 - (estimated_delivery_hours::DECIMAL * 1.39)) AS delivery_score
  FROM with_pricing
)

-- FINAL RESULT: Select and rank by match score
SELECT 
  trip_id,
  driver_id,
  driver_name,
  truck_type,
  driver_rating,
  ROUND(remaining_weight_tons::NUMERIC, 2) AS remaining_weight_tons,
  ROUND(remaining_volume_m3::NUMERIC, 2) AS remaining_volume_m3,
  base_price_eur,
  price_per_kg,
  price_per_m3,
  ROUND(distance_to_pickup_km::NUMERIC, 2) AS distance_to_pickup_km,
  ROUND(distance_to_delivery_km::NUMERIC, 2) AS distance_to_delivery_km,
  ROUND(pickup_to_route_distance_km::NUMERIC, 2) AS pickup_to_route_distance_km,
  ROUND(delivery_to_route_distance_km::NUMERIC, 2) AS delivery_to_route_distance_km,
  eta_at_pickup_minutes,
  estimated_delivery_hours,
  ROUND(estimated_price_eur::NUMERIC, 2) AS estimated_price_eur,
  -- Final composite score (sum of weights = 1.0)
  ROUND(
    (
      distance_score * 0.20 +      -- 20% - Proximity
      eta_score * 0.20 +           -- 20% - Quick pickup
      rating_score * 0.25 +        -- 25% - Trust/Quality
      delivery_score * 0.20 +      -- 20% - Delivery speed
      price_score * 0.15           -- 15% - Price
    )::NUMERIC,
    2
  ) AS match_score
FROM with_scoring
ORDER BY match_score DESC, distance_to_pickup_km ASC;

$$ LANGUAGE SQL STABLE;

-- ============================================
-- GRANT PERMISSIONS (if using roles)
-- ============================================
GRANT EXECUTE ON FUNCTION find_matching_trucks(
  DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, INT
) TO authenticated, anon;

-- ============================================
-- TEST QUERY (uncomment to test)
-- ============================================
-- SELECT * FROM find_matching_trucks(
--   42.6526,        -- user_pickup_lat (Pristina)
--   21.1789,        -- user_pickup_lng
--   44.8176,        -- user_delivery_lat (Belgrade)
--   20.4581,        -- user_delivery_lng
--   500,            -- package_weight_kg
--   2.5,            -- package_volume_m3
--   5               -- distance_threshold_km
-- );