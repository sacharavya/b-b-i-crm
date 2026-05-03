-- ============================================================================
-- Add occurred_at to crm.case_events.
--
-- Until now case_events only carried `created_at` — the moment the row was
-- inserted. The new event-driven advancement flow lets staff record the
-- moment the real-world thing happened (e.g. "biometrics done on Apr 18")
-- separately from the moment they typed it into the CRM. Backdating during
-- the manual data migration of in-flight cases also relies on this.
--
-- The default of now() keeps existing call sites that don't set the value
-- working with the same behaviour they had before.
-- ============================================================================

ALTER TABLE crm.case_events
    ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

UPDATE crm.case_events
   SET occurred_at = created_at
 WHERE occurred_at IS NULL;

ALTER TABLE crm.case_events
    ALTER COLUMN occurred_at SET NOT NULL,
    ALTER COLUMN occurred_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_case_events_case_occurred
    ON crm.case_events (case_id, occurred_at DESC);
