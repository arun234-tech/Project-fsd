CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(14,2) NOT NULL CHECK (price > 0),
  listing_type VARCHAR(10) NOT NULL CHECK (listing_type IN ('sale','rent')),
  property_type VARCHAR(30) NOT NULL CHECK (property_type IN ('apartment','house','villa','plot','commercial')),
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms INTEGER NOT NULL DEFAULT 0 CHECK (bathrooms >= 0),
  area_sqft INTEGER NOT NULL CHECK (area_sqft > 0),
  image_url TEXT,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS properties_city_idx ON properties(city);
CREATE INDEX IF NOT EXISTS properties_price_idx ON properties(price);
CREATE INDEX IF NOT EXISTS properties_listing_type_idx ON properties(listing_type);
