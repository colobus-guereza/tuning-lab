-- Migration: Add compound target fields to hit_points table
-- Created: 2025-11-20
-- Description: Adds primary_target, auxiliary_target, is_compound, and target_display fields
--              to support compound tuning targets (e.g., "토닉 (+5도)")

-- Add primary_target column (main target based on highest weight score)
ALTER TABLE hit_points
ADD COLUMN IF NOT EXISTS primary_target TEXT CHECK (primary_target IN ('tonic', 'octave', 'fifth'));

-- Add auxiliary_target column (secondary target that cooperates with primary)
ALTER TABLE hit_points
ADD COLUMN IF NOT EXISTS auxiliary_target TEXT CHECK (auxiliary_target IN ('tonic', 'octave', 'fifth'));

-- Add is_compound column (boolean flag for compound strikes)
ALTER TABLE hit_points
ADD COLUMN IF NOT EXISTS is_compound BOOLEAN DEFAULT FALSE;

-- Add target_display column (UI display string like "토닉 (+5도)")
ALTER TABLE hit_points
ADD COLUMN IF NOT EXISTS target_display TEXT;

-- Add comment explaining the new fields
COMMENT ON COLUMN hit_points.primary_target IS 'Main tuning target (highest weight score from tonic:1, octave:2, fifth:3)';
COMMENT ON COLUMN hit_points.auxiliary_target IS 'Secondary target that cooperates with primary (shares same sign for vectorcomposition)';
COMMENT ON COLUMN hit_points.is_compound IS 'Whether this is a compound strike targeting two frequencies simultaneously';
COMMENT ON COLUMN hit_points.target_display IS 'UI display string showing compound target format (e.g., "토닉 (+5도)")';

-- Optional: Update existing rows with default values (if needed)
-- UPDATE hit_points SET primary_target = tuning_target WHERE primary_target IS NULL;
-- UPDATE hit_points SET is_compound = FALSE WHERE is_compound IS NULL;
-- UPDATE hit_points SET target_display =
--   CASE tuning_target
--     WHEN 'tonic' THEN '토닉'
--     WHEN 'octave' THEN '옥타브'
--     WHEN 'fifth' THEN '5도'
--   END
-- WHERE target_display IS NULL;
