CREATE TABLE sigip_area (
  area_id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  UNIQUE (code, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE TABLE sigip_regional (
  regional_id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  UNIQUE (code, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE TABLE sigip_geography (
  geography_id TEXT PRIMARY KEY,
  parent_geography_id TEXT REFERENCES sigip_geography (geography_id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  geography_type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  UNIQUE (geography_type, code, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE TABLE sigip_regional_geography (
  regional_geography_id TEXT PRIMARY KEY,
  regional_id TEXT NOT NULL REFERENCES sigip_regional (regional_id),
  geography_id TEXT NOT NULL REFERENCES sigip_geography (geography_id),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  UNIQUE (regional_id, geography_id, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE TABLE sigip_role (
  role_id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  UNIQUE (code, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE TABLE sigip_user (
  user_id TEXT PRIMARY KEY,
  identity_subject TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE sigip_user_role (
  user_role_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  role_id TEXT NOT NULL REFERENCES sigip_role (role_id),
  area_id TEXT NOT NULL REFERENCES sigip_area (area_id),
  regional_id TEXT REFERENCES sigip_regional (regional_id),
  scope_type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  UNIQUE (user_id, role_id, area_id, regional_id, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE TABLE sigip_service_specialty (
  service_specialty_id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES sigip_area (area_id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  UNIQUE (area_id, code, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE TABLE sigip_territorial_coverage (
  territorial_coverage_id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES sigip_area (area_id),
  service_specialty_id TEXT NOT NULL REFERENCES sigip_service_specialty (service_specialty_id),
  user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  regional_id TEXT REFERENCES sigip_regional (regional_id),
  geography_id TEXT REFERENCES sigip_geography (geography_id),
  included INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
  priority INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  CHECK (regional_id IS NOT NULL OR geography_id IS NOT NULL),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE INDEX ix_sigip_user_role_active ON sigip_user_role (user_id, active);
CREATE INDEX ix_sigip_coverage_lookup ON sigip_territorial_coverage (area_id, service_specialty_id, active);
