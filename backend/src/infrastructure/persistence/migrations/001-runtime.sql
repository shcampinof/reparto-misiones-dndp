CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS runtime_state (
  id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload))
) STRICT;
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY, area TEXT NOT NULL CHECK(area IN ('INVESTIGACION','VICTIMAS')),
  external_id TEXT NOT NULL, UNIQUE(area, external_id)
) STRICT;
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id),
  payload TEXT NOT NULL CHECK(json_valid(payload))
) STRICT;
CREATE TABLE IF NOT EXISTS request_items (
  id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id),
  status TEXT NOT NULL, assignee_id TEXT,
  payload TEXT NOT NULL CHECK(json_valid(payload))
) STRICT;
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES request_items(id),
  version INTEGER NOT NULL CHECK(version > 0),
  payload TEXT NOT NULL CHECK(json_valid(payload)), UNIQUE(item_id, version)
) STRICT;
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES request_items(id),
  payload TEXT NOT NULL CHECK(json_valid(payload))
) STRICT;
CREATE TABLE IF NOT EXISTS audit_events (
  sequence INTEGER PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload))
) STRICT;
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_events
BEGIN SELECT RAISE(ABORT, 'audit is append only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_events
BEGIN SELECT RAISE(ABORT, 'audit is append only'); END;
CREATE TRIGGER IF NOT EXISTS document_no_update BEFORE UPDATE ON document_versions
BEGIN SELECT RAISE(ABORT, 'document versions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS document_no_delete BEFORE DELETE ON document_versions
BEGIN SELECT RAISE(ABORT, 'document versions are immutable'); END;
CREATE INDEX IF NOT EXISTS items_by_assignee ON request_items(assignee_id, status);
CREATE INDEX IF NOT EXISTS items_by_request ON request_items(request_id);
