-- ============================================================
-- verify_login RPC för plans-tabellen
--
-- Tabellen har: id, created_at, user_id, education_id, plan_data,
--               paid, email, session_id, salary, data, password
--
-- Lösenord är bcrypt-hashade (t.ex. $2a$06$...).
-- Kör detta i Supabase SQL Editor.
-- ============================================================

-- Aktivera pgcrypto (behövs för crypt()-funktionen som jämför bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- verify_login: returnerar planraden om email + lösenord stämmer
CREATE OR REPLACE FUNCTION verify_login(input_email TEXT, input_password TEXT)
RETURNS SETOF plans
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM plans
  WHERE email = lower(trim(input_email))
    AND password = crypt(trim(input_password), password)
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Ge anon-rollen rätt att anropa funktionen
GRANT EXECUTE ON FUNCTION verify_login(TEXT, TEXT) TO anon;
