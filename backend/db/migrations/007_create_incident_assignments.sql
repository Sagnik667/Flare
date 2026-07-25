CREATE TYPE assignment_status_type AS ENUM (
  'pending',
  'accepted',
  'declined',
  'en_route',
  'arrived',
  'assisting',
  'resolved'
);

CREATE TABLE incident_assignments (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES emergency_incidents(id) ON DELETE RESTRICT NOT NULL,
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE RESTRICT NOT NULL,
  assignment_status assignment_status_type DEFAULT 'pending',
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  UNIQUE(incident_id, volunteer_id)
);

CREATE INDEX idx_incident_assignments_incident_id ON incident_assignments(incident_id);
CREATE INDEX idx_incident_assignments_volunteer_id ON incident_assignments(volunteer_id);
