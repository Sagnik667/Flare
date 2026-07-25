CREATE TYPE user_role AS ENUM ('woman', 'volunteer', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification');
CREATE TYPE auth_provider_type AS ENUM ('email', 'google');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash TEXT,
  role user_role DEFAULT 'woman',
  status user_status DEFAULT 'active',
  auth_provider auth_provider_type DEFAULT 'email',
  google_id TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  email_verify_token TEXT,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_password_hash CHECK (auth_provider = 'google' OR password_hash IS NOT NULL)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
