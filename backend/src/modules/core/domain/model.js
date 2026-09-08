import {
  effectivePeriod,
  immutable,
  isoInstant,
  optionalInstant,
  optionalText,
  requiredText,
  uniqueNonEmpty,
} from "../../../domain/invariants.js";

const AREAS = new Set(["INVESTIGACION", "VICTIMAS"]);

function baseEntity(data) {
  return { id: requiredText(data.id, "id") };
}

function areaCode(value) {
  const code = requiredText(value, "areaCode");
  if (!AREAS.has(code)) throw new Error(`Área no soportada: ${code}`);
  return code;
}

export function createArea(data) {
  return immutable({
    ...baseEntity(data),
    code: areaCode(data.code),
    name: requiredText(data.name, "name"),
    active: data.active !== false,
    ...effectivePeriod(data.effectiveFrom, data.effectiveTo),
  });
}

export function createRole(data) {
  return immutable({
    ...baseEntity(data),
    code: requiredText(data.code, "code"),
    name: requiredText(data.name, "name"),
    areaId: optionalText(data.areaId),
    active: data.active !== false,
    ...effectivePeriod(data.effectiveFrom, data.effectiveTo),
  });
}

export function createUser(data) {
  return immutable({
    ...baseEntity(data),
    identitySubject: requiredText(data.identitySubject, "identitySubject"),
    displayName: requiredText(data.displayName, "displayName"),
    active: data.active !== false,
    createdAt: isoInstant(data.createdAt, "createdAt"),
  });
}

export function createUserScope(data) {
  return immutable({
    ...baseEntity(data),
    userId: requiredText(data.userId, "userId"),
    roleId: requiredText(data.roleId, "roleId"),
    areaId: requiredText(data.areaId, "areaId"),
    regionalId: optionalText(data.regionalId),
    scopeType: requiredText(data.scopeType, "scopeType"),
    active: data.active !== false,
    ...effectivePeriod(data.effectiveFrom, data.effectiveTo),
  });
}

export function createRegional(data) {
  return immutable({
    ...baseEntity(data),
    code: requiredText(data.code, "code"),
    name: requiredText(data.name, "name"),
    active: data.active !== false,
    ...effectivePeriod(data.effectiveFrom, data.effectiveTo),
  });
}

export function createService(data) {
  return immutable({
    ...baseEntity(data),
    areaId: requiredText(data.areaId, "areaId"),
    code: requiredText(data.code, "code"),
    name: requiredText(data.name, "name"),
    kind: requiredText(data.kind, "kind"),
    active: data.active !== false,
    ...effectivePeriod(data.effectiveFrom, data.effectiveTo),
  });
}

export function createCoverage(data) {
  return immutable({
    ...baseEntity(data),
    areaId: requiredText(data.areaId, "areaId"),
    serviceId: requiredText(data.serviceId, "serviceId"),
    regionalId: requiredText(data.regionalId, "regionalId"),
    subjectId: requiredText(data.subjectId, "subjectId"),
    included: data.included !== false,
    priority: Number.isInteger(data.priority) ? data.priority : null,
    active: data.active !== false,
    ...effectivePeriod(data.effectiveFrom, data.effectiveTo),
  });
}

export function createCase(data) {
  return immutable({
    ...baseEntity(data),
    areaId: requiredText(data.areaId, "areaId"),
    externalId: requiredText(data.externalId, "externalId"),
    createdAt: isoInstant(data.createdAt, "createdAt"),
    active: data.active !== false,
  });
}

export function createRequestItem(data) {
  const version = data.version ?? 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("version debe ser un entero positivo");
  }
  return immutable({
    ...baseEntity(data),
    requestId: requiredText(data.requestId, "requestId"),
    serviceId: requiredText(data.serviceId, "serviceId"),
    status: requiredText(data.status, "status"),
    regionalId: optionalText(data.regionalId),
    parentItemId: optionalText(data.parentItemId),
    childSequence: data.childSequence ?? 1,
    dueAt: optionalInstant(data.dueAt, "dueAt"),
    version,
    createdAt: isoInstant(data.createdAt, "createdAt"),
  });
}

