-- ============================================================
-- Tabell: occupation_forecasts
-- Yrkesprognoser från Arbetsförmedlingens Yrkesbarometer
-- Populeras via fetch-occupation-forecasts.js (kör lokalt)
-- ============================================================
--
-- Kör detta i Supabase → SQL Editor innan du kör scriptet.
--
-- Yrkesbarometern uppdateras 2 ggr/år (Vår och Höst).
-- Från våren 2026 publiceras den i juni och december.
--
-- Data hämtas från:
--   https://data.arbetsformedlingen.se/prognoser/yrkesbarometer.json
-- ============================================================

CREATE TABLE IF NOT EXISTS occupation_forecasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Koppling till occupation_stats (samma occupation_id)
  occupation_id   INTEGER NOT NULL,
  occupation_name TEXT NOT NULL,

  -- SCB SSYK-kod (Standard för svensk yrkesklassificering 2012)
  ssyk_code       TEXT NOT NULL,

  -- Geografisk nivå (0 = Riket/nationell, annars länsnummer)
  region_id       TEXT NOT NULL DEFAULT '0',
  region_name     TEXT NOT NULL DEFAULT 'Riket',

  -- Publiceringsperiod
  forecast_year   INTEGER,
  forecast_term   TEXT,   -- t.ex. 'Vår' eller 'Höst'

  -- -------------------------------------------------------
  -- Arbetsförmedlingens bedömningar (skala 1–5):
  --   1 = Stor brist (on workers)
  --   2 = Brist
  --   3 = Balans
  --   4 = Överskott
  --   5 = Stor överskott
  --
  -- Observera: lågt tal = hög efterfrågan på arbetstagare.
  -- -------------------------------------------------------

  -- Nulägesbedömning: möjlighet att få jobb
  job_opportunities       INTEGER,   -- 1 (stor brist) – 5 (stor överskott)
  job_opportunities_text  TEXT,      -- Fritext om tillgänglig

  -- Nulägesbedömning: rekryteringsläge för arbetsgivare
  recruitment_situation       INTEGER,
  recruitment_situation_text  TEXT,

  -- 5-årsprognos för efterfrågan
  five_year_forecast       INTEGER,
  five_year_forecast_text  TEXT,

  -- Rådata från Arbetsförmedlingen (för felsökning och framtida bruk)
  raw_data        JSONB,

  -- Unik rad per yrke + region + period
  UNIQUE (occupation_id, region_id, forecast_year, forecast_term)
);

-- Index för snabb lookup
CREATE INDEX IF NOT EXISTS idx_occ_forecasts_occupation_id
  ON occupation_forecasts (occupation_id);

CREATE INDEX IF NOT EXISTS idx_occ_forecasts_ssyk
  ON occupation_forecasts (ssyk_code);

CREATE INDEX IF NOT EXISTS idx_occ_forecasts_region
  ON occupation_forecasts (region_id);

-- RLS: Alla kan läsa, ingen kan skriva från frontend
ALTER TABLE occupation_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read occupation_forecasts"
  ON occupation_forecasts FOR SELECT
  USING (true);
