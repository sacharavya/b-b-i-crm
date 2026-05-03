-- ============================================================================
-- Grants for the Supabase 'service_role' role.
--
-- service_role is used by server actions that bypass RLS (e.g. the
-- bootstrap script and the addStaff admin client). PostgREST routes those
-- requests through the same role, so without USAGE on our custom schemas
-- the request fails before RLS is even evaluated with
-- "permission denied for schema crm".
--
-- Migration 002 granted USAGE + DML to 'authenticated' but missed
-- service_role; this migration patches that gap.
-- ============================================================================

GRANT USAGE ON SCHEMA crm     TO service_role;
GRANT USAGE ON SCHEMA files   TO service_role;
GRANT USAGE ON SCHEMA portal  TO service_role;
GRANT USAGE ON SCHEMA ref     TO service_role;
GRANT USAGE ON SCHEMA audit   TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crm    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA files  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA portal TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA audit  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ref    TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA crm TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA crm TO service_role;

-- Default privileges so future tables/sequences/functions pick up the grant
-- automatically and we don't need a follow-up migration each time the
-- schema grows.
ALTER DEFAULT PRIVILEGES IN SCHEMA crm
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA files
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA portal
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ref
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm
    GRANT EXECUTE ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm
    GRANT USAGE, SELECT ON SEQUENCES TO service_role;
