-- Add flag to track whether an agenda item's resolution has been submitted
-- (copied) to the archive box for inclusion in a future meeting.
ALTER TABLE agenda
    ADD COLUMN IF NOT EXISTS is_submitted_for_next_meeting BOOLEAN DEFAULT false;
