-- ============================================================================
-- Big Bang Immigration CRM - Seed data
-- Runs after migrations on `supabase db reset` (or via `npm run db:reset`).
--
-- Document categories, service types, service templates, and template
-- documents are already inserted by the initial migration (Section 16 of
-- 20260501000001_initial_schema.sql). This file only seeds reference data
-- the migration does not own: countries.
--
-- All inserts use ON CONFLICT DO NOTHING so the file is safe to re-run.
-- ============================================================================

INSERT INTO ref.countries (code, name) VALUES
    -- Primary client base (South Asia)
    ('NP', 'Nepal'),
    ('IN', 'India'),
    ('BD', 'Bangladesh'),
    ('PK', 'Pakistan'),
    ('LK', 'Sri Lanka'),
    ('BT', 'Bhutan'),
    ('MM', 'Myanmar'),
    ('AF', 'Afghanistan'),
    -- Anglosphere (target / common travel)
    ('CA', 'Canada'),
    ('US', 'United States'),
    ('GB', 'United Kingdom'),
    ('AU', 'Australia'),
    ('NZ', 'New Zealand'),
    ('IE', 'Ireland'),
    -- East and Southeast Asia
    ('CN', 'China'),
    ('JP', 'Japan'),
    ('KR', 'South Korea'),
    ('TW', 'Taiwan'),
    ('HK', 'Hong Kong'),
    ('SG', 'Singapore'),
    ('MY', 'Malaysia'),
    ('TH', 'Thailand'),
    ('VN', 'Vietnam'),
    ('ID', 'Indonesia'),
    ('PH', 'Philippines'),
    -- Middle East and GCC
    ('AE', 'United Arab Emirates'),
    ('SA', 'Saudi Arabia'),
    ('QA', 'Qatar'),
    ('OM', 'Oman'),
    ('KW', 'Kuwait'),
    ('BH', 'Bahrain'),
    ('JO', 'Jordan'),
    ('LB', 'Lebanon'),
    ('IL', 'Israel'),
    ('IR', 'Iran'),
    ('IQ', 'Iraq'),
    ('SY', 'Syria'),
    ('TR', 'Turkey'),
    -- Africa
    ('EG', 'Egypt'),
    ('NG', 'Nigeria'),
    ('KE', 'Kenya'),
    ('UG', 'Uganda'),
    ('TZ', 'Tanzania'),
    ('ET', 'Ethiopia'),
    ('GH', 'Ghana'),
    ('ZA', 'South Africa'),
    -- Europe
    ('FR', 'France'),
    ('DE', 'Germany'),
    ('IT', 'Italy'),
    ('ES', 'Spain'),
    ('PT', 'Portugal'),
    ('NL', 'Netherlands'),
    ('BE', 'Belgium'),
    ('LU', 'Luxembourg'),
    ('AT', 'Austria'),
    ('CH', 'Switzerland'),
    ('SE', 'Sweden'),
    ('NO', 'Norway'),
    ('DK', 'Denmark'),
    ('FI', 'Finland'),
    ('IS', 'Iceland'),
    ('GR', 'Greece'),
    ('PL', 'Poland'),
    ('CZ', 'Czech Republic'),
    ('SK', 'Slovakia'),
    ('HU', 'Hungary'),
    ('RO', 'Romania'),
    ('BG', 'Bulgaria'),
    ('UA', 'Ukraine'),
    ('RU', 'Russia'),
    -- Americas (other)
    ('MX', 'Mexico'),
    ('BR', 'Brazil'),
    ('AR', 'Argentina'),
    ('CL', 'Chile'),
    ('CO', 'Colombia'),
    ('PE', 'Peru'),
    ('VE', 'Venezuela'),
    ('CU', 'Cuba'),
    ('JM', 'Jamaica'),
    ('TT', 'Trinidad and Tobago'),
    -- Oceania (other)
    ('FJ', 'Fiji'),
    ('PG', 'Papua New Guinea')
ON CONFLICT (code) DO NOTHING;
