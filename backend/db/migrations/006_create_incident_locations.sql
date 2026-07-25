CREATE TABLE incident_locations (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES emergency_incidents(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  accuracy DECIMAL(8,2),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incident_locations_incident_id ON incident_locations(incident_id);
CREATE INDEX idx_incident_locations_timestamp_desc ON incident_locations(timestamp DESC);
