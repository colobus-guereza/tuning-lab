-- Migration: Add hammering_type field to hit_points table
-- Created: 2025-11-22
-- Description: Adds hammering_type field to store the hammering technique
--              (SNAP: 튕겨치기, PULL: 당겨치기, PRESS: 눌러치기)
--              determined by the direction and magnitude of tuning error

-- Add hammering_type column
ALTER TABLE hit_points
ADD COLUMN IF NOT EXISTS hammering_type TEXT CHECK (hammering_type IN ('SNAP', 'PULL', 'PRESS'));

-- Add comment explaining the new field
COMMENT ON COLUMN hit_points.hammering_type IS 'Hammering technique: SNAP (튕겨치기) for small errors, PULL (당겨치기) for medium internal errors, PRESS (눌러치기) for large errors. Determined by rawHz direction and magnitude.';
