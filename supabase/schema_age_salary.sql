-- ============================================================
-- Åldersuppdelad lönedata — lägg till kolumner i occupation_stats
-- Kör detta i Supabase SQL Editor innan du kör fetch-age-salary.js
-- Källa: SCB LonYrkeAlder4AN (SSYK 2012, samtliga sektorer, totalt kön)
-- ============================================================

ALTER TABLE occupation_stats
  ADD COLUMN IF NOT EXISTS age_18_24 INTEGER,
  ADD COLUMN IF NOT EXISTS age_25_34 INTEGER,
  ADD COLUMN IF NOT EXISTS age_35_44 INTEGER,
  ADD COLUMN IF NOT EXISTS age_45_54 INTEGER,
  ADD COLUMN IF NOT EXISTS age_55_64 INTEGER;

-- Kommentar: age_tot (totalt ålder) matchar befintlig monthly_salary och läggs inte till separat.
