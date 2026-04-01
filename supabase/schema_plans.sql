-- ============================================================
-- Plans table – saknade kolumner + verify_login RPC
--
-- Tabellen finns redan i Supabase. Kör detta i SQL Editor för att:
-- 1. Lägga till kolumner som saknas (password, salary)
-- 2. Skapa verify_login-funktionen
-- ============================================================

-- 1. Lägg till saknade kolumner om de inte redan finns
ALTER TABLE plans ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS salary INTEGER;

-- 2. verify_login RPC – returnerar planraden om email+lösenord stämmer
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

-- 3. RLS – se till att anon kan INSERT/SELECT/UPDATE/DELETE
--    (Kontrollera att dessa policies finns, skapa om de saknas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='allow_anon_insert'
  ) THEN
    CREATE POLICY "allow_anon_insert" ON plans FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='allow_anon_select'
  ) THEN
    CREATE POLICY "allow_anon_select" ON plans FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='allow_anon_update'
  ) THEN
    CREATE POLICY "allow_anon_update" ON plans FOR UPDATE TO anon USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='plans' AND policyname='allow_anon_delete'
  ) THEN
    CREATE POLICY "allow_anon_delete" ON plans FOR DELETE TO anon USING (true);
  END IF;
END $$;
