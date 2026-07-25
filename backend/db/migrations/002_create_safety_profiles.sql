CREATE TABLE safety_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  blood_group VARCHAR(10),
  medical_notes TEXT,
  emergency_instructions TEXT,
  preferred_language VARCHAR(50) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
