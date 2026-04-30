-- ============================================================================
-- Realign RLS policies with the permission model.
--
-- The original schema (20260501000001) hardcoded role lists like
--   ('admin','rcic','paralegal')
-- which excludes super_user (added in 003) and document_officer/reception.
--
-- UM-1 (003) updated the money tables and the staff write policy to use
-- crm.staff_can(), but the remaining operational tables were missed.
-- This migration converts them all to the permission model and adds the
-- previously-missing policies on case_events / case_participants
-- (RLS was enabled there with no policies, so every write was silently
-- denied).
--
-- After this migration:
--   - Every protected table grants access based on a specific permission.
--   - Adding a new role only requires updating the role→permission map
--     in crm.staff_can() and src/lib/auth/permissions.ts.
-- ============================================================================

-- ---------- crm.cases -------------------------------------------------------

DROP POLICY IF EXISTS staff_read_cases ON crm.cases;
DROP POLICY IF EXISTS staff_write_cases ON crm.cases;

CREATE POLICY cases_select ON crm.cases
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_cases'));

CREATE POLICY cases_insert ON crm.cases
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'create_cases'));

CREATE POLICY cases_update ON crm.cases
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'edit_cases'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_cases'));

CREATE POLICY cases_delete ON crm.cases
    FOR DELETE
    USING (crm.staff_can(auth.uid(), 'delete_cases'));


-- ---------- crm.case_events (previously had no policies) --------------------

CREATE POLICY case_events_select ON crm.case_events
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_cases'));

-- INSERT gated on view_cases — any staff who can see cases can append
-- events (advancing phase, recording payment, uploading documents, etc.
-- all need to write the corresponding event). The mutation itself is
-- gated on its own permission via the actions / table policies.
CREATE POLICY case_events_insert ON crm.case_events
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'view_cases'));

-- No update/delete policies: case_events are immutable per design
-- (the audit trail). Corrections go via a new event with corrects_event.


-- ---------- crm.case_participants (previously had no policies) --------------

CREATE POLICY case_participants_select ON crm.case_participants
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_cases'));

CREATE POLICY case_participants_write ON crm.case_participants
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_cases'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_cases'));


-- ---------- crm.clients -----------------------------------------------------

DROP POLICY IF EXISTS staff_read_clients ON crm.clients;
DROP POLICY IF EXISTS staff_write_clients ON crm.clients;

CREATE POLICY clients_select ON crm.clients
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_clients'));

CREATE POLICY clients_insert ON crm.clients
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'create_clients'));

CREATE POLICY clients_update ON crm.clients
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'edit_clients'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_clients'));

CREATE POLICY clients_delete ON crm.clients
    FOR DELETE
    USING (crm.staff_can(auth.uid(), 'delete_clients'));


-- ---------- intake-form supporting tables -----------------------------------

DROP POLICY IF EXISTS staff_rw_family ON crm.client_family_members;
DROP POLICY IF EXISTS staff_rw_edu ON crm.client_education_history;
DROP POLICY IF EXISTS staff_rw_emp ON crm.client_employment_history;
DROP POLICY IF EXISTS staff_rw_travel ON crm.client_travel_history;
DROP POLICY IF EXISTS staff_rw_address ON crm.client_address_history;

-- Family
CREATE POLICY intake_family_select ON crm.client_family_members
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_intake_form'));
CREATE POLICY intake_family_write ON crm.client_family_members
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_intake_form'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_intake_form'));

-- Education
CREATE POLICY intake_edu_select ON crm.client_education_history
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_intake_form'));
CREATE POLICY intake_edu_write ON crm.client_education_history
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_intake_form'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_intake_form'));

-- Employment
CREATE POLICY intake_emp_select ON crm.client_employment_history
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_intake_form'));
CREATE POLICY intake_emp_write ON crm.client_employment_history
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_intake_form'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_intake_form'));

-- Travel
CREATE POLICY intake_travel_select ON crm.client_travel_history
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_intake_form'));
CREATE POLICY intake_travel_write ON crm.client_travel_history
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_intake_form'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_intake_form'));

-- Address
CREATE POLICY intake_address_select ON crm.client_address_history
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_intake_form'));
CREATE POLICY intake_address_write ON crm.client_address_history
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_intake_form'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_intake_form'));


-- ---------- files.documents -------------------------------------------------

DROP POLICY IF EXISTS staff_rw_documents ON files.documents;

CREATE POLICY documents_select ON files.documents
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_documents'));

CREATE POLICY documents_insert ON files.documents
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'upload_documents'));

-- Update covers status changes during review (uploaded → accepted /
-- rejected / superseded). Using review_documents as the gate; the
-- supersede flow runs from server actions that hold review_documents.
CREATE POLICY documents_update ON files.documents
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'review_documents'))
    WITH CHECK (crm.staff_can(auth.uid(), 'review_documents'));


-- ---------- crm.communications ---------------------------------------------

DROP POLICY IF EXISTS staff_rw_comms ON crm.communications;

CREATE POLICY comms_select ON crm.communications
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_communications'));

CREATE POLICY comms_insert ON crm.communications
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'create_communications'));


-- ---------- crm.tasks -------------------------------------------------------

DROP POLICY IF EXISTS staff_rw_tasks ON crm.tasks;

CREATE POLICY tasks_select ON crm.tasks
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_tasks'));

CREATE POLICY tasks_write ON crm.tasks
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_tasks'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_tasks'));
