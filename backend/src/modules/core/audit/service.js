import crypto from "node:crypto";
import {
  immutable,
  isoInstant,
  optionalText,
  requiredText,
} from "../../../domain/invariants.js";

const SENSITIVE_KEYS = /password|secret|token|documentcontent|filecontent/i;

function sanitizedMetadata(metadata) {
  const result = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (SENSITIVE_KEYS.test(key)) continue;
    result[key] = value;
  }
  return immutable(structuredClone(result));
}

export function createAuditEntry(data) {
  return immutable({
    id: requiredText(data.id, "id"),
    entityType: requiredText(data.entityType, "entityType"),
    entityId: requiredText(data.entityId, "entityId"),
    operation: requiredText(data.operation, "operation"),
    actorId: optionalText(data.actorId),
    actorReference: requiredText(
      data.actorReference ?? data.actorId,
      "actorReference",
    ),
    actorRole: requiredText(data.actorRole, "actorRole"),
    previousState: optionalText(data.previousState),
    newState: optionalText(data.newState),
    reason: requiredText(data.reason, "reason"),
    occurredAt: isoInstant(data.occurredAt, "occurredAt"),
    correlationId: optionalText(data.correlationId),
    metadata: sanitizedMetadata(data.metadata),
  });
}

export class AuditService {
  constructor({ repository, idGenerator = () => crypto.randomUUID() }) {
    this.repository = repository;
    this.idGenerator = idGenerator;
  }

  record(data) {
    const entry = createAuditEntry({ id: this.idGenerator(), ...data });
    this.repository.appendAudit(entry);
    return entry;
  }

  recordTransition(data) {
    if (!data.previousState || !data.newState) {
      throw new Error("Una transición auditada requiere ambos estados");
    }
    return this.record({ operation: "TRANSICION_ESTADO", ...data });
  }
}
