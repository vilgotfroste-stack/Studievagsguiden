-- ============================================================
-- Tabell: occupation_workenv
-- Arbetsmiljödata per yrke från SCB:s Arbetsmiljöundersökning (AMU)
-- Populeras via fetch-occupation-workenv.js (kör lokalt)
-- ============================================================
--
-- AMU genomförs vartannat år av SCB/Arbetsmiljöverket.
-- Senaste data: 2021. Nästa förväntas: 2023.
--
-- Datan är på SSYK 3-siffernivå — yrken som delar 3-siffrig
-- SSYK-kod (t.ex. alla IT-yrken → 251) får identiska värden.
--
-- Kör detta i Supabase → SQL Editor innan du kör scriptet.
-- ============================================================

CREATE TABLE IF NOT EXISTS occupation_workenv (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Koppling till occupation_stats (samma occupation_id)
  occupation_id   INTEGER NOT NULL,
  occupation_name TEXT NOT NULL,

  -- SSYK-koder
  ssyk_code       TEXT NOT NULL,   -- 4-siffrig (internt, t.ex. "2512")
  ssyk3_code      TEXT NOT NULL,   -- 3-siffrig (AMU-nivå, t.ex. "251")

  -- Statistikår (t.ex. 2021)
  stat_year       INTEGER NOT NULL,

  -- -------------------------------------------------------
  -- Andel (%) av sysselsatta som upplever respektive faktor.
  -- Källa: SCB Arbetsmiljöundersökning, totalt (båda könen).
  -- -------------------------------------------------------
  stress_pct                   NUMERIC,  -- Ofta stressad
  high_tempo_pct               NUMERIC,  -- Högt arbetstempo
  psychologically_demanding_pct NUMERIC, -- Psykiskt ansträngande arbete
  physically_demanding_pct     NUMERIC,  -- Fysiskt ansträngande arbete
  low_influence_pct            NUMERIC,  -- Låg möjlighet att påverka

  -- Rådata från SCB (för felsökning och framtida bruk)
  raw_data        JSONB,

  -- En rad per yrke och statistikår
  UNIQUE (occupation_id, stat_year)
);

CREATE INDEX IF NOT EXISTS idx_occ_workenv_occupation_id
  ON occupation_workenv (occupation_id);

CREATE INDEX IF NOT EXISTS idx_occ_workenv_ssyk3
  ON occupation_workenv (ssyk3_code);

-- RLS: Alla kan läsa, ingen kan skriva från frontend
ALTER TABLE occupation_workenv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read occupation_workenv"
  ON occupation_workenv FOR SELECT
  USING (true);
