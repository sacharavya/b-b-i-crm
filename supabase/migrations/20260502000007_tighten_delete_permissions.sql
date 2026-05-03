-- ============================================================================
-- PERM-1: tighten destructive permissions to super_user only.
--
-- Three permissions are now non-overridable and locked to super_user:
--   delete_cases, delete_clients, delete_checklists
--
-- 1. crm.staff_can() short-circuits these three keys: ignore any
--    permission_overrides entry, fall through to the role table, and only
--    super_user gets TRUE.
--
-- 2. ref.service_types and ref.service_templates split their FOR ALL
--    "manage" policy into separate INSERT/UPDATE (manage_templates) and
--    DELETE (delete_checklists) policies. The service_categories and
--    template_documents policies stay as they were — those tables aren't
--    in scope for the delete tightening.
--
-- 3. crm.cases / crm.clients DELETE policies (added in 20260501000005)
--    already route through staff_can with delete_cases / delete_clients,
--    so they pick up the new logic automatically once the function below
--    is replaced.
-- ============================================================================

-- 1. Replace crm.staff_can with the non-overridable guard.

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

    -- Non-overridable destructive permissions: jump straight to the role
    -- map. Any value in permission_overrides is ignored.
    IF p_permission IN (
        'delete_cases',
        'delete_clients',
        'delete_checklists'
    ) THEN
        RETURN v_role = 'super_user';
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


-- 2. Split ref.service_types and ref.service_templates policies so DELETE
--    can use a tighter permission than INSERT/UPDATE.

DROP POLICY IF EXISTS service_types_manage ON ref.service_types;

CREATE POLICY service_types_insert ON ref.service_types
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));

CREATE POLICY service_types_update ON ref.service_types
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'manage_templates'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));

CREATE POLICY service_types_delete ON ref.service_types
    FOR DELETE
    USING (crm.staff_can(auth.uid(), 'delete_checklists'));


DROP POLICY IF EXISTS service_templates_manage ON ref.service_templates;

CREATE POLICY service_templates_insert ON ref.service_templates
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));

CREATE POLICY service_templates_update ON ref.service_templates
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'manage_templates'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_templates'));

CREATE POLICY service_templates_delete ON ref.service_templates
    FOR DELETE
    USING (crm.staff_can(auth.uid(), 'delete_checklists'));
