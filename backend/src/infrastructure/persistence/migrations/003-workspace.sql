CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, area TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0), payload TEXT NOT NULL CHECK(json_valid(payload))
) STRICT;
CREATE INDEX IF NOT EXISTS drafts_owner_area ON drafts(owner_id, area);
CREATE TABLE IF NOT EXISTS support_document_versions (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES request_items(id),
  document_id TEXT NOT NULL, version INTEGER NOT NULL CHECK (version > 0),
  payload TEXT NOT NULL CHECK(json_valid(payload)), UNIQUE(document_id, version)
) STRICT;
CREATE TRIGGER IF NOT EXISTS support_no_update BEFORE UPDATE ON support_document_versions
BEGIN SELECT RAISE(ABORT, 'support versions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS support_no_delete BEFORE DELETE ON support_document_versions
BEGIN SELECT RAISE(ABORT, 'support versions are immutable'); END;
