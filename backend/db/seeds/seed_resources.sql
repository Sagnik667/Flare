INSERT INTO safety_resources (id, name, category, address, phone, latitude, longitude, is_active)
VALUES 
  ('d1b777a8-3f5f-42e7-9d7a-18e4fe62c3e1', 'Central Police Station', 'police_station', '100 Safety Boulevard, Metro City', '555-0191', 40.712776, -74.005974, true),
  ('a4c888b9-4f6f-53f8-ae8b-29f50f73d4f2', 'City General Hospital', 'hospital', '250 Wellness Way, Metro City', '555-0192', 40.715000, -74.008000, true),
  ('b5d999c0-5f7f-64f9-bf9c-30f61f84e5f3', 'Safe Haven Women''s Shelter', 'womens_shelter', '50 Hope Street, Metro City', '555-0193', 40.718000, -74.002000, true),
  ('c6ea00d1-6f8f-75fa-cf0d-41f72f95f6f4', 'Metro Care Clinic', 'clinic', '80 Health Street, Metro City', '555-0194', 40.711000, -74.010000, true),
  ('e7fb11e2-7faf-86fb-df1e-52f83fa6f7f5', 'Downtown Community Safe Zone', 'safe_zone', '12 Plaza Square, Metro City', '555-0195', 40.713500, -74.004500, true)
ON CONFLICT (id) DO NOTHING;
