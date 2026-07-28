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

const ensureCategorySchema = `
  CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      serial INTEGER DEFAULT 1,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE agenda ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  INSERT INTO categories (serial, name) VALUES
    (1, '(উপাচার্য মহোদয় কর্তৃক গৃহীত ব্যবস্থা)'),
    (2, '(ছাত্র-ছাত্রীদের আবেদন ও গ্রেড পরিবর্তন সংক্রান্ত)'),
    (3, '(বিভিন্ন বিভাগের কোর্স কারিকুলাম সংক্রান্ত)'),
    (4, '(বিভিন্ন কমিটি/অনুষদ সভার সুপারিশ সংক্রান্ত)'),
    (5, '(কমিটি গঠন/বিভিন্ন কমিটিতে মনোনয়ন সংক্রান্ত)'),
    (6, '(স্নাতক শ্রেণিসমূহের টার্ম ফাইনাল ও সাপ্লিমেন্টারি পরীক্ষার প্রশ্নপত্র প্রণয়ন সংক্রান্ত)'),
    (7, '(Testimonial প্রদান সংক্রান্ত)'),
    (8, '(ইকুইভ্যালেন্স বিষয় সংক্রান্ত)'),
    (9, '(২০২৪-২০২৫ শিক্ষাবর্ষে ভর্তি পরীক্ষা সংক্রান্ত)'),
    (10, '(CASR সংক্রান্ত)'),
    (11, '(স্নাতক পর্যায়ের পরীক্ষা কমিটি সংক্রান্ত)'),
    (12, '(ইকুইভ্যালেন্স কমিটির সুপারিশ সংক্রান্ত)'),
    (13, '(শিক্ষার্থীদের শাস্তি মওকুফের আবেদন সংক্রান্ত)'),
    (14, '(অন্যান্য বিষয় সংক্রান্ত)')
  ON CONFLICT (name) DO NOTHING;
`;
pool.query(ensureCategorySchema).catch((err) => console.error('ensureCategorySchema error:', err.message));

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
