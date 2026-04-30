-- ============================================================================
-- Big Bang Immigration CRM - Database Schema v1
-- Target: Supabase Postgres, ca-central-1
-- Author: Saurav Acharya / Gen Z Data Labs
-- Updated: 2026-04-27 to reflect MD's six-phase model and v1 scope
-- ============================================================================
--
-- Changes from v0.1:
--   1. Case status enum aligned with MD's six-phase model
--   2. Payment gate logic via crm.can_advance_phase() function
--   3. Retainer minimum field on cases
--   4. Intake form supporting tables (family, education, employment, travel,
--      addresses) and background-questions JSONB on clients
--   5. Seed data for PGWP and Visitor Visa service templates
--
-- Design principles (unchanged):
--   - Schema-separated by concern (crm, audit, files, portal, ref)
--   - Soft delete everywhere via deleted_at timestamp
--   - Immutable case events
--   - Versioned service templates
--   - Full audit log on writes to regulated tables
--   - RLS enforced, deny-by-default
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS files;
CREATE SCHEMA IF NOT EXISTS portal;
CREATE SCHEMA IF NOT EXISTS ref;


-- ============================================================================
-- SECTION 1: REFERENCE DATA
-- ============================================================================

CREATE TABLE ref.countries (
    code          CHAR(2) PRIMARY KEY,
    name          TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE crm.service_category AS ENUM (
    'temporary_resident',
    'permanent_resident',
    'citizenship',
    'sponsorship',
    'appeal_or_review',
    'other'
);

CREATE TABLE ref.service_types (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                  TEXT NOT NULL UNIQUE,
    name                  TEXT NOT NULL,
    category              crm.service_category NOT NULL,
    description           TEXT,
    typical_duration_days INT,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    display_order         INT NOT NULL DEFAULT 100,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service templates: versioned. Existing cases reference the version they
-- were created with; new versions do not retroactively affect open cases.
CREATE TABLE ref.service_templates (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type_id   UUID NOT NULL REFERENCES ref.service_types(id),
    version           INT NOT NULL,
    effective_from    DATE NOT NULL,
    effective_to      DATE,
    description       TEXT,
    -- Which intake sections does this service require? Stored as JSONB array
    -- of section codes from the fixed list:
    --   personal, family, education, employment, travel, addresses, background
    required_intake_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(service_type_id, version)
);

-- Required documents per service template, optionally conditional.
-- Conditions are simple text labels matched in the UI (e.g., "if married",
-- "if businessperson", "if sponsor in Canada"). Logic is handled in app code.
CREATE TABLE ref.template_documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_template_id UUID NOT NULL REFERENCES ref.service_templates(id) ON DELETE CASCADE,
    document_code       TEXT NOT NULL,
    document_label      TEXT NOT NULL,
    category            TEXT NOT NULL,
    is_required         BOOLEAN NOT NULL DEFAULT TRUE,
    condition_label     TEXT,
    notes               TEXT,
    display_order       INT NOT NULL DEFAULT 100,
    UNIQUE(service_template_id, document_code)
);

CREATE TABLE ref.document_categories (
    code          TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 100
);


-- ============================================================================
-- SECTION 2: STAFF AND ROLES
-- ============================================================================

CREATE TYPE crm.staff_role AS ENUM (
    'admin',
    'rcic',
    'paralegal',
    'staff',
    'readonly'
);

CREATE TABLE crm.staff (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    first_name       TEXT NOT NULL,
    last_name        TEXT NOT NULL,
    email            CITEXT UNIQUE NOT NULL,
    role             crm.staff_role NOT NULL,
    cicc_license_no  TEXT,
    phone            TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_staff_auth_user ON crm.staff(auth_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_role      ON crm.staff(role)         WHERE deleted_at IS NULL;


-- ============================================================================
-- SECTION 3: CLIENTS (the person, not a case)
-- A client may have multiple cases over time. Personal info and intake data
-- live on the client and are reused across cases.
-- ============================================================================

CREATE TYPE crm.gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE crm.marital_status AS ENUM (
    'single', 'married', 'common_law', 'divorced', 'widowed', 'separated', 'annulled'
);

CREATE TYPE crm.client_status AS ENUM (
    'lead', 'active', 'dormant', 'closed'
);

CREATE TABLE crm.clients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_number       TEXT UNIQUE NOT NULL,
    -- Names
    legal_name_full     TEXT NOT NULL,
    given_names         TEXT,
    family_name         TEXT,
    preferred_name      TEXT,
    -- Contact
    email               CITEXT,
    phone_primary       TEXT,
    phone_whatsapp      TEXT,
    preferred_contact   TEXT,
    preferred_language  TEXT DEFAULT 'en',
    -- Personal
    date_of_birth       DATE,
    gender              crm.gender,
    marital_status      crm.marital_status,
    country_of_birth    CHAR(2) REFERENCES ref.countries(code),
    country_of_citizenship CHAR(2) REFERENCES ref.countries(code),
    country_of_residence   CHAR(2) REFERENCES ref.countries(code),
    -- Current address
    address_line1       TEXT,
    address_line2       TEXT,
    city                TEXT,
    province_state      TEXT,
    postal_code         TEXT,
    country_code        CHAR(2) REFERENCES ref.countries(code),
    -- Education summary (full details in client_education_history)
    years_elementary    INT,
    years_secondary     INT,
    years_post_secondary INT,
    years_trade_other   INT,
    -- Background / Schedule A questions as JSONB.
    -- Shape: { "question_code": { "answer": "yes" | "no", "details": "..." } }
    -- Question codes match a fixed list in app code; values are simple.
    background_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Relationship with firm
    status              crm.client_status NOT NULL DEFAULT 'lead',
    source              TEXT,
    referred_by         TEXT,
    assigned_rcic       UUID REFERENCES crm.staff(id),
    -- Currently handled by (the "who is talking to this client" field for
    -- communication accountability, mentioned by the MD)
    primary_contact_staff UUID REFERENCES crm.staff(id),
    -- Notes
    notes               TEXT,
    custom_fields       JSONB DEFAULT '{}'::jsonb,
    created_by          UUID REFERENCES crm.staff(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_clients_status         ON crm.clients(status)        WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_assigned_rcic  ON crm.clients(assigned_rcic) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_email          ON crm.clients(email)         WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_legal_name_trgm ON crm.clients USING gin (legal_name_full gin_trgm_ops) WHERE deleted_at IS NULL;


-- ============================================================================
-- SECTION 4: INTAKE FORM SUPPORTING TABLES
-- One client, many of each. Mirrors the firm's existing intake documents.
-- ============================================================================

CREATE TYPE crm.relationship_type AS ENUM (
    'father', 'mother', 'spouse', 'common_law_partner',
    'son', 'daughter', 'step_son', 'step_daughter', 'adopted_son', 'adopted_daughter',
    'brother', 'sister', 'half_brother', 'half_sister', 'step_brother', 'step_sister',
    'guardian', 'other'
);

-- Family members (parents, spouse, children, siblings). Mirrors the
-- FAMILY INFORMATION form provided by Big Bang.
CREATE TABLE crm.client_family_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    relationship    crm.relationship_type NOT NULL,
    full_name       TEXT NOT NULL,
    marital_status  crm.marital_status,
    date_of_birth   DATE,
    country_of_birth CHAR(2) REFERENCES ref.countries(code),
    present_address TEXT,
    present_occupation TEXT,
    -- For deceased: location and date of death captured in present_address per
    -- firm convention; flagged here for clarity in queries.
    is_deceased     BOOLEAN NOT NULL DEFAULT FALSE,
    deceased_date   DATE,
    deceased_location TEXT,
    accompanying_to_canada BOOLEAN,
    notes           TEXT,
    display_order   INT NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_members_client ON crm.client_family_members(client_id);


-- Education history (institutions). Years summary lives on clients.
CREATE TABLE crm.client_education_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    date_from       DATE,
    date_to         DATE,
    institution     TEXT NOT NULL,
    field_of_study  TEXT,
    city            TEXT,
    province_state  TEXT,
    country_code    CHAR(2) REFERENCES ref.countries(code),
    notes           TEXT,
    display_order   INT NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_education_client ON crm.client_education_history(client_id);


-- Employment / personal history since age 18. Includes employment, study
-- periods, unemployment, travel, detention; the firm captures all of it for
-- IRCC's Schedule A.
CREATE TABLE crm.client_employment_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    date_from       DATE,
    date_to         DATE,
    is_ongoing      BOOLEAN NOT NULL DEFAULT FALSE,
    occupation      TEXT NOT NULL,
    employer        TEXT,
    city            TEXT,
    province_state  TEXT,
    country_code    CHAR(2) REFERENCES ref.countries(code),
    activity_type   TEXT,  -- 'employment' | 'study' | 'unemployed' | 'travel' | 'other'
    notes           TEXT,
    display_order   INT NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employment_client ON crm.client_employment_history(client_id);


-- Travel history. Firm uses a separate Travel History form.
CREATE TABLE crm.client_travel_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    date_from       DATE NOT NULL,
    date_to         DATE NOT NULL,
    days            INT GENERATED ALWAYS AS (date_to - date_from + 1) STORED,
    city            TEXT,
    country_code    CHAR(2) REFERENCES ref.countries(code),
    purpose         TEXT,
    notes           TEXT,
    display_order   INT NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_travel_client ON crm.client_travel_history(client_id);


-- Address history (10 years or since age 18, whichever more recent).
CREATE TABLE crm.client_address_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    date_from       DATE,
    date_to         DATE,
    address_line    TEXT NOT NULL,
    city            TEXT,
    province_state  TEXT,
    country_code    CHAR(2) REFERENCES ref.countries(code),
    notes           TEXT,
    display_order   INT NOT NULL DEFAULT 100,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_address_client ON crm.client_address_history(client_id);


-- ============================================================================
-- SECTION 5: CASES (the v1 phase model)
-- ============================================================================

-- The MD's six-phase model. Eleven enum values to capture the phase plus
-- specific sub-states for biometrics and decision phase outcomes.
CREATE TYPE crm.case_status AS ENUM (
    'retainer_signed',           -- Phase 1
    'documentation_in_progress', -- Phase 2
    'documentation_review',      -- Phase 3
    'submitted_to_ircc',         -- Phase 4
    'biometrics_pending',        -- Phase 5 (biometrics requested, not yet done)
    'biometrics_completed',      -- Phase 5 (biometrics done, awaiting decision)
    'awaiting_decision',         -- Phase 5/6 boundary (no biometrics required)
    'passport_requested',        -- Phase 6: approved, IRCC asked for passport
    'refused',                   -- Phase 6: refusal
    'additional_info_requested', -- Phase 6: IRCC needs more info
    'closed'                     -- terminal
);

-- Helper function: which logical "phase" (1-6 or closed) does a status belong to?
CREATE OR REPLACE FUNCTION crm.phase_of(status crm.case_status) RETURNS TEXT AS $$
    SELECT CASE status
        WHEN 'retainer_signed'           THEN '1_retainer'
        WHEN 'documentation_in_progress' THEN '2_documentation'
        WHEN 'documentation_review'      THEN '3_review'
        WHEN 'submitted_to_ircc'         THEN '4_submitted'
        WHEN 'biometrics_pending'        THEN '5_biometrics'
        WHEN 'biometrics_completed'      THEN '5_biometrics'
        WHEN 'awaiting_decision'         THEN '5_biometrics'
        WHEN 'passport_requested'        THEN '6_decision'
        WHEN 'refused'                   THEN '6_decision'
        WHEN 'additional_info_requested' THEN '6_decision'
        WHEN 'closed'                    THEN 'closed'
    END;
$$ LANGUAGE SQL IMMUTABLE;


CREATE TABLE crm.cases (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number         TEXT UNIQUE NOT NULL,
    client_id           UUID NOT NULL REFERENCES crm.clients(id),
    service_template_id UUID NOT NULL REFERENCES ref.service_templates(id),
    service_type_id     UUID NOT NULL REFERENCES ref.service_types(id),
    -- Ownership
    assigned_rcic       UUID NOT NULL REFERENCES crm.staff(id),
    assigned_paralegal  UUID REFERENCES crm.staff(id),
    -- Lifecycle
    status              crm.case_status NOT NULL DEFAULT 'retainer_signed',
    opened_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    retained_at         TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ,
    decided_at          TIMESTAMPTZ,
    closed_at           TIMESTAMPTZ,
    -- IRCC identifiers
    ircc_application_number TEXT,
    ircc_uci            TEXT,
    ircc_portal_link    TEXT,
    -- Financials
    quoted_fee_cad      NUMERIC(10,2) NOT NULL,
    -- Retainer minimum: the amount that must be received before the case
    -- can leave Phase 1. Can be a fixed amount or computed by the firm.
    -- If null, any non-zero payment satisfies Gate 1.
    retainer_minimum_cad NUMERIC(10,2),
    government_fee_cad  NUMERIC(10,2),
    -- Conditional flags driving conditional checklist items (e.g., visitor
    -- visa documents that depend on whether applicant is married,
    -- a businessperson, or has a Canadian sponsor).
    conditional_flags   JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- SharePoint folder
    sharepoint_folder_id  TEXT,
    sharepoint_folder_url TEXT,
    -- Metadata
    priority            TEXT DEFAULT 'normal',
    internal_notes      TEXT,
    outcome_notes       TEXT,
    created_by          UUID REFERENCES crm.staff(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cases_client       ON crm.cases(client_id)       WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_status       ON crm.cases(status)          WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_rcic         ON crm.cases(assigned_rcic)   WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_service_type ON crm.cases(service_type_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cases_ircc_app_num ON crm.cases(ircc_application_number) WHERE deleted_at IS NULL;


-- Case participants: dependents or co-applicants on a single case.
CREATE TYPE crm.participant_role AS ENUM (
    'principal', 'spouse', 'dependent_child', 'co_applicant', 'sponsor'
);

CREATE TABLE crm.case_participants (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id    UUID NOT NULL REFERENCES crm.cases(id) ON DELETE CASCADE,
    client_id  UUID NOT NULL REFERENCES crm.clients(id),
    role       crm.participant_role NOT NULL,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(case_id, client_id)
);


-- ============================================================================
-- SECTION 6: CASE EVENTS (immutable log)
-- ============================================================================

CREATE TYPE crm.event_type AS ENUM (
    'status_changed', 'note_added', 'document_received', 'document_requested',
    'document_accepted', 'document_rejected',
    'communication_sent', 'communication_received',
    'fee_quoted', 'fee_collected', 'fee_refunded',
    'deadline_set', 'deadline_met', 'deadline_missed',
    'phase_advance_attempted', 'phase_advance_blocked',
    'ircc_update', 'correction', 'other'
);

CREATE TABLE crm.case_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         UUID NOT NULL REFERENCES crm.cases(id),
    event_type      crm.event_type NOT NULL,
    event_data      JSONB NOT NULL DEFAULT '{}'::jsonb,
    description     TEXT,
    corrects_event  UUID REFERENCES crm.case_events(id),
    visible_to_client BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID REFERENCES crm.staff(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    -- No updated_at, no deleted_at. Events are immutable.
);

CREATE INDEX idx_case_events_case ON crm.case_events(case_id, created_at DESC);
CREATE INDEX idx_case_events_type ON crm.case_events(event_type);


-- ============================================================================
-- SECTION 7: TASKS AND DEADLINES
-- ============================================================================

CREATE TYPE crm.task_type AS ENUM (
    'document_collection', 'form_completion', 'review_required', 'submission',
    'biometrics_appointment', 'medical_exam', 'ircc_response', 'follow_up_client',
    'permit_expiry_alert', 'language_test_expiry', 'eca_expiry',
    'custom'
);

CREATE TYPE crm.task_status AS ENUM ('open', 'in_progress', 'blocked', 'done', 'cancelled');

CREATE TABLE crm.tasks (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id           UUID REFERENCES crm.cases(id) ON DELETE CASCADE,
    client_id         UUID REFERENCES crm.clients(id),
    task_type         crm.task_type NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    due_date          DATE,
    due_at            TIMESTAMPTZ,
    status            crm.task_status NOT NULL DEFAULT 'open',
    priority          TEXT DEFAULT 'normal',
    assigned_to       UUID REFERENCES crm.staff(id),
    completed_at      TIMESTAMPTZ,
    completed_by      UUID REFERENCES crm.staff(id),
    alert_days_before INT[] DEFAULT ARRAY[90,60,30,14,7,1],
    alerts_sent_at    TIMESTAMPTZ[] DEFAULT '{}',
    created_by        UUID REFERENCES crm.staff(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_tasks_case      ON crm.tasks(case_id)      WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_client    ON crm.tasks(client_id)    WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assigned  ON crm.tasks(assigned_to)  WHERE deleted_at IS NULL AND status IN ('open','in_progress');
CREATE INDEX idx_tasks_due       ON crm.tasks(due_date)     WHERE deleted_at IS NULL AND status IN ('open','in_progress');


-- ============================================================================
-- SECTION 8: DOCUMENTS (metadata; files live in SharePoint)
-- ============================================================================

CREATE TYPE files.document_status AS ENUM (
    'requested', 'uploaded', 'under_review', 'accepted', 'rejected', 'superseded'
);

CREATE TABLE files.documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id             UUID REFERENCES crm.cases(id) ON DELETE CASCADE,
    client_id           UUID REFERENCES crm.clients(id),
    -- Matches ref.template_documents.document_code when applicable
    document_code       TEXT,
    display_name        TEXT NOT NULL,
    category            TEXT,
    -- SharePoint reference
    sharepoint_drive_id TEXT,
    sharepoint_item_id  TEXT,
    sharepoint_web_url  TEXT,
    file_name           TEXT,
    file_size_bytes     BIGINT,
    mime_type           TEXT,
    -- Versioning
    supersedes          UUID REFERENCES files.documents(id),
    version_number      INT NOT NULL DEFAULT 1,
    -- Status
    status              files.document_status NOT NULL DEFAULT 'uploaded',
    reviewed_by         UUID REFERENCES crm.staff(id),
    reviewed_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    -- Metadata
    uploaded_by_staff   UUID REFERENCES crm.staff(id),
    uploaded_by_client  BOOLEAN NOT NULL DEFAULT FALSE,
    document_date       DATE,
    expiry_date         DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,
    CHECK (case_id IS NOT NULL OR client_id IS NOT NULL)
);

CREATE INDEX idx_documents_case   ON files.documents(case_id)     WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_client ON files.documents(client_id)   WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_status ON files.documents(status)      WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_expiry ON files.documents(expiry_date) WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;


-- ============================================================================
-- SECTION 9: COMMUNICATIONS LOG (manual in v1; automated channels in phase 2)
-- ============================================================================

CREATE TYPE crm.communication_channel AS ENUM (
    'email', 'phone_call', 'whatsapp', 'sms', 'in_person',
    'instagram', 'facebook_messenger', 'portal_message', 'letter', 'other'
);

CREATE TYPE crm.communication_direction AS ENUM ('inbound', 'outbound');

CREATE TABLE crm.communications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id         UUID REFERENCES crm.cases(id),
    client_id       UUID REFERENCES crm.clients(id),
    channel         crm.communication_channel NOT NULL,
    direction       crm.communication_direction NOT NULL,
    subject         TEXT,
    body            TEXT,
    summary         TEXT,
    -- Email-specific (used in phase 2 when Graph email sync is added)
    email_message_id TEXT,
    from_address    TEXT,
    to_addresses    TEXT[],
    cc_addresses    TEXT[],
    -- Attachments (files.documents IDs)
    attachment_ids  UUID[],
    -- Metadata
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    handled_by      UUID REFERENCES crm.staff(id),
    logged_by       UUID REFERENCES crm.staff(id),
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    CHECK (case_id IS NOT NULL OR client_id IS NOT NULL)
);

CREATE INDEX idx_comms_case      ON crm.communications(case_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comms_client    ON crm.communications(client_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comms_channel   ON crm.communications(channel) WHERE deleted_at IS NULL;


-- ============================================================================
-- SECTION 10: INVOICES AND PAYMENTS
-- v1: lightweight tracking only. No payment processor integration, no tax
-- handling, no trust accounting. Those are deferred.
-- ============================================================================

CREATE TYPE crm.invoice_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'void', 'overdue');

CREATE TABLE crm.invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number  TEXT UNIQUE NOT NULL,
    case_id         UUID REFERENCES crm.cases(id),
    client_id       UUID NOT NULL REFERENCES crm.clients(id),
    issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE,
    subtotal_cad    NUMERIC(10,2) NOT NULL,
    hst_cad         NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_cad       NUMERIC(10,2) NOT NULL,
    paid_cad        NUMERIC(10,2) NOT NULL DEFAULT 0,
    status          crm.invoice_status NOT NULL DEFAULT 'draft',
    notes           TEXT,
    created_by      UUID REFERENCES crm.staff(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE crm.invoice_line_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID NOT NULL REFERENCES crm.invoices(id) ON DELETE CASCADE,
    description     TEXT NOT NULL,
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price_cad  NUMERIC(10,2) NOT NULL,
    line_total_cad  NUMERIC(10,2) NOT NULL,
    display_order   INT NOT NULL DEFAULT 100
);

CREATE TYPE crm.payment_method AS ENUM (
    'e_transfer', 'stripe', 'bank_transfer', 'cash', 'cheque', 'wire', 'other'
);

CREATE TABLE crm.payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID REFERENCES crm.invoices(id),
    case_id         UUID REFERENCES crm.cases(id),
    client_id       UUID NOT NULL REFERENCES crm.clients(id),
    amount_cad      NUMERIC(10,2) NOT NULL,
    method          crm.payment_method NOT NULL,
    reference       TEXT,
    received_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    is_refund       BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    recorded_by     UUID REFERENCES crm.staff(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_payments_case ON crm.payments(case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_client ON crm.payments(client_id) WHERE deleted_at IS NULL;


-- Helper: total non-refund payments collected against a case
CREATE OR REPLACE FUNCTION crm.case_total_collected(p_case_id UUID) RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(CASE WHEN is_refund THEN -amount_cad ELSE amount_cad END), 0)
    FROM crm.payments
    WHERE case_id = p_case_id AND deleted_at IS NULL;
$$ LANGUAGE SQL STABLE;


-- ============================================================================
-- SECTION 11: PHASE ADVANCEMENT GATES
-- Enforces the MD's two payment rules:
--   Gate 1: cannot leave 'retainer_signed' without retainer minimum received
--   Gate 2: cannot leave 'submitted_to_ircc' for biometrics without full pay
-- ============================================================================

-- Returns (allowed BOOLEAN, reason TEXT). Application code calls this before
-- any UPDATE on cases.status and surfaces the reason in the UI if blocked.
CREATE OR REPLACE FUNCTION crm.can_advance_phase(
    p_case_id UUID,
    p_target_status crm.case_status
) RETURNS TABLE(allowed BOOLEAN, reason TEXT) AS $$
DECLARE
    v_case RECORD;
    v_collected NUMERIC;
    v_retainer_min NUMERIC;
BEGIN
    SELECT * INTO v_case FROM crm.cases WHERE id = p_case_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Case not found';
        RETURN;
    END IF;

    v_collected := crm.case_total_collected(p_case_id);

    -- Gate 1: leaving Phase 1 (retainer_signed) requires retainer received
    IF v_case.status = 'retainer_signed' AND p_target_status <> 'retainer_signed' THEN
        v_retainer_min := COALESCE(v_case.retainer_minimum_cad, 0.01);
        IF v_collected < v_retainer_min THEN
            RETURN QUERY SELECT FALSE,
                format('Retainer payment required before advancing. Received %s of %s CAD.',
                       v_collected::TEXT, v_retainer_min::TEXT);
            RETURN;
        END IF;
    END IF;

    -- Gate 2: leaving Phase 4 (submitted_to_ircc) for biometrics requires full pay
    IF v_case.status = 'submitted_to_ircc'
       AND p_target_status IN ('biometrics_pending', 'biometrics_completed', 'awaiting_decision') THEN
        IF v_collected < v_case.quoted_fee_cad THEN
            RETURN QUERY SELECT FALSE,
                format('Full payment required before biometrics. Outstanding: %s CAD.',
                       (v_case.quoted_fee_cad - v_collected)::TEXT);
            RETURN;
        END IF;
    END IF;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- SECTION 12: AUDIT LOG (unchanged from v0.1)
-- ============================================================================

CREATE TABLE audit.change_log (
    id              BIGSERIAL PRIMARY KEY,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_user_id   UUID,
    actor_staff_id  UUID,
    schema_name     TEXT NOT NULL,
    table_name      TEXT NOT NULL,
    operation       CHAR(1) NOT NULL CHECK (operation IN ('I','U','D')),
    row_id          UUID,
    old_values      JSONB,
    new_values      JSONB,
    changed_columns TEXT[]
);

CREATE INDEX idx_audit_table_row ON audit.change_log(schema_name, table_name, row_id);
CREATE INDEX idx_audit_actor     ON audit.change_log(actor_user_id);
CREATE INDEX idx_audit_occurred  ON audit.change_log(occurred_at DESC);

CREATE OR REPLACE FUNCTION audit.log_change() RETURNS TRIGGER AS $$
DECLARE
    v_actor_user_id UUID := auth.uid();
    v_actor_staff_id UUID;
    v_row_id UUID;
    v_changed TEXT[];
BEGIN
    SELECT id INTO v_actor_staff_id FROM crm.staff WHERE auth_user_id = v_actor_user_id;

    IF TG_OP = 'DELETE' THEN
        v_row_id := (row_to_json(OLD)->>'id')::uuid;
        INSERT INTO audit.change_log(actor_user_id, actor_staff_id, schema_name, table_name, operation, row_id, old_values)
        VALUES (v_actor_user_id, v_actor_staff_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'D', v_row_id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_row_id := (row_to_json(NEW)->>'id')::uuid;
        SELECT array_agg(key) INTO v_changed
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
        INSERT INTO audit.change_log(actor_user_id, actor_staff_id, schema_name, table_name, operation, row_id, old_values, new_values, changed_columns)
        VALUES (v_actor_user_id, v_actor_staff_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'U', v_row_id, to_jsonb(OLD), to_jsonb(NEW), v_changed);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        v_row_id := (row_to_json(NEW)->>'id')::uuid;
        INSERT INTO audit.change_log(actor_user_id, actor_staff_id, schema_name, table_name, operation, row_id, new_values)
        VALUES (v_actor_user_id, v_actor_staff_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'I', v_row_id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_clients
    AFTER INSERT OR UPDATE OR DELETE ON crm.clients
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_cases
    AFTER INSERT OR UPDATE OR DELETE ON crm.cases
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_documents
    AFTER INSERT OR UPDATE OR DELETE ON files.documents
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_communications
    AFTER INSERT OR UPDATE OR DELETE ON crm.communications
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON crm.invoices
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

CREATE TRIGGER trg_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON crm.payments
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();


-- ============================================================================
-- SECTION 13: SEQUENCES AND HUMAN-READABLE IDENTIFIERS
-- ============================================================================

CREATE SEQUENCE crm.seq_case_number START 1;
CREATE SEQUENCE crm.seq_client_number START 1;
CREATE SEQUENCE crm.seq_invoice_number START 1;

CREATE OR REPLACE FUNCTION crm.generate_case_number() RETURNS TEXT AS $$
    SELECT 'BB-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('crm.seq_case_number')::text, 4, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION crm.generate_client_number() RETURNS TEXT AS $$
    SELECT 'BB-C-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('crm.seq_client_number')::text, 4, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION crm.generate_invoice_number() RETURNS TEXT AS $$
    SELECT 'BB-INV-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('crm.seq_invoice_number')::text, 4, '0');
$$ LANGUAGE SQL;


-- ============================================================================
-- SECTION 14: ROW LEVEL SECURITY (4-person team, permissive defaults)
-- ============================================================================

ALTER TABLE crm.clients                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.cases                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.case_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.case_participants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.client_family_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.client_education_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.client_employment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.client_travel_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.client_address_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.tasks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.communications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.invoice_line_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.payments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.staff                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE files.documents              ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION crm.current_staff_role() RETURNS crm.staff_role AS $$
    SELECT role FROM crm.staff WHERE auth_user_id = auth.uid() AND is_active = true AND deleted_at IS NULL;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION crm.current_staff_id() RETURNS UUID AS $$
    SELECT id FROM crm.staff WHERE auth_user_id = auth.uid() AND is_active = true AND deleted_at IS NULL;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- All authenticated staff can read all client data; admin/rcic/paralegal write.
CREATE POLICY staff_read_clients ON crm.clients
    FOR SELECT USING (crm.current_staff_role() IS NOT NULL);
CREATE POLICY staff_write_clients ON crm.clients
    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal'));

CREATE POLICY staff_read_cases ON crm.cases
    FOR SELECT USING (crm.current_staff_role() IS NOT NULL);
CREATE POLICY staff_write_cases ON crm.cases
    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal'));

-- Intake form tables: same pattern
CREATE POLICY staff_rw_family   ON crm.client_family_members    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal','staff'));
CREATE POLICY staff_rw_edu      ON crm.client_education_history FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal','staff'));
CREATE POLICY staff_rw_emp      ON crm.client_employment_history FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal','staff'));
CREATE POLICY staff_rw_travel   ON crm.client_travel_history    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal','staff'));
CREATE POLICY staff_rw_address  ON crm.client_address_history   FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal','staff'));

CREATE POLICY staff_rw_documents ON files.documents
    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal','staff'));

CREATE POLICY staff_rw_comms ON crm.communications
    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal','staff'));

CREATE POLICY staff_rw_tasks ON crm.tasks
    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic','paralegal','staff'));

-- Money: admin and rcic only
CREATE POLICY staff_invoices ON crm.invoices
    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic'));
CREATE POLICY staff_payments ON crm.payments
    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic'));
CREATE POLICY staff_invoice_lines ON crm.invoice_line_items
    FOR ALL USING (crm.current_staff_role() IN ('admin','rcic'));

-- Staff table: admin only writes
CREATE POLICY staff_read_staff ON crm.staff
    FOR SELECT USING (crm.current_staff_role() IS NOT NULL);
CREATE POLICY staff_write_staff ON crm.staff
    FOR ALL USING (crm.current_staff_role() = 'admin');


-- ============================================================================
-- SECTION 15: UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION crm.set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updated_clients   BEFORE UPDATE ON crm.clients   FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER trg_updated_cases     BEFORE UPDATE ON crm.cases     FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER trg_updated_tasks     BEFORE UPDATE ON crm.tasks     FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER trg_updated_staff     BEFORE UPDATE ON crm.staff     FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER trg_updated_invoices  BEFORE UPDATE ON crm.invoices  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER trg_updated_family    BEFORE UPDATE ON crm.client_family_members FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();


-- ============================================================================
-- SECTION 16: SEED DATA
-- The two services we have confirmed checklists for. Other services can be
-- added later as the firm provides their checklists.
-- ============================================================================

-- Document categories used by SharePoint folder structure
INSERT INTO ref.document_categories (code, name, display_order) VALUES
    ('IDENTITY',           '01 Identity',            10),
    ('EDUCATION',          '02 Education',           20),
    ('FINANCIAL',          '03 Financial',           30),
    ('FORMS',              '04 Forms',               40),
    ('IRCC_SUBMISSION',    '05 IRCC Submission',     50),
    ('IRCC_CORRESPONDENCE','06 IRCC Correspondence', 60),
    ('CLOSED_FILE',        '07 Closed File',         70),
    ('EMPLOYMENT',         'Employment',             80),
    ('FAMILY',             'Family',                 90),
    ('LEGAL',              'Legal',                 100);

-- Service types
INSERT INTO ref.service_types (code, name, category, display_order) VALUES
    ('PGWP',           'Post-Graduation Work Permit', 'temporary_resident', 10),
    ('VISITOR_VISA',   'Visitor Visa',                'temporary_resident', 20),
    ('STUDY_PERMIT',   'Study Permit',                'temporary_resident', 30),
    ('WORK_PERMIT_OPEN','Work Permit (Open)',         'temporary_resident', 40),
    ('WORK_PERMIT_LMIA','Work Permit (LMIA)',         'temporary_resident', 50),
    ('PR_EXPRESS',     'PR (Express Entry)',          'permanent_resident', 60),
    ('PR_PNP',         'PR (Provincial Nominee)',     'permanent_resident', 70),
    ('CITIZENSHIP',    'Citizenship',                 'citizenship',        80),
    ('SPONSORSHIP',    'Spousal Sponsorship',         'sponsorship',        90);


-- PGWP template (version 1)
WITH pgwp AS (
    INSERT INTO ref.service_templates (
        service_type_id, version, effective_from, description, required_intake_sections
    )
    SELECT id, 1, '2026-01-01', 'PGWP application, IRCC requirements as of 2026',
           '["personal","family","education","employment","background"]'::jsonb
    FROM ref.service_types WHERE code = 'PGWP'
    RETURNING id
)
INSERT INTO ref.template_documents (
    service_template_id, document_code, document_label, category, is_required, condition_label, display_order
)
SELECT pgwp.id, code, label, category, is_required, condition, display_order
FROM pgwp,
(VALUES
    ('PHOTO',            'Photo (35 mm by 45 mm)',                              'IDENTITY',  TRUE,  NULL,             10),
    ('PASSPORT',         'Passport and visa stamp',                             'IDENTITY',  TRUE,  NULL,             20),
    ('COURSE_COMPLETION','Course completion letter',                            'EDUCATION', TRUE,  NULL,             30),
    ('TRANSCRIPT',       'Official transcript',                                 'EDUCATION', TRUE,  NULL,             40),
    ('STUDY_PERMIT_DOC', 'Study permit',                                        'IDENTITY',  TRUE,  NULL,             50),
    ('WORK_PERMIT_DOC',  'Work permit',                                         'IDENTITY',  FALSE, 'if applicable',  60),
    ('MARRIAGE_CERT',    'Marriage certificate',                                'FAMILY',    FALSE, 'if married',     70),
    ('DIGITAL_SIGNATURE','Digital signature',                                   'FORMS',     TRUE,  NULL,             80),
    ('PRIOR_REFUSALS',   'Record of any visa refusals in any country',          'LEGAL',     TRUE,  NULL,             90),
    ('CONTACT_DETAILS',  'Present address, email, and phone number',            'IDENTITY',  TRUE,  NULL,            100),
    ('WORK_EXP_LETTER',  'Work experience letter',                              'EMPLOYMENT',FALSE, 'if applicable', 110),
    ('LANG_TEST',        'IELTS or PTE result',                                 'EDUCATION', TRUE,  NULL,            120),
    ('PRIOR_APP_INFO',   'Previous application and port of entry information', 'LEGAL',     FALSE, 'if prior refusal', 130),
    ('POE_PREFERENCE',   'Port of entry preference (Toronto or Montreal)',     'FORMS',     TRUE,  NULL,            140),
    ('MARITAL_STATUS',   'Marital status (single or married)',                  'FORMS',     TRUE,  NULL,            150)
) AS t(code, label, category, is_required, condition, display_order);


-- Visitor Visa template (version 1)
WITH vv AS (
    INSERT INTO ref.service_templates (
        service_type_id, version, effective_from, description, required_intake_sections
    )
    SELECT id, 1, '2026-01-01', 'Visitor Visa application, IRCC requirements as of 2026',
           '["personal","family","travel","background"]'::jsonb
    FROM ref.service_types WHERE code = 'VISITOR_VISA'
    RETURNING id
)
INSERT INTO ref.template_documents (
    service_template_id, document_code, document_label, category, is_required, condition_label, display_order
)
SELECT vv.id, code, label, category, is_required, condition, display_order
FROM vv,
(VALUES
    -- Standard items
    ('PASSPORT_PA',      'Passport of principal applicant',           'IDENTITY',  TRUE,  NULL,                  10),
    ('RELATIONSHIP_CERT','Relationship certificate',                  'FAMILY',    TRUE,  NULL,                  20),
    ('TAX_VERIFICATION', 'Tax verification',                          'FINANCIAL', TRUE,  NULL,                  30),
    ('PROPERTY_VAL',     'Property valuation',                        'FINANCIAL', TRUE,  NULL,                  40),
    ('MARRIAGE_CERT',    'Marriage certificate',                      'FAMILY',    FALSE, 'if married',          50),
    ('BANK_BALANCE',     'Bank balance certificate (15 to 20 lakhs)', 'FINANCIAL', TRUE,  NULL,                  60),
    ('BANK_STATEMENTS',  'Bank statements (last 4 months)',           'FINANCIAL', TRUE,  NULL,                  70),
    ('LAND_OWNERSHIP',   'Land ownership certificate (Nepali and English)', 'FINANCIAL', TRUE, NULL,             80),
    ('LAND_TAX',         'Land tax paid receipt',                     'FINANCIAL', TRUE,  NULL,                  90),
    ('CITIZENSHIP_CERT', 'Citizenship certificate',                   'IDENTITY',  TRUE,  NULL,                 100),
    ('PHOTO',            'Photo (35 mm by 45 mm)',                    'IDENTITY',  TRUE,  NULL,                 110),
    ('FEES',             'Visa application and biometrics fees',      'FORMS',     TRUE,  NULL,                 120),
    ('ITINERARY',        'Itinerary booking',                         'FORMS',     FALSE, 'if possible',        130),
    ('INCOME_CERT',      'Annual income certificate',                 'FINANCIAL', TRUE,  NULL,                 140),
    ('VISA_PAGES',       'Visa pages',                                'IDENTITY',  FALSE, 'if applicable',      150),
    ('DIGITAL_SIGNATURE','Digital signature',                         'FORMS',     TRUE,  NULL,                 160),
    ('POLICE_CLEARANCE', 'Police clearance',                          'LEGAL',     TRUE,  NULL,                 170),
    -- Conditional: if businessperson
    ('BUSINESS_CERT',    'Business certificate',                      'FINANCIAL', TRUE,  'if businessperson',  180),
    ('PAN_CERT',         'PAN certificate',                           'FINANCIAL', TRUE,  'if businessperson',  190),
    ('TAX_CLEARANCE',    'Tax clearance letter',                      'FINANCIAL', TRUE,  'if businessperson',  200),
    ('AUDIT_REPORT',     'Audit report',                              'FINANCIAL', TRUE,  'if businessperson',  210),
    -- Conditional: if Canadian sponsor
    ('INVITATION_LETTER','Invitation letter',                         'FAMILY',    TRUE,  'if Canadian sponsor', 220),
    ('SPONSOR_STATUS',   'Sponsor passport, PR card, or study permit','FAMILY',    TRUE,  'if Canadian sponsor', 230),
    ('SPONSOR_BANK',     'Sponsor bank balance certificate with statements', 'FINANCIAL', TRUE, 'if Canadian sponsor', 240),
    ('SPONSOR_JOB',      'Sponsor job letter',                        'FAMILY',    TRUE,  'if Canadian sponsor', 250),
    ('SPONSOR_PAYSLIPS', 'Two recent pay slips of sponsor',           'FAMILY',    TRUE,  'if Canadian sponsor', 260)
) AS t(code, label, category, is_required, condition, display_order);


-- ============================================================================
-- END OF SCHEMA v1
-- ============================================================================
