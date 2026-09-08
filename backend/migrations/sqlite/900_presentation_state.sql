-- Proyección local exclusiva del perfil de presentación. No contiene datos institucionales.
CREATE TABLE sigip_presentation_state (
  profile_key TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TEXT NOT NULL,
  CHECK (json_valid(state_json))
) STRICT;
