import crypto from "node:crypto";
import {
  createArea,
  createCase,
  createCoverage,
  createDocument,
  createDocumentVersion,
  createRegional,
  createRequest,
  createRequestItem,
  createRequestPerson,
  createRole,
  createService,
  createStateTransition,
  createUser,
  createUserScope,
} from "../../modules/core/domain/model.js";
import {
  createAssignment,
  createAssignmentDecision,
  createAssignmentHistory,
  createCandidateExclusion,
  createDecisionCandidate,
} from "../../modules/assignment/domain/model.js";

const EFFECTIVE_FROM = "2026-01-01T00:00:00.000Z";

export function mapDemoStateToDomainSnapshot(state) {
  const snapshot = {
    areas: [
      createArea({
        id: "INVESTIGACION",
        code: "INVESTIGACION",
        name: "Investigación",
        effectiveFrom: EFFECTIVE_FROM,
      }),
      createArea({
        id: "VICTIMAS",
        code: "VICTIMAS",
        name: "Víctimas",
        effectiveFrom: EFFECTIVE_FROM,
      }),
    ],
    roles: [],
    users: [],
    userScopes: [],
    regionals: [],
    services: [],
    coverages: [],
    cases: [],
    requests: [],
    requestItems: [],
    requestPersons: [],
    assignmentDecisions: [],
    decisionCandidates: [],
    candidateExclusions: [],
    assignments: [],
    assignmentHistory: [],
    stateTransitions: [],
    documents: [],
    documentVersions: [],
    parameters: [],
    novelties: [],
    audit: [],
    outbox: [],
  };

  mapIdentity(state, snapshot);
  mapCatalogs(state, snapshot);
  mapRequests(state, snapshot);
  return snapshot;
}

function mapIdentity(state, snapshot) {
  const roles = new Map();
  const userIds = new Set();
  for (const user of state.users) {
    userIds.add(user.id);
    snapshot.users.push(
      createUser({
        id: user.id,
        identitySubject: user.document,
        displayName: user.fullName,
        active: true,
        createdAt: EFFECTIVE_FROM,
      }),
    );
    for (const account of user.accounts) {
      const roleId = `ROL-${account.role}`;
      if (!roles.has(roleId)) {
        roles.set(
          roleId,
          createRole({
            id: roleId,
            code: account.role,
            name: account.roleLabel,
            areaId: account.area === "AMBAS" ? null : account.area,
            effectiveFrom: EFFECTIVE_FROM,
          }),
        );
      }
      const areas =
        account.area === "AMBAS"
          ? ["INVESTIGACION", "VICTIMAS"]
          : [account.area];
      for (const areaId of areas) {
        snapshot.userScopes.push(
          createUserScope({
            id: `ALC-${account.id}-${areaId}`,
            userId: user.id,
            roleId,
            areaId,
            scopeType: account.area === "AMBAS" ? "NACIONAL" : "AREA",
            effectiveFrom: EFFECTIVE_FROM,
          }),
        );
      }
    }
  }

  // En la presentación, la identidad de acceso y el profesional elegible son
  // registros distintos. El modelo normalizado incorpora ambos como usuarios
  // para conservar la integridad de asignaciones y coberturas.
  for (const professional of state.professionals) {
    if (userIds.has(professional.id)) continue;
    snapshot.users.push(
      createUser({
        id: professional.id,
        identitySubject: professional.id,
        displayName: professional.displayName,
        active: true,
        createdAt: EFFECTIVE_FROM,
      }),
    );
    userIds.add(professional.id);

    const roleCode =
      professional.area === "INVESTIGACION" ? "investigador" : "perito";
    const roleId = `ROL-${roleCode}`;
    if (roles.has(roleId)) {
      snapshot.userScopes.push(
        createUserScope({
          id: `ALC-${professional.id}-${professional.area}`,
          userId: professional.id,
          roleId,
          areaId: professional.area,
          scopeType: "AREA",
          effectiveFrom: EFFECTIVE_FROM,
        }),
      );
    }
  }
  snapshot.roles = [...roles.values()];
}

