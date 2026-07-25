CREATE TYPE notification_type AS ENUM (
  'sos_created',
  'volunteer_assigned',
  'volunteer_accepted',
  'volunteer_arrived',
  'incident_resolved',
  'volunteer_verified',
  'volunteer_rejected',
  'system'
);

CREATE TYPE notification_status_type AS ENUM ('unread', 'read');

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status notification_status_type DEFAULT 'unread',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
