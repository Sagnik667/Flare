CREATE TYPE safety_resource_category AS ENUM (
  'police_station',
  'hospital',
  'safe_zone',
  'womens_shelter',
  'clinic',
  'other'
);

CREATE TABLE safety_resources (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category safety_resource_category NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_resources_category ON safety_resources(category);
CREATE INDEX idx_safety_resources_coords ON safety_resources(latitude, longitude);
