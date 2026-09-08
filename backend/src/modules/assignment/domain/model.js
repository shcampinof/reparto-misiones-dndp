import {
  immutable,
  isoInstant,
  optionalInstant,
  optionalText,
  requiredText,
} from "../../../domain/invariants.js";

export function createAssignment(data) {
  const version = data.version ?? 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("version debe ser un entero positivo");
  }
  return immutable({
    id: requiredText(data.id, "id"),
    itemId: requiredText(data.itemId, "itemId"),
    assigneeId: requiredText(data.assigneeId, "assigneeId"),
    decisionId: optionalText(data.decisionId),
    assignmentType: data.assignmentType || "AUTOMATICA",
    policyVersion: requiredText(data.policyVersion, "policyVersion"),
    explanation: immutable(structuredClone(data.explanation ?? {})),
    current: data.current !== false,
    version,
    assignedAt: isoInstant(data.assignedAt, "assignedAt"),
    endedAt: optionalInstant(data.endedAt, "endedAt"),
    reason: requiredText(data.reason, "reason"),
    authorizedBy: optionalText(data.authorizedBy),
  });
}

export function createAssignmentDecision(data) {
  return immutable({
    id: requiredText(data.id, "id"),
    itemId: requiredText(data.itemId, "itemId"),
    policyVersion: requiredText(data.policyVersion, "policyVersion"),
    resultCode: requiredText(data.resultCode, "resultCode"),
    selectedUserId: optionalText(data.selectedUserId),
    tieBreakRule: optionalText(data.tieBreakRule),
    explanation: immutable(structuredClone(data.explanation ?? {})),
    createdAt: isoInstant(data.createdAt, "createdAt"),
  });
}

export function createDecisionCandidate(data) {
  return immutable({
    id: requiredText(data.id, "id"),
    decisionId: requiredText(data.decisionId, "decisionId"),
    userId: requiredText(data.userId, "userId"),
    eligible: Boolean(data.eligible),
    ranking: Number.isInteger(data.ranking) ? data.ranking : null,
    metrics: immutable(structuredClone(data.metrics ?? {})),
  });
}

export function createCandidateExclusion(data) {
  return immutable({
    id: requiredText(data.id, "id"),
    candidateId: requiredText(data.candidateId, "candidateId"),
    ruleCode: requiredText(data.ruleCode, "ruleCode"),
    explanation: requiredText(data.explanation, "explanation"),
  });
}

export function createAssignmentHistory(data) {
  return immutable({
    id: requiredText(data.id, "id"),
    assignmentId: requiredText(data.assignmentId, "assignmentId"),
    itemId: requiredText(data.itemId, "itemId"),
    action: requiredText(data.action, "action"),
    assigneeId: requiredText(data.assigneeId, "assigneeId"),
    previousAssigneeId: optionalText(data.previousAssigneeId),
    actorId: requiredText(data.actorId, "actorId"),
    reason: requiredText(data.reason, "reason"),
    supportReference: optionalText(data.supportReference),
    occurredAt: isoInstant(data.occurredAt, "occurredAt"),
  });
}
