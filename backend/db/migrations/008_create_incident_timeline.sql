CREATE TABLE incident_timeline (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES emergency_incidents(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incident_timeline_incident_id ON incident_timeline(incident_id);
