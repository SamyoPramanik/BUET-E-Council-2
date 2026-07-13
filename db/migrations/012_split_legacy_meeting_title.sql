-- The legacy import (003_legacy_transform.py) dumped the full descriptive text
-- (e.g. "একাডেমিক কাউন্সিল অধিবেশন নং 376") into `title` and left `meeting_title`
-- empty, instead of splitting the serial number into `title` and the
-- descriptive text into `meeting_title` (the pattern every other part of the
-- app assumes -- see frontend/app/page.tsx's "'title' in DB holds the serial"
-- comment and pdfGenerator.js's `serialNo = meeting.title`). Fix the affected
-- rows to match that pattern, using legacy_meeting_no as the authoritative
-- serial number.
UPDATE meetings
SET meeting_title = trim(regexp_replace(title, '[0-9]+', '', 'g')),
    title = legacy_meeting_no::text
WHERE (meeting_title IS NULL OR trim(meeting_title) = '')
  AND legacy_meeting_no IS NOT NULL;
