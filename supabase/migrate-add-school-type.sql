-- ============================================================
-- Migration: Lägg till kolumner för HS + SUSA navet
-- Kör i Supabase SQL Editor innan fetch-susa-programs.js
-- ============================================================

ALTER TABLE yh_schools
  ADD COLUMN IF NOT EXISTS school_type       TEXT NOT NULL DEFAULT 'YH',
  ADD COLUMN IF NOT EXISTS education_level   TEXT,
  ADD COLUMN IF NOT EXISTS hp_credits        NUMERIC,
  ADD COLUMN IF NOT EXISTS susa_event_id     TEXT,
  ADD COLUMN IF NOT EXISTS susa_education_id TEXT;

-- Unikt index på susa_event_id (tillåter NULL för gamla YH-rader)
CREATE UNIQUE INDEX IF NOT EXISTS idx_yh_schools_susa_event_id
  ON yh_schools (susa_event_id)
  WHERE susa_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_yh_schools_school_type
  ON yh_schools (school_type);

-- ============================================================
-- Efter lyckad import: ta bort gamla YH-rader (myh_id-baserade)
-- Kör BARA om du vill rensa ut gamla poster:
--
-- DELETE FROM yh_schools WHERE susa_event_id IS NULL;
--
-- ============================================================
