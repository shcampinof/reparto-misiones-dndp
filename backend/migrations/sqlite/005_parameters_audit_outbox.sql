CREATE TABLE sigip_parameter (
  parameter_id TEXT PRIMARY KEY,
  parameter_key TEXT NOT NULL,
  area_id TEXT REFERENCES sigip_area (area_id),
  service_specialty_id TEXT REFERENCES sigip_service_specialty (service_specialty_id),
  value_type TEXT NOT NULL,
  value TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  evidence_reference TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE INDEX ix_sigip_parameter_lookup ON sigip_parameter (parameter_key, area_id, service_specialty_id, active, effective_from);

CREATE TABLE sigip_audit (
  audit_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  actor_user_id TEXT REFERENCES sigip_user (user_id),
  actor_reference TEXT NOT NULL,
  actor_role_code TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  reason TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  correlation_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  CHECK (json_valid(metadata))
) STRICT;

CREATE TABLE sigip_outbox (
  outbox_id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  occurred_at TEXT NOT NULL,
  available_at TEXT NOT NULL,
  sent_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  CHECK (json_valid(payload))
) STRICT;

CREATE INDEX ix_sigip_audit_entity ON sigip_audit (entity_type, entity_id, occurred_at);
CREATE INDEX ix_sigip_outbox_pending ON sigip_outbox (status, available_at);

CREATE TRIGGER tr_sigip_audit_no_update BEFORE UPDATE ON sigip_audit BEGIN SELECT RAISE(ABORT, 'audit is append-only'); END;
CREATE TRIGGER tr_sigip_audit_no_delete BEFORE DELETE ON sigip_audit BEGIN SELECT RAISE(ABORT, 'audit is append-only'); END;
