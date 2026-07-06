-- Add a manual display-order "serial" column to members, mirroring the
-- serial columns already on departments/offices/faculties, and backfill
-- existing rows so the admin UI's ORDER BY m.serial has something to sort on.
ALTER TABLE members ADD COLUMN IF NOT EXISTS serial INTEGER;

WITH base AS (
    SELECT COALESCE(MAX(serial), 0) AS max_serial FROM members
),
ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY legacy_member_id NULLS LAST, name) AS rn
    FROM members
    WHERE serial IS NULL
)
UPDATE members m
SET serial = base.max_serial + ranked.rn
FROM ranked, base
WHERE m.id = ranked.id;
