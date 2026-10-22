-- CREATE TABLE IF NOT EXISTS does not upgrade an existing legacy table.
-- Missing location/rank data remains unknown rather than guessing real values.
ALTER TABLE hotels
 ADD COLUMN IF NOT EXISTS address varchar(255),
 ADD COLUMN IF NOT EXISTS city varchar(100) NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS country varchar(100) NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS rank smallint NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
 ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE hotels SET city = '' WHERE city IS NULL;
UPDATE hotels SET country = '' WHERE country IS NULL;
UPDATE hotels SET rank = 0 WHERE rank IS NULL;
ALTER TABLE hotels
 ALTER COLUMN city SET NOT NULL,
 ALTER COLUMN country SET NOT NULL,
 ALTER COLUMN rank SET NOT NULL;
