
-- pgcrypto provides gen_random_uuid(). Built into PG 13+, but must be enabled.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS databridge;

SET search_path TO databridge, public;

-- ----------------------------------------------------------------------------
-- Utility: trigger function that auto-updates updated_at on row modification.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION databridge.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- legacy_accounts — source of truth on the external side.
-- external_id mirrors Salesforce Account.Id once synced (18-char SF ID).
-- ----------------------------------------------------------------------------
CREATE TABLE databridge.legacy_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     VARCHAR(18) UNIQUE,
    name            VARCHAR(255) NOT NULL,
    industry        VARCHAR(100),
    annual_revenue  NUMERIC(18, 2),
    billing_city    VARCHAR(100),
    sync_status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (sync_status IN ('pending', 'synced', 'error')),
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_legacy_accounts_updated_at
    BEFORE UPDATE ON databridge.legacy_accounts
    FOR EACH ROW EXECUTE FUNCTION databridge.set_updated_at();

CREATE INDEX idx_legacy_accounts_sync_status ON databridge.legacy_accounts(sync_status);
CREATE INDEX idx_legacy_accounts_updated_at  ON databridge.legacy_accounts(updated_at DESC);

-- ----------------------------------------------------------------------------
-- legacy_contacts — children of legacy_accounts.
-- FK uses external_id, because that's what Salesforce will know.
-- ----------------------------------------------------------------------------
CREATE TABLE databridge.legacy_contacts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id           VARCHAR(18) UNIQUE,
    account_external_id   VARCHAR(18)
                          REFERENCES databridge.legacy_accounts(external_id)
                          ON DELETE SET NULL,
    first_name            VARCHAR(100),
    last_name             VARCHAR(100) NOT NULL,
    email                 VARCHAR(255),
    sync_status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (sync_status IN ('pending', 'synced', 'error')),
    last_synced_at        TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_legacy_contacts_updated_at
    BEFORE UPDATE ON databridge.legacy_contacts
    FOR EACH ROW EXECUTE FUNCTION databridge.set_updated_at();

CREATE INDEX idx_legacy_contacts_account     ON databridge.legacy_contacts(account_external_id);
CREATE INDEX idx_legacy_contacts_sync_status ON databridge.legacy_contacts(sync_status);

-- ----------------------------------------------------------------------------
-- sync_log — the external mirror of Salesforce Log__c.
-- Every sync operation writes a row here; the React dashboard reads it.
-- ----------------------------------------------------------------------------
CREATE TABLE databridge.sync_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id UUID NOT NULL,
    operation      VARCHAR(50) NOT NULL,
    direction      VARCHAR(20) NOT NULL
                   CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    object_name    VARCHAR(50),
    record_id      VARCHAR(18),
    status         VARCHAR(20) NOT NULL
                   CHECK (status IN ('SUCCESS', 'ERROR', 'IN_PROGRESS')),
    duration_ms    INTEGER,
    error_message  TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_log_correlation ON databridge.sync_log(correlation_id);
CREATE INDEX idx_sync_log_created     ON databridge.sync_log(created_at DESC);
CREATE INDEX idx_sync_log_status      ON databridge.sync_log(status);