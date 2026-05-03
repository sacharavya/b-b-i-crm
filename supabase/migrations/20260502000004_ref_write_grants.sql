-- ============================================================================
-- Widen ref.* grants for authenticated users so manage_templates flows can
-- INSERT / UPDATE / DELETE.
--
-- Migration 002 only granted SELECT on ref because the schema was originally
-- read-only reference data. After MC-1 introduced the modular checklist
-- editor, manage_templates holders need write access to:
--   ref.service_categories
--   ref.service_types
--   ref.service_templates
--   ref.template_documents
--   ref.checklist_groups
--
-- RLS policies (added in MC-1) continue to gate writes to
-- crm.staff_can(auth.uid(), 'manage_templates'). The broad GRANT here just
-- gets the request past Postgres's table-level privilege check; RLS does the
-- per-row authorisation as before.
-- ============================================================================

GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ref TO authenticated;

-- And so newly-created ref.* tables inherit the same grants without needing
-- a follow-up migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA ref
    GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
