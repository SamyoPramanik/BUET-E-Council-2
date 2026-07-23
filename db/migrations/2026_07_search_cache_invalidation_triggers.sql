-- Migration: Automatic invalidation of search_cache on any meeting, agenda, or user changes

CREATE OR REPLACE FUNCTION clear_search_cache_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM search_cache;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clear_search_cache_meetings') THEN
        CREATE TRIGGER trg_clear_search_cache_meetings
        AFTER INSERT OR UPDATE OR DELETE ON meetings
        FOR EACH STATEMENT EXECUTE FUNCTION clear_search_cache_trigger_fn();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clear_search_cache_agenda') THEN
        CREATE TRIGGER trg_clear_search_cache_agenda
        AFTER INSERT OR UPDATE OR DELETE ON agenda
        FOR EACH STATEMENT EXECUTE FUNCTION clear_search_cache_trigger_fn();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clear_search_cache_users') THEN
        CREATE TRIGGER trg_clear_search_cache_users
        AFTER INSERT OR UPDATE OR DELETE ON users
        FOR EACH STATEMENT EXECUTE FUNCTION clear_search_cache_trigger_fn();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clear_search_cache_annexures') THEN
        CREATE TRIGGER trg_clear_search_cache_annexures
        AFTER INSERT OR UPDATE OR DELETE ON annexures
        FOR EACH STATEMENT EXECUTE FUNCTION clear_search_cache_trigger_fn();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clear_search_cache_invitees') THEN
        CREATE TRIGGER trg_clear_search_cache_invitees
        AFTER INSERT OR UPDATE OR DELETE ON invitees
        FOR EACH STATEMENT EXECUTE FUNCTION clear_search_cache_trigger_fn();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clear_search_cache_agenda_tags') THEN
        CREATE TRIGGER trg_clear_search_cache_agenda_tags
        AFTER INSERT OR UPDATE OR DELETE ON agenda_tags
        FOR EACH STATEMENT EXECUTE FUNCTION clear_search_cache_trigger_fn();
    END IF;
END $$;