export function createRequest(data) {
  const itemIds = uniqueNonEmpty(data.itemIds, "itemIds");
  const version = data.version ?? 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("version debe ser un entero positivo");
  }
  return immutable({
    ...baseEntity(data),
    caseId: requiredText(data.caseId, "caseId"),
    areaId: requiredText(data.areaId, "areaId"),
    requesterUserId: requiredText(data.requesterUserId, "requesterUserId"),
    status: requiredText(data.status, "status"),
    year: Number.isInteger(data.year) ? data.year : null,
    sequence: Number.isInteger(data.sequence) ? data.sequence : null,
    version,
    itemIds,
    createdAt: isoInstant(data.createdAt, "createdAt"),
  });
}

export function createRequestPerson(data) {
  return immutable({
    ...baseEntity(data),
    requestId: requiredText(data.requestId, "requestId"),
    personReference: requiredText(data.personReference, "personReference"),
    relationshipType: requiredText(data.relationshipType, "relationshipType"),
    kinshipCode: optionalText(data.kinshipCode),
    active: data.active !== false,
    createdAt: isoInstant(data.createdAt, "createdAt"),
  });
}

export function createParameter(data) {
  return immutable({
    ...baseEntity(data),
    key: requiredText(data.key, "key"),
    areaId: optionalText(data.areaId),
    serviceId: optionalText(data.serviceId),
    valueType: requiredText(data.valueType, "valueType"),
    value: requiredText(data.value, "value"),
    approvalStatus: requiredText(data.approvalStatus, "approvalStatus"),
    evidenceReference: optionalText(data.evidenceReference),
    active: data.active !== false,
    ...effectivePeriod(data.effectiveFrom, data.effectiveTo),
  });
}

export function createNovelty(data) {
  return immutable({
    ...baseEntity(data),
    userId: requiredText(data.userId, "userId"),
    typeCode: requiredText(data.typeCode, "typeCode"),
    blocksAssignments: Boolean(data.blocksAssignments),
    reason: requiredText(data.reason, "reason"),
    ...effectivePeriod(data.effectiveFrom, data.effectiveTo),
  });
}

export function createStateTransition(data) {
  return immutable({
    ...baseEntity(data),
    itemId: requiredText(data.itemId, "itemId"),
    areaCode: areaCode(data.areaCode),
    previousState: optionalText(data.previousState),
    newState: requiredText(data.newState, "newState"),
    actorId: requiredText(data.actorId, "actorId"),
    actorRole: requiredText(data.actorRole, "actorRole"),
    reason: requiredText(data.reason, "reason"),
    occurredAt: isoInstant(data.occurredAt, "occurredAt"),
  });
}

export function createDocument(data) {
  return immutable({
    ...baseEntity(data),
    caseId: requiredText(data.caseId, "caseId"),
    requestId: optionalText(data.requestId),
    itemId: optionalText(data.itemId),
    documentType: requiredText(data.documentType, "documentType"),
    currentVersion: Number.isInteger(data.currentVersion)
      ? data.currentVersion
      : 0,
    active: data.active !== false,
    createdAt: isoInstant(data.createdAt, "createdAt"),
  });
}

export function createDocumentVersion(data) {
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new Error("version debe ser un entero positivo");
  }
  return immutable({
    ...baseEntity(data),
    documentId: requiredText(data.documentId, "documentId"),
    version: data.version,
    storageReference: requiredText(data.storageReference, "storageReference"),
    sha256: requiredText(data.sha256, "sha256"),
    authorUserId: requiredText(data.authorUserId, "authorUserId"),
    reason: requiredText(data.reason, "reason"),
    status: requiredText(data.status, "status"),
    createdAt: isoInstant(data.createdAt, "createdAt"),
  });
}

export function createOutboxMessage(data) {
  return immutable({
    ...baseEntity(data),
    aggregateType: requiredText(data.aggregateType, "aggregateType"),
    aggregateId: requiredText(data.aggregateId, "aggregateId"),
    eventType: requiredText(data.eventType, "eventType"),
    idempotencyKey: requiredText(data.idempotencyKey, "idempotencyKey"),
    payload: immutable(structuredClone(data.payload ?? {})),
    status: data.status || "PENDIENTE",
    occurredAt: isoInstant(data.occurredAt, "occurredAt"),
    availableAt: isoInstant(data.availableAt ?? data.occurredAt, "availableAt"),
  });
}
