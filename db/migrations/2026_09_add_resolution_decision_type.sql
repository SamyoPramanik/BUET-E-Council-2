-- Backs the AI Resolution Autofill feature's fixed decision-type dropdown
-- (Approved / Rejected / Approved with Conditions / Deferred / Referred to
-- Committee / Amended and Approved / Noted / Withdrawn — see the frontend's
-- RESOLUTION_DECISION_TYPES list, kept in sync with the values this column
-- accepts). Deliberately NOT backfilled: there is no reliable way to infer a
-- decision type from years of free-text historical resolutions, and a wrong
-- backfilled guess would silently corrupt the "same-category, same-decision"
-- precedent ranking the autofill retrieval step relies on. NULL simply means
-- "authored before this feature (or without picking a type)" and those rows
-- just don't participate in the decision-type ranking boost — they still
-- count for plain same-category retrieval. The column starts filling in
-- naturally as new resolutions are authored through the autofill flow.
ALTER TABLE agenda
    ADD COLUMN IF NOT EXISTS decision_type VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_agenda_category_decision
    ON agenda (category_id, decision_type)
    WHERE decision_type IS NOT NULL;
