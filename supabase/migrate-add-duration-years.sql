-- ============================================================
-- Migration: Lägg till duration_years för länge-filter
-- Kör i Supabase SQL Editor
-- ============================================================

ALTER TABLE yh_schools ADD COLUMN IF NOT EXISTS duration_years NUMERIC;

UPDATE yh_schools SET duration_years = CASE
  WHEN school_type = 'YH' AND credits IS NOT NULL
    THEN ROUND(credits::numeric / (COALESCE(pace_of_study, 100)::numeric / 100.0) / 200.0, 1)
  WHEN school_type = 'HS' AND hp_credits IS NOT NULL
    THEN ROUND(hp_credits::numeric / (COALESCE(pace_of_study, 100)::numeric / 100.0) / 60.0, 1)
  ELSE NULL
END;

CREATE INDEX IF NOT EXISTS idx_yh_schools_duration_years ON yh_schools (duration_years);
