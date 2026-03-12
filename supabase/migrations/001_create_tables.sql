-- ============================================
-- LOGITRACK POC - DATABASE SCHEMA
-- Using Supabase PostgreSQL with PostGIS
-- ============================================

-- ============================================
-- TABLE 1: DRIVERS
-- ============================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_trips INT DEFAULT 0,
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_drivers_verified ON drivers(verified);
CREATE INDEX idx_drivers_rating ON drivers(rating DESC);

-- ============================================
-- TABLE 2: TRUCKS
-- ============================================
CREATE TABLE IF NOT EXISTS trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  truck_type VARCHAR(50) NOT NULL, -- 'van', '3.5t', '7t', '10t', '24t'
  max_weight_tons DECIMAL(10,2) NOT NULL,
  max_volume_m3 DECIMAL(10,2) NOT NULL,
  license_plate VARCHAR(50) UNIQUE,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_weight CHECK (max_weight_tons > 0),
  CONSTRAINT valid_volume CHECK (max_volume_m3 > 0)
);

CREATE INDEX idx_trucks_driver_id ON trucks(driver_id);
CREATE INDEX idx_trucks_type ON trucks(truck_type);

-- ============================================
-- TABLE 3: TRIPS (THE CORE TABLE)
-- ============================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id UUID NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  
  -- Trip route points (Geography type for distance calculations)
  start_location GEOGRAPHY(POINT, 4326) NOT NULL,
  end_location GEOGRAPHY(POINT, 4326) NOT NULL,
  
  -- Route as a line string (multiple waypoints)
  -- Format: LINESTRING(lng1 lat1, lng2 lat2, lng3 lat3, ...)
  route_polyline GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  
  -- Route as text (for easier viewing/debugging)
  route_waypoints TEXT[], -- Array of 'lat,lng' strings
  
  -- Capacity tracking
  total_weight_tons DECIMAL(10,2) NOT NULL,
  total_volume_m3 DECIMAL(10,2) NOT NULL,
  remaining_weight_tons DECIMAL(10,2) NOT NULL,
  remaining_volume_m3 DECIMAL(10,2) NOT NULL,
  
  -- Pricing
  base_price_eur DECIMAL(10,2) DEFAULT 50,
  price_per_kg DECIMAL(10,4),
  price_per_m3 DECIMAL(10,2),
  
  -- Status and timing
  trip_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, IN_PROGRESS, COMPLETED, CANCELLED
  start_time TIMESTAMP NOT NULL,
  estimated_end_time TIMESTAMP NOT NULL,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_total_weight CHECK (total_weight_tons > 0),
  CONSTRAINT valid_total_volume CHECK (total_volume_m3 > 0),
  CONSTRAINT valid_remaining_weight CHECK (remaining_weight_tons >= 0 AND remaining_weight_tons <= total_weight_tons),
  CONSTRAINT valid_remaining_volume CHECK (remaining_volume_m3 >= 0 AND remaining_volume_m3 <= total_volume_m3)
);

-- SPATIAL INDEX for fast route matching (CRITICAL for performance)
CREATE INDEX idx_trips_route_polyline ON trips USING GIST(route_polyline);
CREATE INDEX idx_trips_start_location ON trips USING GIST(start_location);
CREATE INDEX idx_trips_end_location ON trips USING GIST(end_location);

-- Regular indexes for filtering
CREATE INDEX idx_trips_status ON trips(trip_status);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_truck_id ON trips(truck_id);
CREATE INDEX idx_trips_start_time ON trips(start_time);

-- ============================================
-- TABLE 4: COMPANIES
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  company_type VARCHAR(50) DEFAULT 'SIMPLE', -- SIMPLE, TEAMS, ENTERPRISE
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_companies_company_type ON companies(company_type);

-- ============================================
-- TABLE 5: CUSTOMERS/SENDERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'INDIVIDUAL', -- INDIVIDUAL or COMPANY
  company_id UUID REFERENCES companies(id),
  rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_shipments INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_account_type ON customers(account_type);
CREATE INDEX idx_customers_company_id ON customers(company_id);

-- ============================================
-- TABLE 6: BOOKINGS
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Package details
  pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
  delivery_location GEOGRAPHY(POINT, 4326) NOT NULL,
  package_weight_kg DECIMAL(10,2) NOT NULL,
  package_volume_m3 DECIMAL(10,4) NOT NULL,
  
  -- Pricing
  final_price_eur DECIMAL(10,2) NOT NULL,
  
  -- Status
  booking_status VARCHAR(50) DEFAULT 'REQUESTED', -- REQUESTED, ACCEPTED, PICKED_UP, DELIVERED, CANCELLED
  
  -- Timing
  requested_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_weight CHECK (package_weight_kg > 0),
  CONSTRAINT valid_volume CHECK (package_volume_m3 > 0)
);

CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_requested_at ON bookings(requested_at);

-- ============================================
-- FOREIGN KEY CONSTRAINT (Customers → Companies)
-- ============================================
ALTER TABLE customers 
ADD CONSTRAINT fk_customers_company 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- ============================================
-- RLS (Row Level Security) - Optional for POC
-- ============================================
-- For POC, we'll skip RLS to keep it simple
-- In production, enable RLS for security

-- ============================================
-- CREATE HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trucks_updated_at BEFORE UPDATE ON trucks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- All tables created successfully!
-- Ready for truck matching algorithm function