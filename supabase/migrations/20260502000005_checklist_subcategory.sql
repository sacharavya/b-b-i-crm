-- ============================================================================
-- Add sub_category to ref.service_types.
--
-- Free-text optional sub-grouping under a category. The Checklists landing
-- page renders these as chips on each row; the new-checklist dialog
-- autocompletes from the existing distinct values. No reference table —
-- this is light enough to live as plain text. If sub-categories ever need
-- their own metadata (display order, descriptions), promote to a table
-- in a follow-up migration.
--
-- The audit trigger on ref.service_types (added by MC-1) already captures
-- changes to this column.
-- ============================================================================

ALTER TABLE ref.service_types
    ADD COLUMN IF NOT EXISTS sub_category TEXT;
