CREATE TABLE sigip_case (
  case_id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES sigip_area (area_id),
  external_id TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (area_id, external_id)
) STRICT;

CREATE TABLE sigip_request (
  request_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES sigip_case (case_id),
  area_id TEXT NOT NULL REFERENCES sigip_area (area_id),
  requester_user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  year INTEGER,
  sequence INTEGER,
  status TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  UNIQUE (area_id, year, sequence),
  CHECK ((cancelled_at IS NULL AND cancellation_reason IS NULL) OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL))
) STRICT;

CREATE TABLE sigip_request_item (
  request_item_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sigip_request (request_id),
  service_specialty_id TEXT NOT NULL REFERENCES sigip_service_specialty (service_specialty_id),
  regional_id TEXT REFERENCES sigip_regional (regional_id),
  parent_item_id TEXT REFERENCES sigip_request_item (request_item_id),
  child_sequence INTEGER NOT NULL,
  status TEXT NOT NULL,
  due_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  UNIQUE (request_id, child_sequence)
) STRICT;

CREATE TABLE sigip_request_person (
  request_person_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sigip_request (request_id),
  person_reference TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (request_id, person_reference, relationship_type)
) STRICT;

CREATE TABLE sigip_person_relationship (
  person_relationship_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sigip_request (request_id),
  source_request_person_id TEXT NOT NULL REFERENCES sigip_request_person (request_person_id),
  target_request_person_id TEXT NOT NULL REFERENCES sigip_request_person (request_person_id),
  relationship_code TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  CHECK (source_request_person_id <> target_request_person_id),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE INDEX ix_sigip_request_case ON sigip_request (case_id, created_at);
CREATE INDEX ix_sigip_item_status ON sigip_request_item (status, service_specialty_id);
CREATE INDEX ix_sigip_request_person ON sigip_request_person (request_id, active);
