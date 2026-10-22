-- Older databases may have a hotels table created before slugs were added.
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS slug varchar(100);

DO $$
DECLARE
 hotel_row record;
 candidate text;
 suffix integer;
BEGIN
 FOR hotel_row IN SELECT id FROM hotels WHERE slug IS NULL OR btrim(slug) = '' ORDER BY id LOOP
  candidate := 'legacy-' || hotel_row.id::text;
  suffix := 0;
  WHILE EXISTS (SELECT 1 FROM hotels WHERE slug = candidate AND id <> hotel_row.id) LOOP
   suffix := suffix + 1;
   candidate := 'legacy-' || hotel_row.id::text || '-' || suffix::text;
  END LOOP;
  UPDATE hotels SET slug = candidate WHERE id = hotel_row.id;
 END LOOP;
END $$;

ALTER TABLE hotels ALTER COLUMN slug SET NOT NULL;
DO $$ BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conrelid = 'hotels'::regclass AND contype = 'u'
   AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'hotels'::regclass AND attname = 'slug')]::smallint[]
 ) THEN
  ALTER TABLE hotels ADD CONSTRAINT hotels_slug_key UNIQUE (slug);
 END IF;
END $$;
