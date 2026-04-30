-- ============================================================================
-- Grants for the Supabase 'anon' and 'authenticated' roles to reach the
-- custom schemas. The initial migration created schemas and RLS policies but
-- never granted schema USAGE / table privileges, so PostgREST returns
-- "permission denied for schema crm" before RLS is even evaluated.
--
-- RLS policies remain in force; these grants are the minimum required for a
-- request to reach the policy check.
--
-- audit/ stays internal: only triggers (SECURITY DEFINER) write to it, so no
-- direct grants are needed.
-- ============================================================================

-- Schema USAGE
GRANT USAGE ON SCHEMA crm     TO anon, authenticated;
GRANT USAGE ON SCHEMA files   TO anon, authenticated;
GRANT USAGE ON SCHEMA portal  TO anon, authenticated;
GRANT USAGE ON SCHEMA ref     TO anon, authenticated;

-- Table privileges on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crm    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA files  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA portal TO authenticated;
GRANT SELECT                          ON ALL TABLES IN SCHEMA ref   TO anon, authenticated;

-- Sequence USAGE (case_number, client_number, invoice_number generators)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA crm TO authenticated;

-- Function EXECUTE (current_staff_role, current_staff_id, can_advance_phase,
-- case_total_collected, generate_*_number, phase_of)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA crm TO authenticated;

-- Default privileges so future tables/functions/sequences inherit grants
-- without needing a follow-up migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA crm
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA files
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA portal
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA ref
    GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm
    GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
