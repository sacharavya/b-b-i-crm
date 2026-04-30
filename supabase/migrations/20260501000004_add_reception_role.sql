-- ============================================================================
-- Add 'reception' to crm.staff_role.
--
-- UM-1 (20260501000003) defined the conceptual role set as
--   super_user, admin, rcic, document_officer, reception, readonly
-- but only added super_user and document_officer to the enum, leaving
-- the original paralegal/staff values in place and never adding
-- reception. UM-2 references reception as a real role so we add it now.
--
-- paralegal and staff stay in the enum (Postgres can't drop enum values
-- without recreating the type). They're treated as legacy in the
-- application layer and given no permissions.
-- ============================================================================

ALTER TYPE crm.staff_role ADD VALUE IF NOT EXISTS 'reception';
