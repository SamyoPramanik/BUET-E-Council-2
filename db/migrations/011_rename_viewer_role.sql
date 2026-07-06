-- Rename the default/lowest user_role from 'member' to 'viewer' to match the
-- admin/moderator("staff")/viewer permission model. Existing rows keep their
-- role automatically since this only renames the enum label, not the data.
ALTER TYPE user_role RENAME VALUE 'member' TO 'viewer';
