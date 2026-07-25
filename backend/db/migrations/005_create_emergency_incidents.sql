CREATE TYPE incident_status AS ENUM (
  'active',
  'volunteer_assigned',
  'volunteer_en_route',
  'volunteer_arrived',
  'assisting',
  'resolved',
  'cancelled'
);

CREATE TABLE emergency_incidents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE RESTRICT NOT NULL,
  status incident_status DEFAULT 'active',
  trigger_lat DECIMAL(10,8) NOT NULL,
  trigger_lng DECIMAL(11,8) NOT NULL,
  trigger_address TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_emergency_incidents_user_id ON emergency_incidents(user_id);
CREATE INDEX idx_emergency_incidents_status ON emergency_incidents(status);
CREATE INDEX idx_emergency_incidents_created_at_desc ON emergency_incidents(created_at DESC);
