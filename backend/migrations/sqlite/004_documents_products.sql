CREATE TABLE sigip_document (
  document_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES sigip_case (case_id),
  request_id TEXT REFERENCES sigip_request (request_id),
  request_item_id TEXT REFERENCES sigip_request_item (request_item_id),
  document_type TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE sigip_document_version (
  document_version_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES sigip_document (document_id),
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  storage_reference TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  author_user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (document_id, version_number)
) STRICT;

CREATE TABLE sigip_product (
  product_id TEXT PRIMARY KEY,
  request_item_id TEXT NOT NULL REFERENCES sigip_request_item (request_item_id),
  document_id TEXT NOT NULL REFERENCES sigip_document (document_id),
  product_type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE sigip_extension (
  extension_id TEXT PRIMARY KEY,
  original_request_item_id TEXT NOT NULL REFERENCES sigip_request_item (request_item_id),
  resulting_request_item_id TEXT NOT NULL REFERENCES sigip_request_item (request_item_id),
  authorized_by TEXT REFERENCES sigip_user (user_id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (resulting_request_item_id)
) STRICT;

CREATE TABLE sigip_defender_transfer (
  defender_transfer_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES sigip_request (request_id),
  previous_user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  new_user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  authorized_by TEXT REFERENCES sigip_user (user_id),
  reason TEXT NOT NULL,
  occurred_at TEXT NOT NULL
) STRICT;

CREATE TRIGGER tr_sigip_document_version_no_update BEFORE UPDATE ON sigip_document_version BEGIN SELECT RAISE(ABORT, 'document versions are append-only'); END;
CREATE TRIGGER tr_sigip_document_version_no_delete BEFORE DELETE ON sigip_document_version BEGIN SELECT RAISE(ABORT, 'document versions are append-only'); END;
