CREATE TABLE sigip_assignment_decision (
  assignment_decision_id TEXT PRIMARY KEY,
  request_item_id TEXT NOT NULL REFERENCES sigip_request_item (request_item_id),
  policy_version TEXT NOT NULL,
  result_code TEXT NOT NULL,
  selected_user_id TEXT REFERENCES sigip_user (user_id),
  tie_break_rule TEXT,
  explanation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (json_valid(explanation))
) STRICT;

CREATE TABLE sigip_decision_candidate (
  decision_candidate_id TEXT PRIMARY KEY,
  assignment_decision_id TEXT NOT NULL REFERENCES sigip_assignment_decision (assignment_decision_id),
  user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  eligible INTEGER NOT NULL CHECK (eligible IN (0, 1)),
  ranking INTEGER,
  metrics TEXT NOT NULL,
  UNIQUE (assignment_decision_id, user_id),
  CHECK (json_valid(metrics))
) STRICT;

CREATE TABLE sigip_candidate_exclusion (
  candidate_exclusion_id TEXT PRIMARY KEY,
  decision_candidate_id TEXT NOT NULL REFERENCES sigip_decision_candidate (decision_candidate_id),
  rule_code TEXT NOT NULL,
  explanation TEXT NOT NULL,
  UNIQUE (decision_candidate_id, rule_code)
) STRICT;

CREATE TABLE sigip_assignment (
  assignment_id TEXT PRIMARY KEY,
  request_item_id TEXT NOT NULL REFERENCES sigip_request_item (request_item_id),
  assignment_decision_id TEXT REFERENCES sigip_assignment_decision (assignment_decision_id),
  responsible_user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  assignment_type TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  current INTEGER NOT NULL DEFAULT 1 CHECK (current IN (0, 1)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  assigned_at TEXT NOT NULL,
  ended_at TEXT,
  reason TEXT NOT NULL,
  authorized_by TEXT REFERENCES sigip_user (user_id),
  CHECK ((current = 1 AND ended_at IS NULL) OR current = 0)
) STRICT;

CREATE UNIQUE INDEX ux_sigip_current_assignment ON sigip_assignment (request_item_id) WHERE current = 1;

CREATE TABLE sigip_assignment_history (
  assignment_history_id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES sigip_assignment (assignment_id),
  request_item_id TEXT NOT NULL REFERENCES sigip_request_item (request_item_id),
  action TEXT NOT NULL,
  responsible_user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  previous_responsible_user_id TEXT REFERENCES sigip_user (user_id),
  actor_user_id TEXT REFERENCES sigip_user (user_id),
  actor_reference TEXT NOT NULL,
  reason TEXT NOT NULL,
  support_reference TEXT,
  occurred_at TEXT NOT NULL
) STRICT;

CREATE TABLE sigip_state_transition (
  state_transition_id TEXT PRIMARY KEY,
  request_item_id TEXT NOT NULL REFERENCES sigip_request_item (request_item_id),
  area_id TEXT NOT NULL REFERENCES sigip_area (area_id),
  previous_state TEXT,
  new_state TEXT NOT NULL,
  actor_user_id TEXT REFERENCES sigip_user (user_id),
  actor_reference TEXT NOT NULL,
  actor_role_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  support_document_id TEXT,
  occurred_at TEXT NOT NULL
) STRICT;

CREATE TABLE sigip_novelty (
  novelty_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES sigip_user (user_id),
  novelty_type_code TEXT NOT NULL,
  authorized_by TEXT NOT NULL REFERENCES sigip_user (user_id),
  blocks_new_assignments INTEGER NOT NULL CHECK (blocks_new_assignments IN (0, 1)),
  reason TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
) STRICT;

CREATE INDEX ix_sigip_assignment_history_item ON sigip_assignment_history (request_item_id, occurred_at);
CREATE INDEX ix_sigip_state_transition_item ON sigip_state_transition (request_item_id, occurred_at);

CREATE TRIGGER tr_sigip_assignment_history_no_update BEFORE UPDATE ON sigip_assignment_history BEGIN SELECT RAISE(ABORT, 'assignment history is append-only'); END;
CREATE TRIGGER tr_sigip_assignment_history_no_delete BEFORE DELETE ON sigip_assignment_history BEGIN SELECT RAISE(ABORT, 'assignment history is append-only'); END;
CREATE TRIGGER tr_sigip_state_transition_no_update BEFORE UPDATE ON sigip_state_transition BEGIN SELECT RAISE(ABORT, 'state transitions are append-only'); END;
CREATE TRIGGER tr_sigip_state_transition_no_delete BEFORE DELETE ON sigip_state_transition BEGIN SELECT RAISE(ABORT, 'state transitions are append-only'); END;
CREATE TRIGGER tr_sigip_assignment_decision_no_update BEFORE UPDATE ON sigip_assignment_decision BEGIN SELECT RAISE(ABORT, 'assignment decisions are append-only'); END;
CREATE TRIGGER tr_sigip_assignment_decision_no_delete BEFORE DELETE ON sigip_assignment_decision BEGIN SELECT RAISE(ABORT, 'assignment decisions are append-only'); END;
CREATE TRIGGER tr_sigip_decision_candidate_no_update BEFORE UPDATE ON sigip_decision_candidate BEGIN SELECT RAISE(ABORT, 'decision candidates are append-only'); END;
CREATE TRIGGER tr_sigip_decision_candidate_no_delete BEFORE DELETE ON sigip_decision_candidate BEGIN SELECT RAISE(ABORT, 'decision candidates are append-only'); END;
CREATE TRIGGER tr_sigip_candidate_exclusion_no_update BEFORE UPDATE ON sigip_candidate_exclusion BEGIN SELECT RAISE(ABORT, 'candidate exclusions are append-only'); END;
CREATE TRIGGER tr_sigip_candidate_exclusion_no_delete BEFORE DELETE ON sigip_candidate_exclusion BEGIN SELECT RAISE(ABORT, 'candidate exclusions are append-only'); END;
