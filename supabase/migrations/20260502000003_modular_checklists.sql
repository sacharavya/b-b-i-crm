-- ============================================================================
-- Modular checklists (MC-1)
--
-- Replaces the hardcoded crm.service_category enum and the two seeded service
-- types (PGWP, Visitor Visa) with a fully data-driven checklist taxonomy:
--
--   ref.service_categories  — high-level grouping (PR, Work Permit, etc.)
--   ref.service_types       — variants under a category (with deactivation
--                             tracking instead of a boolean is_active)
--   ref.service_templates   — versioned blueprint per variant
--   ref.template_documents  — required documents for a template, now grouped
--                             by ref.checklist_groups (same taxonomy as the
--                             OneDrive folder structure)
--   ref.checklist_groups    — group taxonomy used by template_documents
--                             AND by the OneDrive folder provisioning code
--
-- The firm rebuilds variants from scratch via the new template-management UI
-- (MC-2). This migration WIPES existing seed data; the pre-flight check at
-- the top guards against running this against a DB that already has cases
-- pointing at the old service_types.
--
-- Reversibility:
--   Schema changes (new columns, new tables, dropped enum) are reversible
--   via a counter-migration.
--   The data wipe (template_documents, service_templates, service_types,
--   document_categories) is permanent; rebuild via MC-2 UI or a hand-rolled
--   seed file.
--
-- Depends on:
--   20260502000001 — case_events.occurred_at must already exist
--   20260502000002 — service_role schema grants must already be in place
--   for new ref.* tables to be writable from the bootstrap / admin client.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. Pre-flight: refuse to run if ANY rows exist in crm.cases. Existing
--    cases (including soft-deleted ones) point at ref.service_types and
--    ref.service_templates rows that this migration wipes. Soft-deleted
--    cases still hold the service_type_id / service_template_id FKs, so
--    the wipe in step 3 would fail at FK check time — better to catch it
--    here with a clear message than at statement 8 with a generic
--    "violates foreign key constraint".
--
--    To proceed against a non-empty cases table, the operator must either:
--      - TRUNCATE crm.cases CASCADE (irreversible — wipes all case data)
--      - or rewrite this migration to preserve the existing service_types
--        and service_templates rows that are still referenced.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_case_count INT;
  v_active_case_count INT;
