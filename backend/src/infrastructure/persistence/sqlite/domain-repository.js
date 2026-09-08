import { OptimisticLockError } from "../../../domain/invariants.js";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function bool(value) {
  return value === false ? 0 : 1;
}

function fromBool(value) {
  return Number(value) === 1;
}

function parseJson(value, fallback = {}) {
  return value ? JSON.parse(value) : fallback;
}

export class SqliteDomainRepository {
  constructor(database) {
    this.database = database;
    this.transactionTail = Promise.resolve();
  }

  async transaction(work) {
    const previous = this.transactionTail;
    let release;
    this.transactionTail = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = await work(this);
      this.database.exec("COMMIT");
      return clone(result);
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    } finally {
      release();
    }
  }

  saveArea(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_area (area_id, code, name, active, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(area_id) DO UPDATE SET code=excluded.code, name=excluded.name,
           active=excluded.active, effective_from=excluded.effective_from, effective_to=excluded.effective_to`,
      )
      .run(
        entity.id,
        entity.code,
        entity.name,
        bool(entity.active),
        entity.effectiveFrom,
        entity.effectiveTo,
      );
    return clone(entity);
  }

  saveRole(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_role (role_id, code, name, active, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(role_id) DO UPDATE SET code=excluded.code, name=excluded.name,
           active=excluded.active, effective_from=excluded.effective_from, effective_to=excluded.effective_to`,
      )
      .run(
        entity.id,
        entity.code,
        entity.name,
        bool(entity.active),
        entity.effectiveFrom,
        entity.effectiveTo,
      );
    return clone(entity);
  }

  saveUser(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_user (user_id, identity_subject, display_name, active, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET identity_subject=excluded.identity_subject,
           display_name=excluded.display_name, active=excluded.active`,
      )
      .run(
        entity.id,
        entity.identitySubject,
        entity.displayName,
        bool(entity.active),
        entity.createdAt,
      );
    return clone(entity);
  }

  saveUserScope(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_user_role
          (user_role_id, user_id, role_id, area_id, regional_id, scope_type, active, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_role_id) DO UPDATE SET active=excluded.active,
           regional_id=excluded.regional_id, scope_type=excluded.scope_type,
           effective_from=excluded.effective_from, effective_to=excluded.effective_to`,
      )
      .run(
        entity.id,
        entity.userId,
        entity.roleId,
        entity.areaId,
        entity.regionalId,
        entity.scopeType,
        bool(entity.active),
        entity.effectiveFrom,
        entity.effectiveTo,
      );
    return clone(entity);
  }

  saveRegional(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_regional (regional_id, code, name, active, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(regional_id) DO UPDATE SET code=excluded.code, name=excluded.name,
           active=excluded.active, effective_from=excluded.effective_from, effective_to=excluded.effective_to`,
      )
      .run(
        entity.id,
        entity.code,
        entity.name,
        bool(entity.active),
        entity.effectiveFrom,
        entity.effectiveTo,
      );
    return clone(entity);
  }

  saveService(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_service_specialty
          (service_specialty_id, area_id, code, name, service_type, active, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(service_specialty_id) DO UPDATE SET code=excluded.code, name=excluded.name,
           service_type=excluded.service_type, active=excluded.active,
           effective_from=excluded.effective_from, effective_to=excluded.effective_to`,
      )
      .run(
        entity.id,
        entity.areaId,
        entity.code,
        entity.name,
        entity.kind,
        bool(entity.active),
        entity.effectiveFrom,
        entity.effectiveTo,
      );
    return clone(entity);
  }

  saveCoverage(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_territorial_coverage
          (territorial_coverage_id, area_id, service_specialty_id, user_id, regional_id,
           geography_id, included, priority, active, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(territorial_coverage_id) DO UPDATE SET included=excluded.included,
           priority=excluded.priority, active=excluded.active,
           effective_from=excluded.effective_from, effective_to=excluded.effective_to`,
      )
      .run(
        entity.id,
        entity.areaId,
        entity.serviceId,
        entity.subjectId,
        entity.regionalId,
        entity.geographyId ?? null,
        bool(entity.included),
        entity.priority,
        bool(entity.active),
        entity.effectiveFrom,
        entity.effectiveTo,
      );
    return clone(entity);
  }

  saveCase(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_case (case_id, area_id, external_id, active, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(case_id) DO UPDATE SET external_id=excluded.external_id, active=excluded.active`,
      )
      .run(
        entity.id,
        entity.areaId,
        entity.externalId,
        bool(entity.active),
        entity.createdAt,
      );
    return clone(entity);
  }

  findCaseById(id) {
    const row = this.database
      .prepare("SELECT * FROM sigip_case WHERE case_id = ?")
      .get(id);
    return row
      ? {
          id: row.case_id,
          areaId: row.area_id,
          externalId: row.external_id,
          active: fromBool(row.active),
          createdAt: row.created_at,
        }
      : undefined;
  }

  saveRequest(entity, { expectedVersion = null, synchronize = false } = {}) {
    const existing = this.database
      .prepare("SELECT version FROM sigip_request WHERE request_id = ?")
      .get(entity.id);
    if (!existing) {
      this.database
        .prepare(
          `INSERT INTO sigip_request
           (request_id, case_id, area_id, requester_user_id, year, sequence, status, version, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entity.id,
          entity.caseId,
          entity.areaId,
          entity.requesterUserId,
          entity.year,
          entity.sequence,
          entity.status,
          entity.version ?? 1,
          entity.createdAt,
        );
      return clone(entity);
    }
    const expected = expectedVersion ?? entity.version;
    if (!synchronize && existing.version !== expected) {
      throw new OptimisticLockError("SOLICITUD", entity.id, expected);
    }
    const nextVersion = synchronize ? existing.version + 1 : expected + 1;
    const result = this.database
      .prepare(
        `UPDATE sigip_request SET status = ?, requester_user_id = ?, version = ?
         WHERE request_id = ? AND version = ?`,
      )
      .run(
        entity.status,
        entity.requesterUserId,
        nextVersion,
        entity.id,
        existing.version,
      );
    if (result.changes !== 1) {
      throw new OptimisticLockError("SOLICITUD", entity.id, expected);
    }
    return clone({ ...entity, version: nextVersion });
  }

  findRequestById(id) {
    const row = this.database
      .prepare("SELECT * FROM sigip_request WHERE request_id = ?")
      .get(id);
    return row ? this.#requestFromRow(row) : undefined;
  }

  listRequestsByCaseId(caseId) {
    return this.database
      .prepare(
        "SELECT * FROM sigip_request WHERE case_id = ? ORDER BY created_at",
      )
      .all(caseId)
      .map((row) => this.#requestFromRow(row));
  }

  saveRequestItem(
    entity,
    { expectedVersion = null, synchronize = false } = {},
  ) {
    const existing = this.database
      .prepare(
        "SELECT version FROM sigip_request_item WHERE request_item_id = ?",
      )
      .get(entity.id);
    if (!existing) {
      this.database
        .prepare(
          `INSERT INTO sigip_request_item
           (request_item_id, request_id, service_specialty_id, regional_id, parent_item_id,
            child_sequence, status, due_at, version, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entity.id,
          entity.requestId,
          entity.serviceId,
          entity.regionalId,
          entity.parentItemId,
          entity.childSequence ?? 1,
          entity.status,
          entity.dueAt,
          entity.version ?? 1,
          entity.createdAt,
        );
      return clone(entity);
    }
    const expected = expectedVersion ?? entity.version;
    if (!synchronize && existing.version !== expected) {
      throw new OptimisticLockError("ITEM_SOLICITUD", entity.id, expected);
    }
    const nextVersion = synchronize ? existing.version + 1 : expected + 1;
    const result = this.database
      .prepare(
        `UPDATE sigip_request_item SET status = ?, due_at = ?, version = ?
         WHERE request_item_id = ? AND version = ?`,
      )
      .run(
        entity.status,
        entity.dueAt,
        nextVersion,
        entity.id,
        existing.version,
      );
    if (result.changes !== 1) {
      throw new OptimisticLockError("ITEM_SOLICITUD", entity.id, expected);
    }
    return clone({ ...entity, version: nextVersion });
  }

  findRequestItemById(id) {
    const row = this.database
      .prepare("SELECT * FROM sigip_request_item WHERE request_item_id = ?")
      .get(id);
    return row ? this.#itemFromRow(row) : undefined;
  }

  listRequestItems(requestId) {
    return this.database
      .prepare(
        "SELECT * FROM sigip_request_item WHERE request_id = ? ORDER BY child_sequence",
      )
      .all(requestId)
      .map((row) => this.#itemFromRow(row));
  }

  saveRequestPerson(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_request_person
         (request_person_id, request_id, person_reference, relationship_type, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(request_person_id) DO UPDATE SET person_reference=excluded.person_reference,
           relationship_type=excluded.relationship_type, active=excluded.active`,
      )
      .run(
        entity.id,
        entity.requestId,
        entity.personReference,
        entity.relationshipType,
        bool(entity.active),
        entity.createdAt,
      );
    return clone(entity);
  }

  listRequestPersons(requestId) {
    return this.database
      .prepare(
        "SELECT * FROM sigip_request_person WHERE request_id = ? ORDER BY created_at, request_person_id",
      )
      .all(requestId)
      .map((row) => ({
        id: row.request_person_id,
        requestId: row.request_id,
        personReference: row.person_reference,
        relationshipType: row.relationship_type,
        active: fromBool(row.active),
        createdAt: row.created_at,
      }));
  }

  saveAssignmentDecision(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_assignment_decision
         (assignment_decision_id, request_item_id, policy_version, result_code,
          selected_user_id, tie_break_rule, explanation, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(assignment_decision_id) DO NOTHING`,
      )
      .run(
        entity.id,
        entity.itemId,
        entity.policyVersion,
        entity.resultCode,
        entity.selectedUserId,
        entity.tieBreakRule,
        JSON.stringify(entity.explanation),
        entity.createdAt,
      );
    return clone(entity);
  }

  saveDecisionCandidate(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_decision_candidate
         (decision_candidate_id, assignment_decision_id, user_id, eligible, ranking, metrics)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(decision_candidate_id) DO NOTHING`,
      )
      .run(
        entity.id,
        entity.decisionId,
        entity.userId,
        bool(entity.eligible),
        entity.ranking,
        JSON.stringify(entity.metrics),
      );
    return clone(entity);
  }

  saveCandidateExclusion(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_candidate_exclusion
         (candidate_exclusion_id, decision_candidate_id, rule_code, explanation)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(candidate_exclusion_id) DO NOTHING`,
      )
      .run(entity.id, entity.candidateId, entity.ruleCode, entity.explanation);
    return clone(entity);
  }

  findAssignmentDecisionById(id) {
    const row = this.database
      .prepare(
        "SELECT * FROM sigip_assignment_decision WHERE assignment_decision_id = ?",
      )
      .get(id);
    if (!row) return undefined;
    const candidates = this.database
      .prepare(
        "SELECT * FROM sigip_decision_candidate WHERE assignment_decision_id = ? ORDER BY ranking, decision_candidate_id",
      )
      .all(id)
      .map((candidate) => ({
        id: candidate.decision_candidate_id,
        decisionId: candidate.assignment_decision_id,
        userId: candidate.user_id,
        eligible: fromBool(candidate.eligible),
        ranking: candidate.ranking,
        metrics: parseJson(candidate.metrics),
        exclusions: this.database
          .prepare(
            "SELECT * FROM sigip_candidate_exclusion WHERE decision_candidate_id = ? ORDER BY candidate_exclusion_id",
          )
          .all(candidate.decision_candidate_id)
          .map((entry) => ({
            id: entry.candidate_exclusion_id,
            candidateId: entry.decision_candidate_id,
            ruleCode: entry.rule_code,
            explanation: entry.explanation,
          })),
      }));
    return {
      id: row.assignment_decision_id,
      itemId: row.request_item_id,
      policyVersion: row.policy_version,
      resultCode: row.result_code,
      selectedUserId: row.selected_user_id,
      tieBreakRule: row.tie_break_rule,
      explanation: parseJson(row.explanation),
      createdAt: row.created_at,
      candidates,
    };
  }

  saveAssignment(entity, { expectedVersion = null } = {}) {
    const existing = this.database
      .prepare("SELECT version FROM sigip_assignment WHERE assignment_id = ?")
      .get(entity.id);
    if (!existing) {
      this.database
        .prepare(
          `INSERT INTO sigip_assignment
           (assignment_id, request_item_id, assignment_decision_id, responsible_user_id,
            assignment_type, policy_version, current, version, assigned_at, ended_at, reason, authorized_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entity.id,
          entity.itemId,
          entity.decisionId,
          entity.assigneeId,
          entity.assignmentType,
          entity.policyVersion,
          bool(entity.current),
          entity.version ?? 1,
          entity.assignedAt,
          entity.endedAt,
          entity.reason,
          entity.authorizedBy,
        );
      return clone(entity);
    }
    const expected = expectedVersion ?? entity.version;
    if (existing.version !== expected) {
      throw new OptimisticLockError("ASIGNACION", entity.id, expected);
    }
    const nextVersion = expected + 1;
    const result = this.database
      .prepare(
        `UPDATE sigip_assignment SET current=?, ended_at=?, reason=?, version=?
         WHERE assignment_id=? AND version=?`,
      )
      .run(
        bool(entity.current),
        entity.endedAt,
        entity.reason,
        nextVersion,
        entity.id,
        expected,
      );
    if (result.changes !== 1) {
      throw new OptimisticLockError("ASIGNACION", entity.id, expected);
    }
    return clone({ ...entity, version: nextVersion });
  }

  currentAssignmentForItem(itemId) {
    const row = this.database
      .prepare(
        "SELECT * FROM sigip_assignment WHERE request_item_id = ? AND current = 1",
      )
      .get(itemId);
    return row ? this.#assignmentFromRow(row) : undefined;
  }

  appendAssignmentHistory(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_assignment_history
         (assignment_history_id, assignment_id, request_item_id, action,
          responsible_user_id, previous_responsible_user_id, actor_user_id,
          actor_reference, reason, support_reference, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entity.id,
        entity.assignmentId,
        entity.itemId,
        entity.action,
        entity.assigneeId,
        entity.previousAssigneeId,
        this.#knownUser(entity.actorId) ? entity.actorId : null,
        entity.actorId,
        entity.reason,
        entity.supportReference,
        entity.occurredAt,
      );
    return clone(entity);
  }

  assignmentHistoryForItem(itemId) {
    return this.database
      .prepare(
        "SELECT * FROM sigip_assignment_history WHERE request_item_id = ? ORDER BY occurred_at",
      )
      .all(itemId)
      .map((row) => ({
        id: row.assignment_history_id,
        assignmentId: row.assignment_id,
        itemId: row.request_item_id,
        action: row.action,
        assigneeId: row.responsible_user_id,
        previousAssigneeId: row.previous_responsible_user_id,
        actorId: row.actor_user_id ?? row.actor_reference,
        reason: row.reason,
        supportReference: row.support_reference,
        occurredAt: row.occurred_at,
      }));
  }

  saveStateTransition(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_state_transition
         (state_transition_id, request_item_id, area_id, previous_state, new_state,
          actor_user_id, actor_reference, actor_role_code, reason, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entity.id,
        entity.itemId,
        entity.areaCode,
        entity.previousState,
        entity.newState,
        this.#knownUser(entity.actorId) ? entity.actorId : null,
        entity.actorId,
        entity.actorRole,
        entity.reason,
        entity.occurredAt,
      );
    return clone(entity);
  }

  listStateTransitionsForItem(itemId) {
    return this.database
      .prepare(
        "SELECT * FROM sigip_state_transition WHERE request_item_id = ? ORDER BY occurred_at, state_transition_id",
      )
      .all(itemId)
      .map((row) => ({
        id: row.state_transition_id,
        itemId: row.request_item_id,
        areaCode: row.area_id,
        previousState: row.previous_state,
        newState: row.new_state,
        actorId: row.actor_user_id ?? row.actor_reference,
        actorRole: row.actor_role_code,
        reason: row.reason,
        occurredAt: row.occurred_at,
      }));
  }

  appendAudit(entity) {
    this.database
      .prepare(
        `INSERT INTO sigip_audit
         (audit_id, entity_type, entity_id, operation, actor_user_id, actor_reference,
          actor_role_code, previous_state, new_state, reason, occurred_at, correlation_id, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entity.id,
        entity.entityType,
        entity.entityId,
        entity.operation,
        this.#knownUser(entity.actorId) ? entity.actorId : null,
        entity.actorReference,
        entity.actorRole,
        entity.previousState,
        entity.newState,
        entity.reason,
        entity.occurredAt,
        entity.correlationId,
        JSON.stringify(entity.metadata ?? {}),
      );
    return clone(entity);
  }

  listAudit(filters = {}) {
    const conditions = [];
    const values = [];
    if (filters.entityType) {
      conditions.push("entity_type = ?");
      values.push(filters.entityType);
    }
    if (filters.entityId) {
      conditions.push("entity_id = ?");
      values.push(filters.entityId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.database
      .prepare(
        `SELECT * FROM sigip_audit ${where} ORDER BY occurred_at, audit_id`,
      )
      .all(...values)
      .map((row) => ({
        id: row.audit_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        operation: row.operation,
        actorId: row.actor_user_id,
        actorReference: row.actor_reference,
        actorRole: row.actor_role_code,
        previousState: row.previous_state,
        newState: row.new_state,
        reason: row.reason,
        occurredAt: row.occurred_at,
        correlationId: row.correlation_id,
        metadata: parseJson(row.metadata),
      }));
  }

  findInvestigationRequestById(id) {
    return this.#findRequestByAreaCode(id, "INVESTIGACION");
  }

  findVictimsRequestById(id) {
    return this.#findRequestByAreaCode(id, "VICTIMAS");
  }

  listInvestigationItemsByAssignee(assigneeId) {
    return this.#itemsByAssignee(assigneeId, "INVESTIGACION");
  }

  listVictimsItemsByAssignee(assigneeId) {
    return this.#itemsByAssignee(assigneeId, "VICTIMAS");
  }

  replacePresentationSnapshot(snapshot) {
    for (const area of snapshot.areas) this.saveArea(area);
    for (const regional of snapshot.regionals) this.saveRegional(regional);
    for (const role of snapshot.roles) this.saveRole(role);
    for (const user of snapshot.users) this.saveUser(user);
    for (const scope of snapshot.userScopes) this.saveUserScope(scope);
    for (const service of snapshot.services) this.saveService(service);
    for (const coverage of snapshot.coverages) this.saveCoverage(coverage);
    for (const caseRecord of snapshot.cases) this.saveCase(caseRecord);
    for (const request of snapshot.requests) {
      this.saveRequest(request, { synchronize: true });
    }
    for (const item of snapshot.requestItems) {
      this.saveRequestItem(item, { synchronize: true });
    }
    for (const person of snapshot.requestPersons)
      this.saveRequestPerson(person);
    for (const decision of snapshot.assignmentDecisions) {
      this.saveAssignmentDecision(decision);
    }
    for (const candidate of snapshot.decisionCandidates) {
      this.saveDecisionCandidate(candidate);
    }
    for (const exclusion of snapshot.candidateExclusions) {
      this.saveCandidateExclusion(exclusion);
    }
    for (const assignment of snapshot.assignments) {
      const existing = this.database
        .prepare("SELECT 1 FROM sigip_assignment WHERE assignment_id = ?")
        .get(assignment.id);
      if (!existing) this.saveAssignment(assignment);
    }
    for (const history of snapshot.assignmentHistory) {
      const existing = this.database
        .prepare(
          "SELECT 1 FROM sigip_assignment_history WHERE assignment_history_id = ?",
        )
        .get(history.id);
      if (!existing) this.appendAssignmentHistory(history);
    }
    for (const transition of snapshot.stateTransitions) {
      const existing = this.database
        .prepare(
          "SELECT 1 FROM sigip_state_transition WHERE state_transition_id = ?",
        )
        .get(transition.id);
      if (!existing) this.saveStateTransition(transition);
    }
  }

  health() {
    const result = this.database.prepare("PRAGMA integrity_check").get();
    return {
      ok: result.integrity_check === "ok",
      status: result.integrity_check === "ok" ? "ready" : "unavailable",
      driver: "sqlite",
    };
  }

  #knownUser(id) {
    if (!id) return false;
    return Boolean(
      this.database
        .prepare("SELECT 1 FROM sigip_user WHERE user_id = ?")
        .get(id),
    );
  }

  #requestFromRow(row) {
    return {
      id: row.request_id,
      caseId: row.case_id,
      areaId: row.area_id,
      requesterUserId: row.requester_user_id,
      status: row.status,
      year: row.year,
      sequence: row.sequence,
      version: row.version,
      itemIds: this.database
        .prepare(
          "SELECT request_item_id FROM sigip_request_item WHERE request_id = ? ORDER BY child_sequence",
        )
        .all(row.request_id)
        .map((item) => item.request_item_id),
      createdAt: row.created_at,
    };
  }

  #itemFromRow(row) {
    return {
      id: row.request_item_id,
      requestId: row.request_id,
      serviceId: row.service_specialty_id,
      status: row.status,
      regionalId: row.regional_id,
      parentItemId: row.parent_item_id,
      childSequence: row.child_sequence,
      dueAt: row.due_at,
      version: row.version,
      createdAt: row.created_at,
    };
  }

  #assignmentFromRow(row) {
    return {
      id: row.assignment_id,
      itemId: row.request_item_id,
      assigneeId: row.responsible_user_id,
      decisionId: row.assignment_decision_id,
      assignmentType: row.assignment_type,
      policyVersion: row.policy_version,
      current: fromBool(row.current),
      version: row.version,
      assignedAt: row.assigned_at,
      endedAt: row.ended_at,
      reason: row.reason,
      authorizedBy: row.authorized_by,
    };
  }

  #itemsByAssignee(assigneeId, areaId) {
    return this.database
      .prepare(
        `SELECT item.* FROM sigip_request_item item
         JOIN sigip_request request_record ON request_record.request_id = item.request_id
         JOIN sigip_area area ON area.area_id = request_record.area_id
         JOIN sigip_assignment assignment_record ON assignment_record.request_item_id = item.request_item_id
         WHERE assignment_record.responsible_user_id = ? AND assignment_record.current = 1
           AND area.code = ?
         ORDER BY item.created_at`,
      )
      .all(assigneeId, areaId)
      .map((row) => this.#itemFromRow(row));
  }

  #findRequestByAreaCode(id, areaCode) {
    const row = this.database
      .prepare(
        `SELECT request_record.* FROM sigip_request request_record
         JOIN sigip_area area ON area.area_id=request_record.area_id
         WHERE request_record.request_id=? AND area.code=?`,
      )
      .get(id, areaCode);
    return row ? this.#requestFromRow(row) : undefined;
  }
}
