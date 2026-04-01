-- ============================================================
-- Plans table + verify_login RPC
-- Kör detta i Supabase SQL Editor för att sätta upp plans-tabellen
-- och inloggningsfunktionen.
-- ============================================================

-- 1. Skapa plans-tabellen
CREATE TABLE IF NOT EXISTS plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  password     TEXT NOT NULL,
  session_id   TEXT,
  education_id INTEGER,
  salary       INTEGER,
  data         JSONB,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Index för snabb lookup på email
CREATE INDEX IF NOT EXISTS idx_plans_email ON plans (email);

-- 2. Uppdatera updated_at automatiskt vid PATCH
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plans_updated_at ON plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. RLS – aktivera och tillåt anonym läs/skriv via anon-nyckel
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Tillåt INSERT (skapa ny plan)
DROP POLICY IF EXISTS "allow_anon_insert" ON plans;
CREATE POLICY "allow_anon_insert"
  ON plans FOR INSERT
  TO anon
  WITH CHECK (true);

-- Tillåt SELECT via verify_login (funktionen kör som SECURITY DEFINER)
DROP POLICY IF EXISTS "allow_anon_select_own" ON plans;
CREATE POLICY "allow_anon_select_own"
  ON plans FOR SELECT
  TO anon
  USING (true);

-- Tillåt UPDATE (auto-save av planändringar)
DROP POLICY IF EXISTS "allow_anon_update_own" ON plans;
CREATE POLICY "allow_anon_update_own"
  ON plans FOR UPDATE
  TO anon
  USING (true);

-- Tillåt DELETE (kontoradering)
DROP POLICY IF EXISTS "allow_anon_delete_own" ON plans;
CREATE POLICY "allow_anon_delete_own"
  ON plans FOR DELETE
  TO anon
  USING (true);

-- 4. verify_login RPC – returnerar planraden om email+lösenord stämmer
CREATE OR REPLACE FUNCTION verify_login(input_email TEXT, input_password TEXT)
RETURNS SETOF plans
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM plans
  WHERE email = lower(trim(input_email))
    AND password = trim(input_password)
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Ge anon-rollen rätt att anropa funktionen
GRANT EXECUTE ON FUNCTION verify_login(TEXT, TEXT) TO anon;
