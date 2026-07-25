CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  notify_on_sos BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
