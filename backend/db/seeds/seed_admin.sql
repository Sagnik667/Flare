INSERT INTO users (id, full_name, email, phone, password_hash, role, status, email_verified)
VALUES (
  '1e2f3d4c-5b6a-7f8e-9d0c-1b2a3f4e5d6c',
  'System Administrator',
  'admin@flare.local',
  '555-0100',
  '$2a$10$YYaA0/ik7uZUoKJ2WBuzq.A3zmyAcpkk8urb5h1B3WBUcyofI1ZkK',
  'admin',
  'active',
  true
)
ON CONFLICT (email) DO NOTHING;
