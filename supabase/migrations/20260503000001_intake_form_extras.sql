-- ============================================================================
-- INTAKE-1: Schedule A intake form extras.
--
-- Adds:
--   1. Six BOOLEAN gating columns on crm.clients (nullable = unanswered):
--        has_children, has_siblings, travel_completed,
--        organisations_member, government_position_held,
--        military_service_held
--
--   2. Three new history tables for Schedule A details:
--        crm.client_organisations
--        crm.client_government_positions
--        crm.client_military_services
--
--   3. RLS, audit triggers, updated_at triggers, and explicit
--      service_role grants on the three new tables. Mirrors the
--      pattern from 20260501000005 (intake_*) and 20260501000001
--      (set_updated_at + audit.log_change).
--
-- Safe: purely additive. No data migration; existing clients keep
-- NULL for the new boolean columns until staff answer them.
-- ============================================================================

-- 1. crm.clients gating columns ---------------------------------------------

ALTER TABLE crm.clients
    ADD COLUMN IF NOT EXISTS has_children              BOOLEAN,
    ADD COLUMN IF NOT EXISTS has_siblings              BOOLEAN,
    ADD COLUMN IF NOT EXISTS travel_completed          BOOLEAN,
    ADD COLUMN IF NOT EXISTS organisations_member      BOOLEAN,
    ADD COLUMN IF NOT EXISTS government_position_held  BOOLEAN,
    ADD COLUMN IF NOT EXISTS military_service_held     BOOLEAN;


-- 2. crm.client_organisations -----------------------------------------------

CREATE TABLE IF NOT EXISTS crm.client_organisations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    date_from           DATE,
    date_to             DATE,
    is_ongoing          BOOLEAN NOT NULL DEFAULT FALSE,
    organisation_name   TEXT NOT NULL,
    organisation_type   TEXT,
    position_held       TEXT,
    city                TEXT,
    province_state      TEXT,
    country_code        CHAR(2) REFERENCES ref.countries(code),
    notes               TEXT,
    display_order       INT NOT NULL DEFAULT 100,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_organisations_client
    ON crm.client_organisations(client_id);


-- 3. crm.client_government_positions ----------------------------------------

CREATE TABLE IF NOT EXISTS crm.client_government_positions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    date_from               DATE,
    date_to                 DATE,
    is_ongoing              BOOLEAN NOT NULL DEFAULT FALSE,
    level_of_jurisdiction   TEXT,
    department              TEXT,
    position_held           TEXT,
    city                    TEXT,
    province_state          TEXT,
    country_code            CHAR(2) REFERENCES ref.countries(code),
    notes                   TEXT,
    display_order           INT NOT NULL DEFAULT 100,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_government_positions_client
    ON crm.client_government_positions(client_id);


-- 4. crm.client_military_services -------------------------------------------

CREATE TABLE IF NOT EXISTS crm.client_military_services (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id                   UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    date_from                   DATE,
    date_to                     DATE,
    is_ongoing                  BOOLEAN NOT NULL DEFAULT FALSE,
    country_code                CHAR(2) REFERENCES ref.countries(code),
    branch_name                 TEXT,
    commanding_officer          TEXT,
    military_rank               TEXT,
    active_combat_details       TEXT,
    reason_for_end_of_service   TEXT,
    notes                       TEXT,
    display_order               INT NOT NULL DEFAULT 100,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_military_services_client
    ON crm.client_military_services(client_id);


-- 5. RLS — same shape as the existing intake_* policies in
--    20260501000005: SELECT under view_intake_form, all writes
--    under edit_intake_form.

ALTER TABLE crm.client_organisations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.client_government_positions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.client_military_services     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intake_orgs_select ON crm.client_organisations;
DROP POLICY IF EXISTS intake_orgs_write  ON crm.client_organisations;
CREATE POLICY intake_orgs_select ON crm.client_organisations
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_intake_form'));
CREATE POLICY intake_orgs_write ON crm.client_organisations
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_intake_form'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_intake_form'));

DROP POLICY IF EXISTS intake_gov_select ON crm.client_government_positions;
DROP POLICY IF EXISTS intake_gov_write  ON crm.client_government_positions;
CREATE POLICY intake_gov_select ON crm.client_government_positions
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_intake_form'));
CREATE POLICY intake_gov_write ON crm.client_government_positions
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_intake_form'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_intake_form'));

DROP POLICY IF EXISTS intake_mil_select ON crm.client_military_services;
DROP POLICY IF EXISTS intake_mil_write  ON crm.client_military_services;
CREATE POLICY intake_mil_select ON crm.client_military_services
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_intake_form'));
CREATE POLICY intake_mil_write ON crm.client_military_services
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_intake_form'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_intake_form'));


-- 6. updated_at triggers ----------------------------------------------------

DROP TRIGGER IF EXISTS trg_updated_orgs ON crm.client_organisations;
CREATE TRIGGER trg_updated_orgs
    BEFORE UPDATE ON crm.client_organisations
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_gov ON crm.client_government_positions;
CREATE TRIGGER trg_updated_gov
    BEFORE UPDATE ON crm.client_government_positions
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_mil ON crm.client_military_services;
CREATE TRIGGER trg_updated_mil
    BEFORE UPDATE ON crm.client_military_services
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();


-- 7. audit triggers ---------------------------------------------------------

DROP TRIGGER IF EXISTS trg_audit_orgs ON crm.client_organisations;
CREATE TRIGGER trg_audit_orgs
    AFTER INSERT OR UPDATE OR DELETE ON crm.client_organisations
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

DROP TRIGGER IF EXISTS trg_audit_gov ON crm.client_government_positions;
CREATE TRIGGER trg_audit_gov
    AFTER INSERT OR UPDATE OR DELETE ON crm.client_government_positions
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

DROP TRIGGER IF EXISTS trg_audit_mil ON crm.client_military_services;
CREATE TRIGGER trg_audit_mil
    AFTER INSERT OR UPDATE OR DELETE ON crm.client_military_services
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();


-- 8. Service-role grants. Default privileges in 20260502000002 already
--    cover future tables, but explicit grants here match the spec and
--    are idempotent.

GRANT SELECT, INSERT, UPDATE, DELETE ON crm.client_organisations         TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.client_government_positions  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.client_military_services     TO service_role;