BEGIN
  SELECT count(*) INTO v_case_count FROM crm.cases;
  SELECT count(*) INTO v_active_case_count
    FROM crm.cases WHERE deleted_at IS NULL;

  IF v_case_count > 0 THEN
    RAISE EXCEPTION 'Cannot run modular checklist migration: % rows in crm.cases (% active, % soft-deleted). Both kinds hold FK refs to ref.service_templates that this migration wipes. TRUNCATE crm.cases CASCADE to proceed, or rewrite the migration.',
      v_case_count,
      v_active_case_count,
      v_case_count - v_active_case_count;
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 1. ref.service_categories — high-level grouping for service variants
-- ---------------------------------------------------------------------------
CREATE TABLE ref.service_categories (
    code           TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    description    TEXT,
    display_order  INT NOT NULL DEFAULT 100,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ref.service_categories (code, name, display_order) VALUES
    ('pr',            'Permanent Residence', 10),
    ('work_permit',   'Work Permit',          20),
    ('visitor_visa',  'Visitor Visa',         30),
    ('study_permit',  'Study Permit',         40),
    ('pgwp',          'PGWP',                 50),
    ('citizenship',   'Citizenship',          60),
    ('sponsorship',   'Sponsorship',          70),
    ('other',         'Other',                80);


-- ---------------------------------------------------------------------------
-- 2. ref.service_types — restructure
--
--    The pre-flight check above guarantees no rows in crm.cases reference
--    these rows, so the column drops + table wipe in step 3 are safe.
-- ---------------------------------------------------------------------------
ALTER TABLE ref.service_types
    ADD COLUMN category_code              TEXT REFERENCES ref.service_categories(code),
    ADD COLUMN deactivated_at             TIMESTAMPTZ,
    ADD COLUMN scheduled_deactivation_at  TIMESTAMPTZ,
    ADD COLUMN deactivation_reason        TEXT,
    ADD COLUMN deactivated_by             UUID REFERENCES crm.staff(id),
    ADD COLUMN created_by                 UUID REFERENCES crm.staff(id);

ALTER TABLE ref.service_types
    DROP COLUMN category   CASCADE,
    DROP COLUMN is_active  CASCADE;

-- Helper: derives the boolean "is this variant currently usable?" from the
-- two timestamp fields. Use this in app code instead of the dropped is_active
-- column.
CREATE OR REPLACE FUNCTION ref.is_variant_active(p_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    deactivated_at IS NULL
    AND (scheduled_deactivation_at IS NULL
         OR scheduled_deactivation_at > now())
  FROM ref.service_types
  WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION ref.is_variant_active(UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. Wipe existing seed data so the new schema can apply NOT NULL constraints
--    cleanly. Order matters: child tables first.
-- ---------------------------------------------------------------------------
DELETE FROM ref.template_documents;
DELETE FROM ref.service_templates;
DELETE FROM ref.service_types;
DELETE FROM ref.document_categories;  -- replaced by ref.checklist_groups below

ALTER TABLE ref.service_types
    ALTER COLUMN category_code SET NOT NULL;


-- ---------------------------------------------------------------------------
-- 4. Drop the old crm.service_category enum.
--    Nothing references it after the column drop in step 2; CASCADE is a
--    safety net.
-- ---------------------------------------------------------------------------
DROP TYPE IF EXISTS crm.service_category CASCADE;


-- ---------------------------------------------------------------------------
-- 5. ref.checklist_groups — taxonomy shared by template_documents AND the
--    OneDrive folder provisioning. Numeric prefixes in the seed names keep
--    the OneDrive folder list ordered the same way the UI ordered them.
-- ---------------------------------------------------------------------------
CREATE TABLE ref.checklist_groups (
    code           TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    description    TEXT,
    display_order  INT NOT NULL DEFAULT 100,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by     UUID REFERENCES crm.staff(id)
);

INSERT INTO ref.checklist_groups (code, name, display_order) VALUES
    ('identity',             '01 Identity',              10),
    ('education',            '02 Education',             20),
    ('financial',            '03 Financial',             30),
    ('forms',                '04 Forms',                 40),
    ('ircc_submission',      '05 IRCC Submission',       50),
    ('ircc_correspondence',  '06 IRCC Correspondence',   60),
    ('closed_file',          '07 Closed File',           70),
    ('employment',           'Employment',               80),
    ('family',               'Family',                   90),
    ('legal',                'Legal',                   100);


-- ---------------------------------------------------------------------------
-- 6. ref.template_documents — restructure
--
--    Table is empty after step 3, so adding NOT NULL constraints and dropping
--    the old `category` text column are safe.
-- ---------------------------------------------------------------------------
ALTER TABLE ref.template_documents
    ADD COLUMN group_code         TEXT REFERENCES ref.checklist_groups(code),
    ADD COLUMN allowed_file_types TEXT[],
    ADD COLUMN max_file_size_mb   INTEGER,
    ADD COLUMN instructions       TEXT,
    ADD COLUMN expected_quantity  INTEGER NOT NULL DEFAULT 1;

ALTER TABLE ref.template_documents
    DROP COLUMN category CASCADE;

ALTER TABLE ref.template_documents
    ALTER COLUMN group_code SET NOT NULL;


-- ---------------------------------------------------------------------------
-- 7. ref.service_templates — author tracking + notes
-- ---------------------------------------------------------------------------
ALTER TABLE ref.service_templates
    ADD COLUMN created_by UUID REFERENCES crm.staff(id),
    ADD COLUMN notes      TEXT;


-- ---------------------------------------------------------------------------
-- 8. Helper: pick the active template for a variant by date.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ref.active_template_for_variant(
    p_service_type_id UUID
)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT id
  FROM ref.service_templates
  WHERE service_type_id = p_service_type_id
    AND effective_from <= CURRENT_DATE
    AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION ref.active_template_for_variant(UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 10. crm.staff_can — add 'manage_templates' permission.
--
--    Mirrors src/lib/auth/permissions.ts. Defaults:
--      super_user / admin / rcic → TRUE
--      document_officer / reception / readonly / paralegal / staff → FALSE
--
--    Implementation: re-emit the function body identical to migration 003
--    with 'manage_templates' added to the rcic IN list. The super_user
--    branch already returns TRUE for everything, and the admin branch
--    returns TRUE for everything except the three explicit denials, so both
--    of those automatically include the new permission.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm.staff_can(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_role TEXT;
    v_overrides JSONB;
    v_override JSONB;
BEGIN
    SELECT role::text, permission_overrides
      INTO v_role, v_overrides
      FROM crm.staff
     WHERE auth_user_id = p_user_id
       AND deleted_at IS NULL
       AND is_active = TRUE
     LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    v_override := v_overrides -> p_permission;
    IF v_override IS NOT NULL THEN
        RETURN (v_override::text)::boolean;
    END IF;

    RETURN CASE v_role
        WHEN 'super_user' THEN TRUE
        WHEN 'admin' THEN p_permission NOT IN (
            'manage_super_users',
            'manage_admins',
            'change_system_settings'
        )
        WHEN 'rcic' THEN p_permission IN (
            'view_dashboard',
            'view_cases', 'create_cases', 'edit_cases',
            'advance_phase',
            'view_clients', 'create_clients', 'edit_clients',
            'view_documents', 'upload_documents', 'review_documents',
            'view_communications', 'create_communications',
            'view_tasks', 'manage_tasks',
            'view_financials', 'record_payments', 'edit_invoices',
            'view_intake_form', 'edit_intake_form',
            'manage_templates'
        )
        WHEN 'document_officer' THEN p_permission IN (
            'view_dashboard',
            'view_cases', 'create_cases', 'edit_cases',
            'view_clients', 'edit_clients',
            'view_documents', 'upload_documents', 'review_documents',
            'view_communications', 'create_communications',
            'view_tasks', 'manage_tasks',
            'view_intake_form', 'edit_intake_form'
        )
        WHEN 'reception' THEN p_permission IN (
            'view_dashboard',
            'view_cases',
            'view_clients', 'create_clients',
            'view_communications', 'create_communications',
            'view_tasks'
        )
        WHEN 'readonly' THEN p_permission IN (
            'view_dashboard',
            'view_cases',
            'view_clients',
            'view_documents',
            'view_communications',
            'view_tasks',
            'view_financials',
            'view_intake_form'
        )
        ELSE FALSE
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.staff_can(UUID, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 11. RLS policies.
--
--     Pattern across all five tables: any authenticated user can SELECT
--     (template data is reference data the whole app reads); only callers
--     who pass crm.staff_can(auth.uid(), 'manage_templates') can write.
-- ---------------------------------------------------------------------------
ALTER TABLE ref.service_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.service_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.service_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.template_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref.checklist_groups    ENABLE ROW LEVEL SECURITY;

-- service_categories
CREATE POLICY service_categories_select ON ref.service_categories
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY service_categories_manage ON ref.service_categories
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_templates'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));

-- service_types
CREATE POLICY service_types_select ON ref.service_types
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY service_types_manage ON ref.service_types
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_templates'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));

-- service_templates
CREATE POLICY service_templates_select ON ref.service_templates
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY service_templates_manage ON ref.service_templates
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_templates'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));

-- template_documents
CREATE POLICY template_documents_select ON ref.template_documents
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY template_documents_manage ON ref.template_documents
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_templates'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));

-- checklist_groups
CREATE POLICY checklist_groups_select ON ref.checklist_groups
    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY checklist_groups_manage ON ref.checklist_groups
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_templates'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));


-- ---------------------------------------------------------------------------
-- 12. Audit triggers — same audit.log_change() function used by crm.* tables.
--     Drop any prior trigger of the same name so the migration is idempotent
--     against partial-apply scenarios.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_audit_service_categories ON ref.service_categories;
DROP TRIGGER IF EXISTS trg_audit_service_types      ON ref.service_types;
DROP TRIGGER IF EXISTS trg_audit_service_templates  ON ref.service_templates;
DROP TRIGGER IF EXISTS trg_audit_template_documents ON ref.template_documents;
DROP TRIGGER IF EXISTS trg_audit_checklist_groups   ON ref.checklist_groups;

CREATE TRIGGER trg_audit_service_categories
    AFTER INSERT OR UPDATE OR DELETE ON ref.service_categories
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_service_types
    AFTER INSERT OR UPDATE OR DELETE ON ref.service_types
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_service_templates
    AFTER INSERT OR UPDATE OR DELETE ON ref.service_templates
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_template_documents
    AFTER INSERT OR UPDATE OR DELETE ON ref.template_documents
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_checklist_groups
    AFTER INSERT OR UPDATE OR DELETE ON ref.checklist_groups
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();


-- ---------------------------------------------------------------------------
-- 13. service_role grants on the two newly-created tables.
--
--     ref.service_types / service_templates / template_documents existed
--     before migration 20260502000002 ran, so their service_role grants are
--     already in place via the schema-wide GRANT in that migration. The
--     new tables need explicit grants.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
    ref.service_categories,
    ref.checklist_groups
TO service_role;
