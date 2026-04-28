-- ============================================================
-- STEG 1: Lägg till kolumner om de saknas
-- ============================================================
ALTER TABLE yh_schools
  ADD COLUMN IF NOT EXISTS school_type       TEXT NOT NULL DEFAULT 'YH',
  ADD COLUMN IF NOT EXISTS education_level   TEXT,
  ADD COLUMN IF NOT EXISTS hp_credits        NUMERIC,
  ADD COLUMN IF NOT EXISTS susa_event_id     TEXT,
  ADD COLUMN IF NOT EXISTS susa_education_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_yh_schools_susa_event_id
  ON yh_schools (susa_event_id)
  WHERE susa_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_yh_schools_school_type
  ON yh_schools (school_type);

-- ============================================================
-- STEG 2: Sätt education_ids baserat på programnamn
-- IDs matchar E-arrayen i appen:
--  1=Systemutvecklare, 2=Dataanalytiker, 3=IT-säkerhet,
--  9=Redovisningsekonom, 10=Controller, 11=Digital marknadsförare,
--  12=HR-specialist, 14=Sjuksköterska, 16=Arbetsterapeut,
--  17=Biomedicinsk analytiker, 18=Tandhygienist,
--  20=Grundskollärare, 21=Gymnasielärare, 22=SYV,
--  24=Byggingenjör, 25=Fastighetsförvaltare
-- ============================================================
UPDATE yh_schools
SET education_ids = (
  SELECT ARRAY(
    SELECT DISTINCT x
    FROM unnest(
      -- 1: Systemutvecklare
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%systemutvecklare%','%mjukvaruutvecklare%','%webbutvecklare%',
        '%programmerare%','%fullstack%','%backend%','%frontend%',
        '%applikationsutvecklare%','%java-utvecklare%','%pythonutvecklare%'
      ]) THEN ARRAY[1] ELSE '{}'::int[] END) ||
      -- 2: Dataanalytiker
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%dataanalytiker%','%dataanalys%','%data analytics%',
        '%business intelligence%','%bi-utvecklare%','%dataingenjör%',
        '%machine learning%','%ai-ingenjör%','%data science%',
        '%datavetenskap%','%data och ai%','%artificiell intelligens%',
        '%data- och ai%'
      ]) THEN ARRAY[2] ELSE '{}'::int[] END) ||
      -- 3: IT-säkerhetsspecialist
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%it-säkerhet%','%cybersecurity%','%informationssäkerhet%',
        '%säkerhetsanalytiker%','%nätverkssäkerhet%','%penetrationstest%',
        '%cyber security%'
      ]) THEN ARRAY[3] ELSE '{}'::int[] END) ||
      -- 9: Redovisningsekonom
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%redovisningsekonom%','%redovisning%','%bokföring%',
        '%löneadministratör%','%lönespecialist%','%ekonomiassistent%'
      ]) THEN ARRAY[9] ELSE '{}'::int[] END) ||
      -- 10: Controller
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%controller%','%ekonomistyrning%','%business controller%',
        '%finansanalytiker%','%financial controller%'
      ]) THEN ARRAY[10] ELSE '{}'::int[] END) ||
      -- 11: Digital marknadsförare
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%digital marknadsföring%','%marknadsförare%','%content marketing%',
        '%sociala medier%','%e-handel%','%growth hacker%','%marknadsföring%'
      ]) THEN ARRAY[11] ELSE '{}'::int[] END) ||
      -- 12: HR-specialist
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%hr-specialist%','%hr-ansvarig%','%personalarbete%',
        '%human resources%','%personalvetare%','%personalchef%',
        '%personalspecialist%','%personalvetenskap%','%lön och personal%',
        '%personal och lön%'
      ]) THEN ARRAY[12] ELSE '{}'::int[] END) ||
      -- 14: Sjuksköterska
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%sjuksköterska%','%sjuksköterskeprogrammet%',
        '%specialistsjuksköterska%','%hälso- och sjukvård%'
      ]) THEN ARRAY[14] ELSE '{}'::int[] END) ||
      -- 16: Arbetsterapeut
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%arbetsterapeut%','%arbetsterapeutprogrammet%'
      ]) THEN ARRAY[16] ELSE '{}'::int[] END) ||
      -- 17: Biomedicinsk analytiker
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%biomedicinsk%','%bioanalytiker%',
        '%medicinsk laboratorievetenskap%','%laboratorieanalytiker%'
      ]) THEN ARRAY[17] ELSE '{}'::int[] END) ||
      -- 18: Tandhygienist
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%tandhygienist%','%tandvård%','%dental%','%tandsköterska%'
      ]) THEN ARRAY[18] ELSE '{}'::int[] END) ||
      -- 20: Grundskollärare
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%grundskollärare%','%grundskolelärare%','%förskollärare%',
        '%lärare i grundskolan%','%fritidspedagog%'
      ]) THEN ARRAY[20] ELSE '{}'::int[] END) ||
      -- 21: Gymnasielärare
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%gymnasielärare%','%ämneslärare%','%yrkeslärare%'
      ]) THEN ARRAY[21] ELSE '{}'::int[] END) ||
      -- 22: Studie- och yrkesvägledare
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%studie- och yrkesvägledare%','%yrkesvägledare%',
        '%studie och yrkesvägledare%','%socionom%','%socialt arbete%',
        '%socialsekreterare%'
      ]) THEN ARRAY[22] ELSE '{}'::int[] END) ||
      -- 24: Byggingenjör
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%byggingenjör%','%byggnadsingenjör%','%byggteknik%','%samhällsbyggnad%'
      ]) THEN ARRAY[24] ELSE '{}'::int[] END) ||
      -- 25: Fastighetsförvaltare
      (CASE WHEN lower(program_name) LIKE ANY(ARRAY[
        '%fastighetsförvaltare%','%fastighetsförvaltning%',
        '%fastighetsteknik%','%fastighetsmäklare%'
      ]) THEN ARRAY[25] ELSE '{}'::int[] END)
    ) AS x
    WHERE x IS NOT NULL
    ORDER BY x
  )
);

-- ============================================================
-- Kontroll: resultat per skoltyp
-- ============================================================
SELECT
  school_type,
  COUNT(*)                                                          AS totalt,
  COUNT(*) FILTER (WHERE array_length(education_ids, 1) > 0)       AS med_education_ids,
  COUNT(*) FILTER (WHERE array_length(education_ids, 1) IS NULL)   AS utan_education_ids
FROM yh_schools
GROUP BY school_type
ORDER BY school_type;
