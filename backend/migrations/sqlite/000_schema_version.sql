CREATE TABLE sigip_schema_version (
  version_id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  applied_by TEXT NOT NULL
) STRICT;