function mapCatalogs(state, snapshot) {
  const regionalIds = new Set();
  const serviceKeys = new Map();
  for (const professional of state.professionals) {
    for (const region of professional.coverages) regionalIds.add(region);
    for (const specialty of professional.specialties) {
      serviceKeys.set(`${professional.area}:${specialty}`, {
        areaId: professional.area,
        code: specialty,
      });
    }
  }
  for (const request of state.requests) {
    for (const item of request.items) {
      regionalIds.add(item.region);
      serviceKeys.set(`${request.area}:${item.service}`, {
        areaId: request.area,
        code: item.service,
      });
    }
  }
  snapshot.regionals = [...regionalIds].sort().map((code) =>
    createRegional({
      id: code,
      code,
      name: readable(code),
      effectiveFrom: EFFECTIVE_FROM,
    }),
  );
  snapshot.services = [...serviceKeys.values()].map(({ areaId, code }) =>
    createService({
      id: `${areaId}-${code}`,
      areaId,
      code,
      name: readable(code),
      kind: areaId === "INVESTIGACION" ? "ESPECIALIDAD" : "PERITAJE",
      effectiveFrom: EFFECTIVE_FROM,
    }),
  );
  for (const professional of state.professionals) {
    for (const specialty of professional.specialties) {
      for (const regionalId of professional.coverages) {
        snapshot.coverages.push(
          createCoverage({
            id: `COB-${professional.id}-${specialty}-${regionalId}`,
            areaId: professional.area,
            serviceId: `${professional.area}-${specialty}`,
            regionalId,
            subjectId: professional.id,
            included: true,
            effectiveFrom: EFFECTIVE_FROM,
          }),
        );
      }
    }
  }
}

function mapRequests(state, snapshot) {
  const roleByUser = new Map(
    state.users.map((user) => [user.id, user.accounts[0]?.role || "sistema"]),
  );
  const mappedCases = new Set();
  for (const request of state.requests) {
    const caseId = caseIdFor(request);
    if (!mappedCases.has(caseId)) {
      snapshot.cases.push(
        createCase({
          id: caseId,
          areaId: request.area,
          externalId: request.externalId,
          createdAt: request.createdAt,
        }),
      );
      mappedCases.add(caseId);
    }
    snapshot.requests.push(
      createRequest({
        id: request.id,
        caseId,
        areaId: request.area,
        requesterUserId: request.ownerUserId,
        status: aggregateStatus(request.items),
        itemIds: request.items.map((item) => item.id),
        createdAt: request.createdAt,
      }),
    );
    for (const [personIndex, person] of (request.persons ?? []).entries()) {
      snapshot.requestPersons.push(
        createRequestPerson({
          id: `${request.id}-PERSONA-${personIndex + 1}`,
          requestId: request.id,
          personReference: person.alias,
          relationshipType: person.type,
          createdAt: request.createdAt,
        }),
      );
    }
    for (const [itemIndex, item] of request.items.entries()) {
      snapshot.requestItems.push(
        createRequestItem({
          id: item.id,
          requestId: request.id,
          serviceId: `${request.area}-${item.service}`,
          status: item.status,
          regionalId: item.region,
          childSequence: itemIndex + 1,
          dueAt: item.dueDate,
          createdAt: request.createdAt,
        }),
      );
      mapTimeline(request, item, roleByUser, snapshot);
      mapAssignment(item, snapshot);
      mapDocument(request, item, caseId, snapshot);
    }
  }
}

function mapTimeline(request, item, roleByUser, snapshot) {
  item.timeline.forEach((entry, index) => {
    snapshot.stateTransitions.push(
      createStateTransition({
        id: `${item.id}-TRANSICION-${index + 1}`,
        itemId: item.id,
        areaCode: request.area,
        previousState: entry.from,
        newState: entry.to,
        actorId: entry.actor,
        actorRole: roleByUser.get(entry.actor) || "sistema",
        reason: entry.message,
        occurredAt: entry.at,
      }),
    );
  });
}

