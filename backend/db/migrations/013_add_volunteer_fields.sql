-- Migration: Add age, government_id_type, and government_id_number to volunteers table
ALTER TABLE volunteers
ADD COLUMN age INTEGER CHECK (age >= 18),
ADD COLUMN government_id_type VARCHAR(50),
ADD COLUMN government_id_number VARCHAR(100);
