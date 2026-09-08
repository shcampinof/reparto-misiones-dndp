import { isEffectiveAt } from "../../domain/invariants.js";
import { OptimisticLockError } from "../../domain/invariants.js";

const COLLECTIONS = [
  "areas",
  "roles",
  "users",
  "userScopes",
  "regionals",
  "services",
  "coverages",
  "cases",
  "requests",
  "requestItems",
  "requestPersons",
  "assignmentDecisions",
  "decisionCandidates",
  "candidateExclusions",
  "assignments",
  "assignmentHistory",
  "stateTransitions",
  "documents",
  "documentVersions",
  "parameters",
  "novelties",
  "audit",
  "outbox",
];

function emptyStore() {
  return Object.fromEntries(COLLECTIONS.map((name) => [name, []]));
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export class InMemoryDomainRepository {
  #store = emptyStore();

  constructor(snapshot = {}) {
    this.replaceSnapshot(snapshot);
  }

  async transaction(work) {
    const backup = clone(this.#store);
    try {
      return clone(await work(this));
    } catch (error) {
      this.#store = backup;
      throw error;
    }
  }

  snapshot() {
    return clone(this.#store);
  }

  replaceSnapshot(snapshot, { preserveAppendOnly = false } = {}) {
    const previousAudit = preserveAppendOnly ? this.#store.audit : [];
    const previousOutbox = preserveAppendOnly ? this.#store.outbox : [];
    const next = emptyStore();
    for (const collection of COLLECTIONS) {
      next[collection] = clone(snapshot[collection] ?? []);
    }
    if (preserveAppendOnly) {
      next.audit = clone(previousAudit);
      next.outbox = clone(previousOutbox);
    }
    this.#store = next;
    return this.snapshot();
  }

  #save(collection, entity) {
    const records = this.#store[collection];
    const index = records.findIndex((record) => record.id === entity.id);
    if (index >= 0) records[index] = clone(entity);
    else records.push(clone(entity));
    return clone(entity);
  }

  #find(collection, id) {
    return clone(this.#store[collection].find((record) => record.id === id));
  }

  saveArea(entity) {
    return this.#save("areas", entity);
  }
  saveRole(entity) {
    return this.#save("roles", entity);
  }
  saveUser(entity) {
    return this.#save("users", entity);
  }
  saveUserScope(entity) {
    return this.#save("userScopes", entity);
  }
  saveRegional(entity) {
    return this.#save("regionals", entity);
  }
  saveService(entity) {
    return this.#save("services", entity);
  }
  saveCoverage(entity) {
    return this.#save("coverages", entity);
  }
  saveCase(entity) {
    return this.#save("cases", entity);
  }
  findCaseById(id) {
    return this.#find("cases", id);
  }
  saveRequest(entity, { expectedVersion = null } = {}) {
    return this.#saveVersioned(
      "requests",
      "SOLICITUD",
      entity,
      expectedVersion,
    );
  }
  findRequestById(id) {
    return this.#find("requests", id);
  }
  listRequestsByCaseId(caseId) {
    return clone(
      this.#store.requests.filter((request) => request.caseId === caseId),
    );
  }
  saveRequestItem(entity, { expectedVersion = null } = {}) {
    return this.#saveVersioned(
      "requestItems",
      "ITEM_SOLICITUD",
      entity,
      expectedVersion,
    );
  }
  findRequestItemById(id) {
    return this.#find("requestItems", id);
  }
  listRequestItems(requestId) {
    return clone(
      this.#store.requestItems.filter((item) => item.requestId === requestId),
    );
  }
  saveRequestPerson(entity) {
    return this.#save("requestPersons", entity);
  }
  listRequestPersons(requestId) {
    return clone(
      this.#store.requestPersons.filter(
        (person) => person.requestId === requestId,
      ),
    );
  }
  saveAssignmentDecision(entity) {
    return this.#save("assignmentDecisions", entity);
  }
  findAssignmentDecisionById(id) {
    const decision = this.#find("assignmentDecisions", id);
    if (!decision) return undefined;
    const candidates = this.#store.decisionCandidates
      .filter((candidate) => candidate.decisionId === id)
      .map((candidate) => ({
        ...candidate,
        exclusions: this.#store.candidateExclusions.filter(
          (exclusion) => exclusion.candidateId === candidate.id,
        ),
      }));
    return clone({ ...decision, candidates });
  }
  saveDecisionCandidate(entity) {
    return this.#save("decisionCandidates", entity);
  }
  saveCandidateExclusion(entity) {
    return this.#save("candidateExclusions", entity);
  }
  saveAssignment(entity) {
    if (entity.current) {
      this.#store.assignments = this.#store.assignments.map((assignment) =>
        assignment.itemId === entity.itemId &&
        assignment.current &&
        assignment.id !== entity.id
          ? { ...assignment, current: false, endedAt: entity.assignedAt }
          : assignment,
      );
    }
    return this.#save("assignments", entity);
  }
  currentAssignmentForItem(itemId) {
    return clone(
      this.#store.assignments.find(
        (assignment) => assignment.itemId === itemId && assignment.current,
      ),
    );
  }
  appendAssignmentHistory(entity) {
    if (this.#store.assignmentHistory.some((entry) => entry.id === entity.id)) {
      throw new Error(`Historial de asignación duplicado: ${entity.id}`);
    }
    this.#store.assignmentHistory.push(clone(entity));
    return clone(entity);
  }
  assignmentHistoryForItem(itemId) {
    return clone(
      this.#store.assignmentHistory.filter((entry) => entry.itemId === itemId),
    );
  }
  saveStateTransition(entity) {
    return this.#save("stateTransitions", entity);
  }
  listStateTransitionsForItem(itemId) {
    return clone(
      this.#store.stateTransitions.filter(
        (transition) => transition.itemId === itemId,
      ),
    );
  }
  saveDocument(entity) {
    return this.#save("documents", entity);
  }
  addDocumentVersion(entity) {
    const document = this.#find("documents", entity.documentId);
    if (!document)
      throw new Error(`Documento no encontrado: ${entity.documentId}`);
    if (
      this.#store.documentVersions.some(
        (version) =>
          version.documentId === entity.documentId &&
          version.version === entity.version,
      )
    ) {
      throw new Error("La versión documental ya existe");
    }
    this.#store.documentVersions.push(clone(entity));
    this.#save("documents", {
      ...document,
      currentVersion: Math.max(document.currentVersion, entity.version),
    });
    return clone(entity);
  }
  findDocumentById(id) {
    const document = this.#find("documents", id);
    if (!document) return undefined;
    return {
      ...document,
      versions: clone(
        this.#store.documentVersions
          .filter((version) => version.documentId === id)
          .sort((left, right) => left.version - right.version),
      ),
    };
  }
  saveParameter(entity) {
    return this.#save("parameters", entity);
  }
  findParameterAt(key, at, { areaId = null, serviceId = null } = {}) {
    return clone(
      this.#store.parameters
        .filter(
          (parameter) =>
            parameter.key === key &&
            parameter.areaId === areaId &&
            parameter.serviceId === serviceId &&
            isEffectiveAt(parameter, at),
        )
        .sort((left, right) =>
          right.effectiveFrom.localeCompare(left.effectiveFrom),
        )[0],
    );
  }
  saveNovelty(entity) {
    return this.#save("novelties", entity);
  }
  appendAudit(entity) {
    if (this.#store.audit.some((entry) => entry.id === entity.id)) {
      throw new Error(`Auditoría duplicada: ${entity.id}`);
    }
    this.#store.audit.push(clone(entity));
    return clone(entity);
  }
  listAudit(filters = {}) {
    return clone(
      this.#store.audit.filter(
        (entry) =>
          (!filters.entityType || entry.entityType === filters.entityType) &&
          (!filters.entityId || entry.entityId === filters.entityId),
      ),
    );
  }
  enqueueOutbox(entity) {
    if (this.#store.outbox.some((entry) => entry.id === entity.id)) {
      throw new Error(`Evento outbox duplicado: ${entity.id}`);
    }
    this.#store.outbox.push(clone(entity));
    return clone(entity);
  }
  listOutbox(status = null) {
    return clone(
      this.#store.outbox.filter((entry) => !status || entry.status === status),
    );
  }
  findInvestigationRequestById(id) {
    const request = this.findRequestById(id);
    return request?.areaId === "INVESTIGACION" ? request : undefined;
  }
  findVictimsRequestById(id) {
    const request = this.findRequestById(id);
    return request?.areaId === "VICTIMAS" ? request : undefined;
  }
  listInvestigationItemsByAssignee(assigneeId) {
    return this.#itemsByAssignee(assigneeId, "INVESTIGACION");
  }
  listVictimsItemsByAssignee(assigneeId) {
    return this.#itemsByAssignee(assigneeId, "VICTIMAS");
  }
  #itemsByAssignee(assigneeId, areaId) {
    const itemIds = new Set(
      this.#store.assignments
        .filter(
          (assignment) =>
            assignment.assigneeId === assigneeId && assignment.current,
        )
        .map((assignment) => assignment.itemId),
    );
    const requestIds = new Set(
      this.#store.requests
        .filter((request) => request.areaId === areaId)
        .map((request) => request.id),
    );
    return clone(
      this.#store.requestItems.filter(
        (item) => requestIds.has(item.requestId) && itemIds.has(item.id),
      ),
    );
  }
  #saveVersioned(collection, entityType, entity, expectedVersion) {
    const existing = this.#store[collection].find(
      (record) => record.id === entity.id,
    );
    if (!existing) return this.#save(collection, entity);
    const expected = expectedVersion ?? entity.version;
    if (existing.version !== expected) {
      throw new OptimisticLockError(entityType, entity.id, expected);
    }
    return this.#save(collection, { ...entity, version: expected + 1 });
  }
}
