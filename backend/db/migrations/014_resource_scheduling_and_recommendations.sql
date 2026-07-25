-- Alter safety_resources to add opening time, closing time, and permanent closure status
ALTER TABLE safety_resources ADD COLUMN IF NOT EXISTS opening_time TIME NOT NULL DEFAULT '00:00:00';
ALTER TABLE safety_resources ADD COLUMN IF NOT EXISTS closing_time TIME NOT NULL DEFAULT '23:59:59';
ALTER TABLE safety_resources ADD COLUMN IF NOT EXISTS is_permanently_closed BOOLEAN NOT NULL DEFAULT false;

-- Table for storing weekly closed days (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
CREATE TABLE IF NOT EXISTS weekly_closed_days (
  id UUID PRIMARY KEY,
  resource_id UUID REFERENCES safety_resources(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  UNIQUE(resource_id, day_of_week)
);

-- Table for storing specific holiday dates
CREATE TABLE IF NOT EXISTS special_closed_dates (
  id UUID PRIMARY KEY,
  resource_id UUID REFERENCES safety_resources(id) ON DELETE CASCADE,
  closed_date DATE NOT NULL,
  UNIQUE(resource_id, closed_date)
);

-- Table for storing temporary closure ranges
CREATE TABLE IF NOT EXISTS resource_temporary_closures (
  id UUID PRIMARY KEY,
  resource_id UUID REFERENCES safety_resources(id) ON DELETE CASCADE,
  closed_from TIMESTAMPTZ NOT NULL,
  closed_until TIMESTAMPTZ, -- NULL means until unknown
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for volunteer-recommended new safety resources
CREATE TABLE IF NOT EXISTS resource_recommendations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category safety_resource_category NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  opening_time TIME NOT NULL DEFAULT '00:00:00',
  closing_time TIME NOT NULL DEFAULT '23:59:59',
  recommended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review TEXT,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly closed days proposed for recommended resources
CREATE TABLE IF NOT EXISTS recommended_weekly_closed_days (
  id UUID PRIMARY KEY,
  recommendation_id UUID REFERENCES resource_recommendations(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  UNIQUE(recommendation_id, day_of_week)
);

-- Special dates proposed for recommended resources
CREATE TABLE IF NOT EXISTS recommended_special_closed_dates (
  id UUID PRIMARY KEY,
  recommendation_id UUID REFERENCES resource_recommendations(id) ON DELETE CASCADE,
  closed_date DATE NOT NULL,
  UNIQUE(recommendation_id, closed_date)
);

-- Table for safety resource closure recommendations
CREATE TABLE IF NOT EXISTS closure_recommendations (
  id UUID PRIMARY KEY,
  resource_id UUID REFERENCES safety_resources(id) ON DELETE CASCADE,
  recommended_by UUID REFERENCES users(id) ON DELETE SET NULL,
  closure_type VARCHAR(20) NOT NULL CHECK (closure_type IN ('permanent', 'temporary')),
  closed_from TIMESTAMPTZ,
  closed_until TIMESTAMPTZ,
  until_unknown BOOLEAN DEFAULT false NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
