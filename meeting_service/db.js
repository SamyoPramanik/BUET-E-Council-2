const { Pool } = require('pg');

const pool = new Pool(process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL
} : {
    user: process.env.POSTGRES_USER || 'admin',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    database: process.env.POSTGRES_DB || 'buet_ecouncil',
    password: process.env.POSTGRES_PASSWORD || 'secretpassword',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
});

pool.query('ALTER TABLE invitees ALTER COLUMN name DROP NOT NULL; DROP TABLE IF EXISTS presentees CASCADE;').catch(() => {});

const ensureLockingColumns = `
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda_locked_by_username VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda_locked_by_role VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS suppli_agenda_locked_by_username VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS suppli_agenda_locked_by_role VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS resolution_locked_by_username VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS resolution_locked_by_role VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS resolution_status_locked_by_username VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS resolution_status_locked_by_role VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_locked_by_username VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_locked_by_role VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS invitees_locked_by_username VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS invitees_locked_by_role VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS presentees_locked_by_username VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS presentees_locked_by_role VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS conclusion_locked_by_username VARCHAR(255);
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS conclusion_locked_by_role VARCHAR(255);
`;
pool.query(ensureLockingColumns).catch(() => {});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
