-- ============================================================
-- Tabell: yh_schools
-- Populeras via fetch-myh-schools.js (kör lokalt)
-- ============================================================

CREATE TABLE IF NOT EXISTS yh_schools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Skolinfo
  school_name     TEXT NOT NULL,
  program_name    TEXT NOT NULL,
  website_url     TEXT,
  contact_email   TEXT,
  logo_url        TEXT,

  -- Plats
  city            TEXT,           -- t.ex. "Stockholm", "Göteborg", "Distans"
  municipality    TEXT,           -- kommunkod eller namn

  -- Studieform
  study_mode      TEXT NOT NULL DEFAULT 'campus',
  -- värden: 'campus' | 'distance' | 'hybrid'

  study_pace      TEXT NOT NULL DEFAULT 'fulltime',
  -- värden: 'fulltime' | 'parttime'

  -- Avgift
  fee             INTEGER NOT NULL DEFAULT 0,  -- 0 = avgiftsfri

  -- Startdatum (t.ex. ["HT2025","VT2026"])
  start_dates     TEXT[] DEFAULT '{}',

  -- Längd
  duration_text   TEXT,           -- t.ex. "2 år (400 YH-poäng)"

  -- Koppling till våra utbildnings-ID:n (education_keys)
  -- t.ex. [3, 7] = IT-säkerhet + DevOps
  education_ids   INTEGER[] DEFAULT '{}',

  -- MYH-specifik data
  myh_id          TEXT,           -- MYH:s eget ID för utbildningen
  myh_area        TEXT,           -- utbildningsområde från MYH

  active          BOOLEAN DEFAULT true
);

-- Index för snabba queries
CREATE INDEX IF NOT EXISTS idx_yh_schools_education_ids ON yh_schools USING GIN (education_ids);
CREATE INDEX IF NOT EXISTS idx_yh_schools_city ON yh_schools (city);
CREATE INDEX IF NOT EXISTS idx_yh_schools_study_mode ON yh_schools (study_mode);
CREATE INDEX IF NOT EXISTS idx_yh_schools_active ON yh_schools (active);

-- RLS: Alla kan läsa, ingen kan skriva från frontend
ALTER TABLE yh_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read yh_schools"
  ON yh_schools FOR SELECT
  USING (active = true);


-- ============================================================
-- Tabell: school_leads
-- Intresseanmälningar från min-plan.html
-- ============================================================

CREATE TABLE IF NOT EXISTS school_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),

  -- Vilken skola/utbildning
  school_id       UUID REFERENCES yh_schools(id) ON DELETE SET NULL,
  school_name     TEXT NOT NULL,
  program_name    TEXT NOT NULL,
  education_id    INTEGER,        -- vår interna edu-id

  -- Koppling till planen
  plan_id         UUID,           -- plans.id om det finns

  -- Personuppgifter
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  city            TEXT,           -- personens ort
  age             INTEGER,
  study_city      TEXT,           -- önskad studieort
  message         TEXT,           -- fritext/frågor

  -- GDPR
  gdpr_accepted   BOOLEAN NOT NULL DEFAULT false
);

-- Index
CREATE INDEX IF NOT EXISTS idx_school_leads_email ON school_leads (email);
CREATE INDEX IF NOT EXISTS idx_school_leads_school_id ON school_leads (school_id);
CREATE INDEX IF NOT EXISTS idx_school_leads_created_at ON school_leads (created_at DESC);

-- RLS: Alla kan INSERT, ingen kan läsa (bara admin via service role)
ALTER TABLE school_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert school_leads"
  ON school_leads FOR INSERT
  WITH CHECK (gdpr_accepted = true);
