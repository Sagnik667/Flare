CREATE TYPE volunteer_verification_status AS ENUM ('pending', 'verified', 'rejected');

CREATE TABLE volunteers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  verification_status volunteer_verification_status DEFAULT 'pending',
  document_url TEXT NOT NULL,
  address TEXT NOT NULL,
  home_latitude DECIMAL(10,8) NOT NULL,
  home_longitude DECIMAL(11,8) NOT NULL,
  service_radius_km INTEGER DEFAULT 5,
  is_available BOOLEAN DEFAULT true,
  total_assists INTEGER DEFAULT 0,
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteers_verification_status ON volunteers(verification_status);
CREATE INDEX idx_volunteers_is_available ON volunteers(is_available);
