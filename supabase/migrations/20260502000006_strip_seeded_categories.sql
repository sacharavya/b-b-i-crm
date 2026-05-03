-- ============================================================================
-- Strip seeded categories.
--
-- The 8 seed rows in ref.service_categories (PR, Work Permit, Visitor Visa,
-- etc.) made the empty Checklists landing page feel sparse. MC-7 reframes
-- categories as fully user-created — RCICs build them as needed. This
-- migration wipes the seeds; new categories arrive via the
-- /dashboard/checklists "+ New category" dialog.
--
-- Pre-flight refuses to run if any checklists exist, since DELETE on
-- ref.service_categories cascades through the category_code FK on
-- ref.service_types and would fail at constraint time.
--
-- sub_category was added in 20260502000005; the IF NOT EXISTS guard here is
-- defensive against partial-apply scenarios.
-- ============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM ref.service_types;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot strip categories: % checklists exist. Delete them first or modify this migration.', v_count;
  END IF;
END $$;

DELETE FROM ref.service_categories;

ALTER TABLE ref.service_types
    ADD COLUMN IF NOT EXISTS sub_category TEXT;
