CREATE TABLE IF NOT EXISTS assignments (
  item_id TEXT NOT NULL REFERENCES request_items(id), assigned_at TEXT NOT NULL,
  assignee_id TEXT, payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(item_id, assigned_at)
) STRICT;
CREATE TABLE IF NOT EXISTS person_requests (
  request_id TEXT NOT NULL REFERENCES requests(id), submission_version INTEGER NOT NULL,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0), payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(request_id, submission_version, ordinal)
) STRICT;
CREATE TABLE IF NOT EXISTS intake_documents (
  request_id TEXT NOT NULL REFERENCES requests(id), submission_version INTEGER NOT NULL,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0), payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(request_id, submission_version, ordinal)
) STRICT;
CREATE TRIGGER IF NOT EXISTS intake_no_update BEFORE UPDATE ON intake_documents
BEGIN SELECT RAISE(ABORT, 'intake versions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS intake_no_delete BEFORE DELETE ON intake_documents
BEGIN SELECT RAISE(ABORT, 'intake versions are immutable'); END;
