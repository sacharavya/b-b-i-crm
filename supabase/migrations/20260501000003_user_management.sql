-- ============================================================================
-- User management v1
--
-- 1. Two new staff_role values: 'super_user' and 'document_officer'
-- 2. Per-staff permission overrides + lifecycle columns on crm.staff
-- 3. crm.staff_can() — single source of truth for RLS permission checks
-- 4. Replace role-string policies with permission-driven policies for money
--    tables; widen the staff write policy to admit super_user and admin
--
-- Related: src/lib/auth/permissions.ts holds the same role-permission map for
-- the application layer. The two are intentionally duplicated — RLS needs
-- the SQL function, the UI needs the TS map. Keep them in sync when changing
-- a role's defaults.
-- ============================================================================

-- 1. Extend the role enum.
-- ALTER TYPE ADD VALUE is allowed inside a transaction since Postgres 12;
-- string-literal comparisons against the new values further down only ever
-- happen via ::text casts so the parser doesn't need to resolve the enum
-- before the migration commits.
ALTER TYPE crm.staff_role ADD VALUE IF NOT EXISTS 'super_user';
ALTER TYPE crm.staff_role ADD VALUE IF NOT EXISTS 'document_officer';


-- 2. Lifecycle + override columns on staff
ALTER TABLE crm.staff
    ADD COLUMN IF NOT EXISTS permission_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS can_be_assigned_cases BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_reset_required_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by_staff UUID REFERENCES crm.staff(id),
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES crm.staff(id);


-- 3. Permission resolution function.
--
-- Returns FALSE when the staff record is missing, soft-deleted, or
-- inactive — so RLS policies can use this as a single drop-in check
-- without separate null-handling.
--
-- Resolution order:
--   a. permission_overrides JSONB[ permission ] if defined
--   b. role default from the CASE map below
--   c. FALSE
--
-- Role defaults mirror src/lib/auth/permissions.ts. When you change one,
-- change the other.
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
            'view_intake_form', 'edit_intake_form'
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


-- 4. Refresh policies
--
-- Staff writes: previously admin-only. Now super_user OR admin can
-- INSERT/UPDATE/DELETE. The application layer additionally enforces that
-- admins cannot create or modify super_user/admin rows — the DB allows it
-- because we don't want to recreate a super_user via a service role outage,
-- but normal app paths should never trip that.
DROP POLICY IF EXISTS staff_write_staff ON crm.staff;

CREATE POLICY staff_super_user_or_admin_write_staff ON crm.staff
    FOR ALL
    USING (crm.current_staff_role()::text IN ('super_user', 'admin'));

-- Money tables: was role-list, now permission-driven via staff_can().
-- view_financials gates the whole table — the more granular permissions
-- (record_payments, edit_invoices) are enforced by server actions.
DROP POLICY IF EXISTS staff_invoices ON crm.invoices;
DROP POLICY IF EXISTS staff_payments ON crm.payments;
DROP POLICY IF EXISTS staff_invoice_lines ON crm.invoice_line_items;

CREATE POLICY money_invoices ON crm.invoices
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'view_financials'));

CREATE POLICY money_payments ON crm.payments
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'view_financials'));

CREATE POLICY money_invoice_lines ON crm.invoice_line_items
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'view_financials'));
