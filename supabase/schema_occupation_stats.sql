-- ============================================================
-- Tabell: occupation_stats
-- Lönestatistik per yrke från SCB:s PxWeb API (SSYK 2012)
-- Populeras via fetch-occupation-stats.js (kör lokalt)
-- ============================================================

CREATE TABLE IF NOT EXISTS occupation_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Koppling till vår E-array i HTML-filerna
  occupation_id   INTEGER NOT NULL UNIQUE,  -- matchar id i E-arrayen (1–29)
  occupation_name TEXT NOT NULL,

  -- SCB SSYK-kod (Standard för svensk yrkesklassificering 2012)
  ssyk_code       TEXT NOT NULL,

  -- Lönedata från SCB (kronor/månad)
  -- Källa: AM0110A/LoneSpridSektYrk4AN, samtliga sektorer
  monthly_salary  INTEGER,   -- Månadslön (medelvärde) – används som s1
  median_salary   INTEGER,   -- Medianlön
  p25_salary      INTEGER,   -- P25 (undre kvartil)
  p75_salary      INTEGER,   -- P75 (övre kvartil)

  -- Vilket år datan gäller
  stat_year       INTEGER NOT NULL DEFAULT 2024
);

-- Index för snabb lookup på occupation_id
CREATE INDEX IF NOT EXISTS idx_occupation_stats_occupation_id
  ON occupation_stats (occupation_id);

CREATE INDEX IF NOT EXISTS idx_occupation_stats_ssyk_code
  ON occupation_stats (ssyk_code);

-- RLS: Alla kan läsa, ingen kan skriva från frontend
ALTER TABLE occupation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read occupation_stats"
  ON occupation_stats FOR SELECT
  USING (true);