function mapAssignment(item, snapshot) {
  if (!item.assignment) return;
  const decisionId = `DEC-${item.id}-${item.assignment.createdAt}`;
  snapshot.assignmentDecisions.push(
    createAssignmentDecision({
      id: decisionId,
      itemId: item.id,
      policyVersion: item.assignment.policyVersion,
      resultCode: item.assignment.selectedId
        ? "ASIGNACION_REALIZADA"
        : "SIN_CANDIDATO",
      selectedUserId: item.assignment.selectedId,
      tieBreakRule: "CARGA_ULTIMA_ASIGNACION_ID_ESTABLE",
      explanation: {
        strategy: item.assignment.strategy ?? null,
        selectedReason: item.assignment.selectedReason,
      },
      createdAt: item.assignment.createdAt,
    }),
  );
  for (const [index, candidate] of (
    item.assignment.evaluated ?? []
  ).entries()) {
    const candidateId = `${decisionId}-CAND-${candidate.candidateId}`;
    snapshot.decisionCandidates.push(
      createDecisionCandidate({
        id: candidateId,
        decisionId,
        userId: candidate.candidateId,
        eligible: candidate.eligible,
        ranking: candidate.eligible ? index + 1 : null,
        metrics: candidate.metrics,
      }),
    );
    for (const [exclusionIndex, exclusion] of candidate.exclusions.entries()) {
      snapshot.candidateExclusions.push(
        createCandidateExclusion({
          id: `${candidateId}-EXC-${exclusionIndex + 1}`,
          candidateId,
          ruleCode: `EXCLUSION_${exclusionIndex + 1}`,
          explanation: exclusion,
        }),
      );
    }
  }
  if (!item.assignment.selectedId) return;
  const assignmentId = `ASG-${item.id}`;
  const reason = item.assignment.selectedReason || "Asignación registrada";
  snapshot.assignments.push(
    createAssignment({
      id: assignmentId,
      itemId: item.id,
      assigneeId: item.assignment.selectedId,
      decisionId,
      assignmentType: "AUTOMATICA",
      policyVersion: item.assignment.policyVersion,
      explanation: {
        evaluated: item.assignment.evaluated ?? [],
        strategy: item.assignment.strategy ?? null,
      },
      assignedAt: item.assignment.createdAt,
      reason,
    }),
  );
  snapshot.assignmentHistory.push(
    createAssignmentHistory({
      id: `${assignmentId}-H1`,
      assignmentId,
      itemId: item.id,
      action: "ASIGNADA",
      assigneeId: item.assignment.selectedId,
      actorId: "sistema",
      reason,
      occurredAt: item.assignment.createdAt,
    }),
  );
}

function mapDocument(request, item, caseId, snapshot) {
  if (!item.reportReference) return;
  const documentId = `DOC-${item.id}`;
  const createdAt = item.timeline.at(-1)?.at || request.createdAt;
  snapshot.documents.push(
    createDocument({
      id: documentId,
      caseId,
      requestId: request.id,
      itemId: item.id,
      documentType: request.area === "VICTIMAS" ? "F171" : "INFORME",
      currentVersion: 1,
      createdAt,
    }),
  );
  snapshot.documentVersions.push(
    createDocumentVersion({
      id: `${documentId}-V1`,
      documentId,
      version: 1,
      storageReference: item.reportReference,
      sha256: "NO_DISPONIBLE_EN_ORIGEN_DE_PRESENTACION",
      authorUserId: item.timeline.at(-1)?.actor || request.ownerUserId,
      reason: "Versión mapeada desde el recorrido existente",
      status: "REGISTRADA",
      createdAt,
    }),
  );
}

function caseIdFor(request) {
  const digest = crypto
    .createHash("sha256")
    .update(`${request.area}:${request.externalId}`)
    .digest("hex")
    .slice(0, 24);
  return `CASO-${request.area.slice(0, 3)}-${digest}`;
}

function aggregateStatus(items) {
  const statuses = [...new Set(items.map((item) => item.status))];
  return statuses.length === 1 ? statuses[0] : "ESTADO_PARCIAL";
}

function readable(code) {
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
