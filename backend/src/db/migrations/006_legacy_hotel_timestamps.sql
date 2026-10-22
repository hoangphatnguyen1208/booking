-- GORM reads these fields as time.Time; legacy text columns cause scan errors.
-- Preserve valid dates (including offsets); an empty string means unknown/NULL.
DO $$
DECLARE
 field_name text;
BEGIN
 FOREACH field_name IN ARRAY ARRAY['created_at', 'updated_at'] LOOP
  IF EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema = current_schema() AND table_name = 'hotels'
    AND column_name = field_name
    AND data_type IN ('text', 'character varying', 'character')
  ) THEN
   EXECUTE format('ALTER TABLE hotels ALTER COLUMN %I DROP DEFAULT', field_name);
   EXECUTE format(
    $sql$ALTER TABLE hotels ALTER COLUMN %I TYPE timestamptz USING NULLIF(btrim(%I::text), '')::timestamptz$sql$,
    field_name, field_name
   );
   EXECUTE format('ALTER TABLE hotels ALTER COLUMN %I SET DEFAULT now()', field_name);
  END IF;
 END LOOP;
END $$;
