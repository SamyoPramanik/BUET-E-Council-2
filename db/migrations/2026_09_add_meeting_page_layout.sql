-- Page setup chosen in the editor's Page Layout tab (size, orientation, margins);
-- the generated PDF prints on the same page.
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS page_layout JSONB;
