import { DEMO_PARAMETERS } from "../../infrastructure/demo/seeds.js";
import { AppError } from "../../shared/errors.js";
import { assignInvestigation } from "../assignment/strategies/investigation.js";
import { assignVictims } from "../assignment/strategies/victims.js";
import {
  CAPABILITIES,
  assertCapability,
  hasCapability,
} from "../core/auth/capabilities.js";
import { PROPOSED_PROFILES } from "../core/auth/proposed-profiles.js";
import { publishedServices } from "../core/catalogs/service.js";
import { OPERATION_CONTRACTS } from "../core/operations/contracts.js";

const ACTIVE_STATES = new Set([
  "ASIGNADA",
  "EN_EJECUCION",
  "INFORME_ENTREGADO",
]);

export function createDemoService({
  repository,
  catalogService,
  clock = () => new Date().toISOString(),
}) {
  function bootstrap(auth) {
    const state = repository.snapshot();
    const requests = visibleRequests(state, auth).map((request) =>
      presentRequest(state, request),
    );
    const catalogAt = clock().slice(0, 10);
    const catalogAreas = ["INVESTIGACION", "VICTIMAS"].filter((area) =>
      hasCapability(auth, CAPABILITIES.CONSULTAR_CATALOGO_SERVICIOS, { area }),
    );
    const catalogServices = catalogAreas.flatMap((area) =>
      catalogService.listPublished(auth, { area, at: catalogAt }),
    );
    const visibleServiceIds = new Set(
      catalogServices.map((service) => service.id),
    );
    const catalogRelations = (
      state.catalogs.serviceSpecialtyRelations || []
    ).filter(
      (relation) =>
        visibleServiceIds.has(relation.serviceId) &&
        relation.status === "PUBLICADO" &&
        (!relation.validFrom || relation.validFrom <= catalogAt) &&
        (!relation.validTo || catalogAt < relation.validTo),
    );
    return {
      demo: true,
      productName:
        "SIGIP-DP — Gestión investigativa y pericial de la Defensoría del Pueblo",
      allowedAreas: allowedAreas(auth),
      authorization: {
        grants: auth.grants || [],
        proposedProfiles: PROPOSED_PROFILES,
      },
      operationContracts: OPERATION_CONTRACTS,
      catalogs: catalogsFor(state, auth, catalogAt),
      serviceCatalog: {
        specialties: structuredClone(
          state.catalogs.specialties.filter(
            (specialty) =>
              catalogAreas.includes(specialty.area) &&
              specialty.status === "PUBLICADO" &&
              (!specialty.validFrom || specialty.validFrom <= catalogAt) &&
              (!specialty.validTo || catalogAt < specialty.validTo),
          ),
        ),
        services: catalogServices,
        serviceSpecialtyRelations: structuredClone(catalogRelations),
      },
      parameters: DEMO_PARAMETERS,
      requests,
      dashboards: {
        INVESTIGACION: dashboard(requests, "INVESTIGACION"),
        VICTIMAS: dashboard(requests, "VICTIMAS"),
      },
    };
  }

  function createInvestigation(auth, payload) {
    assertCapability(auth, CAPABILITIES.CREAR_SOLICITUD_INVESTIGACION, {
      area: "INVESTIGACION",
      ownerUserId: auth.sub,
    });
    rejectClientAssignee(payload);
    return repository.transaction((state) => {
      const at = clock();
      const intake = normalizeInvestigationIntake(state, payload, at);
      const requestedItems = normalizeRequestedItems(
        state,
        "INVESTIGACION",
        payload,
        at,
      );
      validateServiceRequirements(
        state,
        "INVESTIGACION",
        requestedItems,
        intake.documents,
        at,
      );
      const sequence = state.counters.investigation++;
      const number = String(sequence).padStart(4, "0");
      const request = {
        id: `INV-2026-${number}`,
        area: "INVESTIGACION",
        ownerUserId: auth.sub,
        externalId: intake.externalId,
        summary: intake.conduct,
        createdAt: at,
        requester: requesterSnapshot(state, auth),
        persons: intake.persons,
        caseData: intake.caseData,
        differentialApproach: intake.differentialApproach,
        priority: intake.priority,
        documents: intake.documents,
        items: requestedItems.map((requested, index) => {
          const service = serviceFromState(
            state,
            "INVESTIGACION",
            requested.service,
            at,
          );
          return {
            id: childItemId("MT-2026", number, index, requestedItems.length),
            service: service.id,
            serviceVersion: service.version,
            specialtyIds: structuredClone(service.specialtyIds),
            region: requested.region,
            law: null,
            status: "RADICADA",
            assigneeId: null,
            dueDate: null,
            termSnapshot: structuredClone(service.termPolicy),
            activities: [],
            reportReference: null,
            products: [],
            assignment: null,
            exception: null,
            operations: [],
            timeline: [
              timelineEvent(
                at,
                null,
                "RADICADA",
                auth.sub,
                "Solicitud de misión radicada",
              ),
            ],
          };
        }),
      };
      request.versions = [
        requestSubmissionVersion({ request, version: 1, at, actor: auth.sub }),
      ];
      for (const item of request.items) {
        attemptInvestigationAssignment(state, item, at);
      }
      state.requests.unshift(request);
      return presentRequestForAuth(state, request, auth);
    });
  }

  function assignInvestigationItem(auth, itemId) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertCapability(auth, CAPABILITIES.REINTENTAR_REPARTO_EXCEPCION, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["PENDIENTE_EXCEPCION"]);
      const at = clock();
      attemptInvestigationAssignment(state, item, at);
      return presentRequestForAuth(state, request, auth);
    });
  }

  function startInvestigation(auth, itemId) {
    return executorTransition(
      auth,
      itemId,
      "INVESTIGACION",
      CAPABILITIES.EJECUTAR_ITEM_INVESTIGACION,
      ["ASIGNADA"],
      (item, at) => {
        transition(
          item,
          "EN_EJECUCION",
          auth.sub,
          "Misión iniciada por el profesional asignado",
          at,
        );
      },
    );
  }

  function progressInvestigation(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "INVESTIGACION",
      CAPABILITIES.EJECUTAR_ITEM_INVESTIGACION,
      ["EN_EJECUCION"],
      (item, at) => applyProgress(item, payload, auth.sub, at),
    );
  }

  function deliverInvestigation(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "INVESTIGACION",
      CAPABILITIES.EJECUTAR_ITEM_INVESTIGACION,
      ["EN_EJECUCION"],
      (item, at) => {
        const reference = text(payload.reference);
        if (!reference)
          throw businessError("La referencia del informe es obligatoria");
        addProductVersion(item, {
          type: "INFORME_INVESTIGACION",
          reference,
          author: auth.sub,
          at,
          status: "ENTREGADO",
        });
        transition(
          item,
          "INFORME_ENTREGADO",
          auth.sub,
          "Informe entregado; pendiente de aprobación PAG",
          at,
        );
      },
    );
  }

  function approveInvestigationDelivery(auth, itemId) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertCapability(auth, CAPABILITIES.APROBAR_INFORME_INVESTIGACION, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["INFORME_ENTREGADO"]);
      const at = clock();
      updateLatestProduct(item, "INFORME_INVESTIGACION", {
        status: "APROBADO",
        approvedAt: at,
        approvedBy: auth.sub,
      });
      transition(
        item,
        "CERRADA",
        auth.sub,
        "Entrega aprobada por PAG Investigación",
        at,
      );
      return presentRequestForAuth(state, request, auth);
    });
  }

  function returnInvestigationDelivery(auth, itemId, payload) {
    const observation = text(payload.observation);
    if (!observation) {
      throw businessError("La observación de devolución es obligatoria");
    }
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertCapability(auth, CAPABILITIES.APROBAR_INFORME_INVESTIGACION, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["INFORME_ENTREGADO"]);
      const at = clock();
      updateLatestProduct(item, "INFORME_INVESTIGACION", {
        status: "DEVUELTO",
        returnedAt: at,
        returnedBy: auth.sub,
        returnObservation: observation,
      });
      transition(
        item,
        "EN_EJECUCION",
        auth.sub,
        `Informe devuelto para corrección · ${observation}`,
        at,
      );
      return presentRequestForAuth(state, request, auth);
    });
  }

  function createVictims(auth, payload) {
    assertCapability(auth, CAPABILITIES.CREAR_SOLICITUD_VICTIMAS, {
      area: "VICTIMAS",
      ownerUserId: auth.sub,
    });
    rejectClientAssignee(payload);
    return repository.transaction((state) => {
      const at = clock();
      const intake = normalizeVictimsIntake(state, payload, at);
      assertUniqueVictimsExternalId(state, intake.externalId);
      const requestedItems = normalizeRequestedItems(
        state,
        "VICTIMAS",
        payload,
        at,
      );
      validateServiceRequirements(
        state,
        "VICTIMAS",
        requestedItems,
        intake.documents,
        at,
      );
      const sequence = state.counters.victims++;
      const number = String(sequence).padStart(4, "0");
      const request = {
        id: `SVP-2026-${number}`,
        area: "VICTIMAS",
        ownerUserId: auth.sub,
        externalId: intake.externalId,
        summary: `${requestedItems.length} servicio(s) · ${intake.law}`,
        createdAt: at,
        requester: requesterSnapshot(state, auth),
        persons: intake.persons,
        caseData: intake.caseData,
        documents: intake.documents,
        items: requestedItems.map((requested, index) => {
          const service = serviceFromState(
            state,
            "VICTIMAS",
            requested.service,
            at,
          );
          return {
            id: childItemId(
              "VIC-ITEM-PRE",
              number,
              index,
              requestedItems.length,
            ),
            service: service.id,
            serviceVersion: service.version,
            specialtyIds: structuredClone(service.specialtyIds),
            region: requested.region,
            law: requested.law || intake.law,
            status: "PENDIENTE_APROBACION_PAG",
            assigneeId: null,
            dueDate: null,
            termSnapshot: structuredClone(service.termPolicy),
            activities: [],
            reportReference: null,
            products: [],
            assignment: null,
            exception: null,
            operations: [],
            submissionVersion: 1,
            approvedSubmissionVersion: null,
            approval: null,
            timeline: [
              timelineEvent(
                at,
                null,
                "PENDIENTE_APROBACION_PAG",
                auth.sub,
                "Solicitud pericial enviada a aprobación previa",
              ),
            ],
          };
        }),
      };
      request.versions = [
        victimsSubmissionVersion({
          request,
          version: 1,
          at,
          actor: auth.sub,
          correctionSummary: null,
        }),
      ];
      state.requests.unshift(request);
      return presentRequestForAuth(state, request, auth);
    });
  }

  function approveVictimsAndAssign(auth, itemId) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      assertCapability(auth, CAPABILITIES.AVALAR_SOLICITUD_VICTIMAS, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["PENDIENTE_APROBACION_PAG"]);
      const at = clock();
      ensureVictimsVersions(request);
      const approvedVersion =
        item.submissionVersion || request.versions.at(-1).version;
      const approvedSnapshot = request.versions.find(
        (version) => version.version === approvedVersion,
      );
      if (!approvedSnapshot) {
        throw businessError(
          "No existe la versión de solicitud sometida a aprobación",
        );
      }
      item.approvedSubmissionVersion = approvedVersion;
      item.approval = { at, actor: auth.sub, requestVersion: approvedVersion };
      approvedSnapshot.reviews ||= [];
      approvedSnapshot.reviews.push({
        itemId: item.id,
        decision: "APROBADA",
        at,
        actor: auth.sub,
      });
      transition(
        item,
        "APROBADA_REPARTO",
        auth.sub,
        "Aprobación previa PAG Víctimas",
        at,
      );
      const assignment = assignVictims({
        professionals: professionalsWithLoad(state),
        serviceId: item.service,
        specialtyIds: item.specialtyIds,
        region: item.region,
        law: item.law,
        now: at,
      });
      item.assignment = assignment;
      if (!assignment.selectedId) {
        item.exception = {
          type: "FALTA_CANDIDATO",
          createdAt: at,
          assignmentPolicyVersion: assignment.policyVersion,
          reason: assignment.selectedReason,
        };
        transition(
          item,
          "PENDIENTE_EXCEPCION",
          "motor-reparto",
          assignment.selectedReason,
          at,
        );
      } else {
        item.exception = null;
        item.assigneeId = assignment.selectedId;
        item.dueDate = null;
        recordAssignmentInstant(state, assignment.selectedId, at);
        transition(
          item,
          "ASIGNADA",
          "motor-reparto",
          assignment.selectedReason,
          at,
        );
      }
      return presentRequestForAuth(state, request, auth);
    });
  }

  function returnVictimsRequest(auth, itemId, payload) {
    const observation = text(payload.observation);
    if (!observation) {
      throw businessError("La observación de devolución es obligatoria");
    }

    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      assertCapability(auth, CAPABILITIES.AVALAR_SOLICITUD_VICTIMAS, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["PENDIENTE_APROBACION_PAG"]);
      ensureVictimsVersions(request);
      const at = clock();
      const currentVersion = versionForVictimsItem(request, item);
      currentVersion.reviews ||= [];
      currentVersion.reviews.push({
        itemId: item.id,
        decision: "DEVUELTA",
        observation,
        at,
        actor: auth.sub,
      });
      transition(
        item,
        "DEVUELTA",
        auth.sub,
        `Solicitud devuelta al RJV · ${observation}`,
        at,
      );
      return presentRequestForAuth(state, request, auth);
    });
  }

  function correctAndResubmitVictims(auth, itemId, payload) {
    const correctionSummary = text(payload.correctionSummary);
    if (!correctionSummary) {
      throw businessError("La descripción de la corrección es obligatoria");
    }

    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      assertCapability(auth, CAPABILITIES.CORREGIR_SOLICITUD_VICTIMAS, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["DEVUELTA"]);
      ensureVictimsVersions(request);

      const at = clock();
      const corrected = correctedVictimsData(state, request, item, payload, at);
      assertUniqueVictimsExternalId(state, corrected.externalId, request.id);
      const service = serviceFromState(
        state,
        "VICTIMAS",
        corrected.service,
        at,
      );
      request.externalId = corrected.externalId;
      request.summary = `${request.items.length} servicio(s) · ${corrected.law}`;
      request.persons = corrected.persons;
      request.caseData = corrected.caseData;
      request.documents = corrected.documents;
      item.service = corrected.service;
      item.serviceVersion = service.version;
      item.specialtyIds = structuredClone(service.specialtyIds);
      item.termSnapshot = structuredClone(service.termPolicy);
      item.region = corrected.region;
      item.law = corrected.law;
      item.assigneeId = null;
      item.assignment = null;
      item.exception = null;
      item.dueDate = null;
      validateServiceRequirements(
        state,
        "VICTIMAS",
        [
          {
            service: corrected.service,
            region: corrected.region,
            law: corrected.law,
          },
        ],
        corrected.documents,
        at,
      );
      const newVersion =
        Math.max(...request.versions.map((entry) => entry.version)) + 1;
      item.submissionVersion = newVersion;
      item.approvedSubmissionVersion = null;
      item.approval = null;
      request.versions.push(
        victimsSubmissionVersion({
          request,
          version: newVersion,
          at,
          actor: auth.sub,
          correctionSummary,
        }),
      );
      transition(
        item,
        "PENDIENTE_APROBACION_PAG",
        auth.sub,
        `Solicitud corregida y reenviada · ${correctionSummary}`,
        at,
      );
      return presentRequestForAuth(state, request, auth);
    });
  }

  function startVictims(auth, itemId) {
    return executorTransition(
      auth,
      itemId,
      "VICTIMAS",
      CAPABILITIES.EJECUTAR_ITEM_VICTIMAS,
      ["ASIGNADA"],
      (item, at) => {
        transition(item, "EN_EJECUCION", auth.sub, "Peritaje iniciado", at);
      },
    );
  }

  function progressVictims(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "VICTIMAS",
      CAPABILITIES.EJECUTAR_ITEM_VICTIMAS,
      ["EN_EJECUCION"],
      (item, at) => applyProgress(item, payload, auth.sub, at),
    );
  }

  function finishVictims(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "VICTIMAS",
      CAPABILITIES.EJECUTAR_ITEM_VICTIMAS,
      ["EN_EJECUCION"],
      (item, at) => {
        const reference = text(payload.f171Reference);
        if (!reference)
          throw businessError("La referencia del F-171 es obligatoria");
        addProductVersion(item, {
          type: "F171",
          reference,
          author: auth.sub,
          at,
          status: "REGISTRADO",
        });
        transition(
          item,
          "CERRADA",
          auth.sub,
          "F-171 registrado; cierre directo sin aprobación final ordinaria PAG",
          at,
        );
      },
    );
  }

  function reset(auth) {
    assertCapability(auth, CAPABILITIES.RESTABLECER_PRESENTACION, {
      area: "AMBAS",
    });
    repository.reset();
    return bootstrap(auth);
  }

  function registerOperation(auth, areaParam, itemId, typeParam, payload) {
    const area = normalizeAreaPath(areaParam);
    const type = text(typeParam).toUpperCase();
    const contract = OPERATION_CONTRACTS[type];
    if (!contract || !contract.areas.includes(area)) {
      throw new AppError(
        404,
        "OPERATION_CONTRACT_NOT_FOUND",
        "Contrato operativo no encontrado",
      );
    }
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, area);
      assertCapability(auth, contract.capability, {
        area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      if (!contract.enabled) {
        throw new AppError(
          409,
          "PENDING_FUNCTIONAL_DECISION",
          `Operación deshabilitada hasta resolver ${contract.decisionCode}`,
          { decisionCode: contract.decisionCode, reason: contract.reason },
        );
      }
      assertState(item, contract.allowedStates);
      for (const field of contract.requiredFields) {
        if (!text(payload[field])) {
          throw businessError(`El campo ${field} es obligatorio`);
        }
      }
      const at = clock();
      const operation = {
        id: `OP-${String(state.operations.length + 1).padStart(4, "0")}`,
        type,
        area,
        requestId: request.id,
        itemId: item.id,
        status: "REGISTRADO",
        reason: text(payload.reason),
        description: text(payload.description),
        supportReference: text(payload.supportReference),
        actor: auth.sub,
        createdAt: at,
        decisionCode: null,
        primaryStatusSnapshot: item.status,
        routing: problemRouting(state, request, item, at),
      };
      item.operations ||= [];
      item.operations.push(operation);
      state.operations.push(operation);
      item.timeline.push(
        timelineEvent(
          at,
          item.status,
          item.status,
          auth.sub,
          `Problema reportado · ${operation.reason}`,
        ),
      );
      return presentRequestForAuth(state, request, auth);
    });
  }

  function executorTransition(auth, itemId, area, capability, states, mutate) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, area);
      assertCapability(auth, capability, {
        area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, states);
      mutate(item, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  return {
    bootstrap,
    createInvestigation,
    assignInvestigationItem,
    startInvestigation,
    progressInvestigation,
    deliverInvestigation,
    approveInvestigationDelivery,
    returnInvestigationDelivery,
    createVictims,
    approveVictimsAndAssign,
    returnVictimsRequest,
    correctAndResubmitVictims,
    startVictims,
    progressVictims,
    finishVictims,
    registerOperation,
    reset,
  };
}

function visibleRequests(state, auth) {
  return state.requests
    .map((request) => {
      const visibleItems = request.items.filter((item) =>
        hasCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, {
          area: request.area,
          ownerUserId: request.ownerUserId,
          assigneeId: item.assigneeId,
          region: item.region,
        }),
      );
      return {
        ...request,
        aggregateStatus: aggregateRequestStatus(request.items),
        aggregateCounts: aggregateRequestCounts(request.items),
        items: visibleItems,
      };
    })
    .filter((request) => request.items.length > 0);
}

function allowedAreas(auth) {
  const now = new Date().toISOString();
  const areas = new Set();
  for (const grant of auth.grants || []) {
    if (
      (grant.validFrom && now < grant.validFrom) ||
      (grant.validTo && now >= grant.validTo)
    ) {
      continue;
    }
    if (grant.area === "AMBAS" || grant.scopeType === "SYSTEM") {
      areas.add("INVESTIGACION");
      areas.add("VICTIMAS");
    } else if (["INVESTIGACION", "VICTIMAS"].includes(grant.area)) {
      areas.add(grant.area);
    }
  }
  return [...areas];
}

function professionalsWithLoad(state) {
  const activeByProfessional = new Map();
  for (const request of state.requests) {
    for (const item of request.items) {
      if (item.assigneeId && ACTIVE_STATES.has(item.status)) {
        activeByProfessional.set(
          item.assigneeId,
          (activeByProfessional.get(item.assigneeId) || 0) + 1,
        );
      }
    }
  }
  return state.professionals.map((professional) => ({
    ...professional,
    load:
      professional.demoBaseLoad +
      (activeByProfessional.get(professional.id) || 0),
  }));
}

function attemptInvestigationAssignment(state, item, at) {
  const assignment = assignInvestigation({
    professionals: professionalsWithLoad(state),
    serviceId: item.service,
    specialtyIds: item.specialtyIds,
    region: item.region,
    now: at,
  });
  item.assignment = assignment;
  if (!assignment.selectedId) {
    item.assigneeId = null;
    item.dueDate = null;
    item.exception = {
      type: "FALTA_CANDIDATO",
      createdAt: at,
      assignmentPolicyVersion: assignment.policyVersion,
      reason: assignment.selectedReason,
    };
    transition(
      item,
      "PENDIENTE_EXCEPCION",
      "motor-reparto",
      assignment.selectedReason,
      at,
    );
    return;
  }
  item.assigneeId = assignment.selectedId;
  item.dueDate = null;
  item.exception = null;
  recordAssignmentInstant(state, assignment.selectedId, at);
  transition(item, "ASIGNADA", "motor-reparto", assignment.selectedReason, at);
}

function requesterSnapshot(state, auth) {
  const user = state.users.find((candidate) => candidate.id === auth.sub);
  return {
    userId: auth.sub,
    fullName: user?.fullName || auth.fullName || "Solicitante",
    role: auth.role,
    email: auth.email || null,
    region: auth.region || null,
  };
}

function requestSubmissionVersion({ request, version, at, actor }) {
  return {
    version,
    submittedAt: at,
    submittedBy: actor,
    correctionSummary: null,
    data: {
      externalId: request.externalId,
      requester: structuredClone(request.requester),
      persons: structuredClone(request.persons),
      caseData: structuredClone(request.caseData),
      differentialApproach: structuredClone(request.differentialApproach),
      priority: structuredClone(request.priority),
      documents: structuredClone(request.documents),
      items: request.items.map((item) => ({
        id: item.id,
        service: item.service,
        serviceVersion: item.serviceVersion,
        region: item.region,
      })),
    },
  };
}

function recordAssignmentInstant(state, professionalId, at) {
  const professional = state.professionals.find(
    (candidate) => candidate.id === professionalId,
  );
  if (professional) professional.lastAssignmentAt = at;
}

function presentRequest(state, request) {
  const professionals = new Map(
    state.professionals.map((professional) => [professional.id, professional]),
  );
  const users = new Map(state.users.map((user) => [user.id, user.fullName]));
  return {
    ...structuredClone(request),
    requesterName: users.get(request.ownerUserId) || "Solicitante",
    aggregateStatus:
      request.aggregateStatus || aggregateRequestStatus(request.items),
    aggregateCounts:
      request.aggregateCounts || aggregateRequestCounts(request.items),
    items: request.items.map((item) => ({
      ...structuredClone(item),
      assigneeName: professionals.get(item.assigneeId)?.displayName || null,
      serviceLabel:
        serviceFromStateById(state, item.service)?.name || item.service,
      specialtyLabels: (item.specialtyIds || []).map(
        (id) =>
          state.catalogs.specialties.find((entry) => entry.id === id)?.name ||
          id,
      ),
      regionLabel: catalogLabel(state.catalogs.regions, item.region),
      lawLabel: item.law ? catalogLabel(state.catalogs.laws, item.law) : null,
      tracking: trackingFor(item),
      products: presentedProducts(request.area, item),
      documents: presentedProducts(request.area, item),
      approvedRequestData:
        request.area === "VICTIMAS" && item.approvedSubmissionVersion
          ? structuredClone(
              request.versions?.find(
                (version) => version.version === item.approvedSubmissionVersion,
              )?.data || null,
            )
          : null,
    })),
  };
}

function presentRequestForAuth(state, request, auth) {
  const visibleItems = request.items.filter((item) =>
    hasCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, {
      area: request.area,
      ownerUserId: request.ownerUserId,
      assigneeId: item.assigneeId,
      region: item.region,
    }),
  );
  return presentRequest(state, {
    ...request,
    aggregateStatus: aggregateRequestStatus(request.items),
    aggregateCounts: aggregateRequestCounts(request.items),
    items: visibleItems,
  });
}

function ensureVictimsVersions(request) {
  if (!request.versions?.length) {
    request.versions = [
      victimsSubmissionVersion({
        request,
        version: 1,
        at: request.createdAt,
        actor: request.ownerUserId,
        correctionSummary: null,
      }),
    ];
  }
  for (const item of request.items) {
    item.submissionVersion ||= 1;
    item.approvedSubmissionVersion ||= [
      "APROBADA_REPARTO",
      "ASIGNADA",
      "EN_EJECUCION",
      "CERRADA",
    ].includes(item.status)
      ? 1
      : null;
  }
}

function victimsSubmissionVersion({
  request,
  version,
  at,
  actor,
  correctionSummary,
}) {
  return {
    version,
    submittedAt: at,
    submittedBy: actor,
    correctionSummary,
    reviews: [],
    data: {
      externalId: request.externalId,
      persons: structuredClone(request.persons || []),
      caseData: structuredClone(request.caseData || null),
      documents: structuredClone(request.documents || []),
      items: request.items.map((item) => ({
        id: item.id,
        service: item.service,
        serviceVersion: item.serviceVersion,
        region: item.region,
        law: item.law,
      })),
    },
  };
}

function correctedVictimsData(state, request, item, payload, at) {
  const externalId = text(payload.externalId ?? request.externalId);
  const law = text(payload.law ?? item.law);
  const service = text(payload.service ?? item.service);
  const region = text(payload.region ?? item.region);
  const persons = payload.persons
    ? normalizeVictimsPersons(payload.persons)
    : structuredClone(request.persons || []);
  const caseData = payload.caseData
    ? normalizeVictimsCaseData(payload.caseData)
    : structuredClone(request.caseData || {});
  const documents = payload.documents
    ? normalizeDocuments(state, payload.documents, "VICTIMAS", at)
    : structuredClone(request.documents || []);
  validateExternalIdPolicy(state, "VICTIMAS", externalId, at);
  requireReference(
    state,
    "laws",
    law,
    "VICTIMAS",
    at,
    "Ley o programa no válido",
  );
  serviceFromState(state, "VICTIMAS", service, at);
  requireReference(
    state,
    "regions",
    region,
    "VICTIMAS",
    at,
    "Cobertura no válida",
  );
  if (persons.length < 1) {
    throw businessError("Registre al menos una persona vinculada");
  }
  return { externalId, law, service, region, persons, caseData, documents };
}

function catalogsFor(state, auth, at) {
  const investigation = hasCapability(
    auth,
    CAPABILITIES.CONSULTAR_CATALOGO_SERVICIOS,
    { area: "INVESTIGACION" },
  )
    ? publishedServices(state, "INVESTIGACION", at)
    : [];
  const victims = hasCapability(
    auth,
    CAPABILITIES.CONSULTAR_CATALOGO_SERVICIOS,
    { area: "VICTIMAS" },
  )
    ? publishedServices(state, "VICTIMAS", at)
    : [];
  return {
    investigationServices: investigation.map(({ id, name }) => ({
      id,
      label: name,
    })),
    victimServices: victims.map(({ id, name }) => ({ id, label: name })),
    regions: publishedReferences(state, "regions", "AMBAS", at),
    laws: publishedReferences(state, "laws", "VICTIMAS", at),
    proceduralStages: publishedReferences(
      state,
      "proceduralStages",
      "INVESTIGACION",
      at,
    ),
    priorityTypes: publishedReferences(
      state,
      "priorityTypes",
      "INVESTIGACION",
      at,
    ),
    investigationDocumentTypes: publishedReferences(
      state,
      "documentTypes",
      "INVESTIGACION",
      at,
    ),
    victimDocumentTypes: publishedReferences(
      state,
      "documentTypes",
      "VICTIMAS",
      at,
    ),
  };
}

function normalizeRequestedItems(state, area, payload, at) {
  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : [{ service: payload.service, region: payload.region, law: payload.law }];
  if (rawItems.length === 0) {
    throw businessError("Registre al menos un ítem de servicio");
  }
  return rawItems.map((raw) => {
    const service = text(raw.service);
    const region = text(raw.region || payload.region);
    const law = text(raw.law || payload.law) || null;
    serviceFromState(state, area, service, at);
    requireReference(state, "regions", region, area, at, "Cobertura no válida");
    if (area === "VICTIMAS") {
      requireReference(
        state,
        "laws",
        law,
        area,
        at,
        "Ley o programa no válido",
      );
    }
    return { service, region, law };
  });
}

function normalizeInvestigationIntake(state, payload, at) {
  const identifierType = text(payload.identifierType || "SPOA").toUpperCase();
  const externalId = text(payload.spoa || payload.externalId);
  const conduct = text(payload.delito || payload.conduct);
  if (identifierType === "SPOA" && !/^\d{21}$/.test(externalId)) {
    throw businessError("SPOA debe contener 21 dígitos");
  }
  if (identifierType !== "SPOA" && !externalId) {
    throw businessError("El identificador del proceso es obligatorio");
  }
  if (!conduct) throw businessError("Delito o conducta es obligatorio");
  const persons = normalizeInvestigationPersons(payload.persons);
  if (!persons.length)
    throw businessError("Registre al menos una persona relacionada");
  const caseData = normalizeInvestigationCaseData(
    state,
    payload,
    identifierType,
    conduct,
    at,
  );
  const differentialApproach = {
    applies: Boolean(payload.differentialApproach?.applies),
    detail: text(payload.differentialApproach?.detail) || null,
  };
  if (differentialApproach.applies && !differentialApproach.detail) {
    throw businessError("Describa el enfoque diferencial aplicable");
  }
  const priority = {
    type: text(payload.priority?.type || "ORDINARIA").toUpperCase(),
    reason: text(payload.priority?.reason) || null,
    support: text(payload.priority?.support) || null,
  };
  requireReference(
    state,
    "priorityTypes",
    priority.type,
    "INVESTIGACION",
    at,
    "Prioridad no válida",
  );
  if (
    priority.type !== "ORDINARIA" &&
    (!priority.reason || !priority.support)
  ) {
    throw businessError("La prioridad requiere causal y soporte");
  }
  const documents = normalizeDocuments(
    state,
    payload.documents,
    "INVESTIGACION",
    at,
  );
  return {
    externalId,
    conduct,
    persons,
    caseData,
    differentialApproach,
    priority,
    documents,
  };
}

function normalizeInvestigationCaseData(
  state,
  payload,
  identifierType,
  conduct,
  at,
) {
  const stage = text(payload.proceduralStage).toUpperCase();
  requireReference(
    state,
    "proceduralStages",
    stage,
    "INVESTIGACION",
    at,
    "Etapa procesal no válida",
  );
  const caseData = {
    identifierType,
    processReference: text(payload.processReference),
    conduct,
    proceduralStage: stage,
    hearingApplies: Boolean(payload.hearingApplies),
    hearingDate: text(payload.hearingDate) || null,
    facts: text(payload.facts),
    hypothesis: text(payload.hypothesis),
    requiredWork: text(payload.requiredWork),
  };
  for (const [field, label] of [
    ["processReference", "proceso o caso"],
    ["facts", "hechos"],
    ["hypothesis", "hipótesis"],
    ["requiredWork", "labores requeridas"],
  ]) {
    if (!caseData[field])
      throw businessError(`La información de ${label} es obligatoria`);
  }
  if (caseData.hearingApplies && !caseData.hearingDate) {
    throw businessError("Registre la fecha de audiencia");
  }
  return caseData;
}

function normalizeInvestigationPersons(persons) {
  if (!Array.isArray(persons)) return [];
  return persons.map((person) => {
    const alias = text(person.alias);
    const relation = text(person.relationship);
    if (!alias || !relation) {
      throw businessError(
        "Cada persona relacionada requiere identificación y relación con el caso",
      );
    }
    return { alias, relationship: relation, notes: text(person.notes) || null };
  });
}

function normalizeVictimsIntake(state, payload, at) {
  const externalId = text(payload.externalId);
  const law = text(payload.law);
  validateExternalIdPolicy(state, "VICTIMAS", externalId, at);
  requireReference(
    state,
    "laws",
    law,
    "VICTIMAS",
    at,
    "Ley o programa no válido",
  );
  const persons = normalizeVictimsPersons(payload.persons);
  if (!persons.length)
    throw businessError("Registre al menos una persona vinculada");
  return {
    externalId,
    law,
    persons,
    caseData: normalizeVictimsCaseData(payload.caseData || payload),
    documents: normalizeDocuments(state, payload.documents, "VICTIMAS", at),
  };
}

function normalizeVictimsCaseData(source) {
  const caseData = {
    processReference: text(source.processReference),
    hearingApplies: Boolean(source.hearingApplies),
    hearingDate: text(source.hearingDate) || null,
    facts: text(source.facts),
  };
  if (!caseData.processReference || !caseData.facts) {
    throw businessError("Proceso y hechos son obligatorios");
  }
  if (caseData.hearingApplies && !caseData.hearingDate) {
    throw businessError("Registre la fecha de audiencia");
  }
  return caseData;
}

function normalizeVictimsPersons(persons) {
  if (!Array.isArray(persons)) return [];
  return persons.map((person) => {
    const alias = text(person.alias);
    const type = text(person.type).toUpperCase();
    const relationship = text(person.relationship);
    const familyGroup = text(person.familyGroup);
    const contact = {
      phone: text(person.contact?.phone) || null,
      email: text(person.contact?.email) || null,
      preferredChannel: text(person.contact?.preferredChannel) || null,
    };
    if (!alias || !["DIRECTA", "INDIRECTA"].includes(type) || !familyGroup) {
      throw businessError(
        "Cada persona requiere identificación, tipo y núcleo familiar",
      );
    }
    if (type === "INDIRECTA" && !relationship) {
      throw businessError(
        "La víctima indirecta requiere parentesco o relación",
      );
    }
    if (!contact.phone && !contact.email) {
      throw businessError("Cada persona requiere al menos un dato de contacto");
    }
    return {
      alias,
      type,
      relationship: relationship || null,
      familyGroup,
      contact,
    };
  });
}

function normalizeDocuments(state, documents, area, at) {
  if (!Array.isArray(documents) || !documents.length) {
    throw businessError("Registre al menos un documento o formato aplicable");
  }
  return documents.map((document) => {
    const type = text(document.type).toUpperCase();
    const reference = text(document.reference);
    requireReference(
      state,
      "documentTypes",
      type,
      area,
      at,
      "Tipo de documento no válido",
    );
    if (!reference)
      throw businessError("La referencia documental es obligatoria");
    return { type, reference };
  });
}

function publishedReferences(state, catalogName, area, at) {
  const date = at.slice(0, 10);
  return (state.catalogs[catalogName] || [])
    .filter(
      (entry) =>
        (entry.area === area || entry.area === "AMBAS" || area === "AMBAS") &&
        entry.status === "PUBLICADO" &&
        (!entry.validFrom || entry.validFrom <= date) &&
        (!entry.validTo || date < entry.validTo),
    )
    .map(({ id, label }) => ({ id, label }));
}

function requireReference(state, catalogName, value, area, at, message) {
  if (
    !publishedReferences(state, catalogName, area, at).some(
      (entry) => entry.id === value,
    )
  ) {
    throw businessError(message);
  }
}

function validateExternalIdPolicy(state, area, value, at) {
  const date = at.slice(0, 10);
  const policy = (state.catalogs.identifierPolicies || []).find(
    (entry) =>
      entry.area === area &&
      entry.field === "externalId" &&
      entry.status === "PUBLICADO" &&
      (!entry.validFrom || entry.validFrom <= date) &&
      (!entry.validTo || date < entry.validTo),
  );
  if (!value && (policy?.requireNonEmpty ?? true)) {
    throw businessError(
      "El identificador del proceso o radicado es obligatorio",
    );
  }
  if (value && policy?.approved && policy.pattern) {
    let matches = false;
    try {
      matches = new RegExp(policy.pattern).test(value);
    } catch {
      throw new AppError(
        500,
        "INVALID_IDENTIFIER_POLICY",
        "La política configurada para el identificador no es válida",
      );
    }
    if (!matches) {
      throw businessError(
        policy.validationMessage ||
          "El identificador no cumple la política vigente",
      );
    }
  }
}

function assertUniqueVictimsExternalId(
  state,
  externalId,
  currentRequestId = null,
) {
  if (
    state.requests.some(
      (request) =>
        request.area === "VICTIMAS" &&
        request.externalId === externalId &&
        request.id !== currentRequestId,
    )
  ) {
    throw businessError(
      "El identificador de la solicitud de Víctimas ya existe",
    );
  }
}

function validateServiceRequirements(
  state,
  area,
  requestedItems,
  documents,
  at,
) {
  const suppliedTypes = new Set(documents.map((document) => document.type));
  const documentCatalog = publishedReferences(state, "documentTypes", area, at);
  const errors = requestedItems.flatMap((requested, index) => {
    const service = serviceFromState(state, area, requested.service, at);
    const missing = (service.requiredDocumentTypes || []).filter(
      (type) => !suppliedTypes.has(type),
    );
    if (!missing.length) return [];
    return [
      {
        item: index + 1,
        serviceId: service.id,
        serviceName: service.name,
        missingDocumentTypes: missing.map((type) => ({
          id: type,
          label: catalogLabel(documentCatalog, type) || type,
        })),
      },
    ];
  });
  if (errors.length) {
    const message = errors
      .map(
        (error) =>
          `Ítem ${error.item} — ${error.serviceName}: adjunte ${error.missingDocumentTypes
            .map((entry) => entry.label)
            .join(", ")}`,
      )
      .join(". ");
    throw businessError(message, { items: errors });
  }
}

function versionForVictimsItem(request, item) {
  ensureVictimsVersions(request);
  const versionNumber =
    item.submissionVersion || request.versions.at(-1).version;
  const version = request.versions.find(
    (candidate) => candidate.version === versionNumber,
  );
  if (!version) {
    throw businessError("No existe la versión de solicitud vinculada al ítem");
  }
  return version;
}

function addProductVersion(item, { type, reference, author, at, status }) {
  item.products ||= [];
  const version =
    item.products.filter((product) => product.type === type).length + 1;
  const product = {
    id: `PROD-${item.id}-${type}-${version}`,
    itemId: item.id,
    type,
    reference,
    version,
    author,
    createdAt: at,
    status,
  };
  item.products.push(product);
  item.reportReference = reference;
  return product;
}

function updateLatestProduct(item, type, changes) {
  item.products ||= [];
  if (!item.products.length && item.reportReference) {
    item.products.push({
      id: `PROD-${item.id}-${type}-1`,
      itemId: item.id,
      type,
      reference: item.reportReference,
      version: 1,
      author: null,
      createdAt: null,
      status: "ENTREGADO",
    });
  }
  const product = [...item.products]
    .reverse()
    .find((candidate) => candidate.type === type);
  if (!product) {
    throw businessError("No existe un producto entregado para esta decisión");
  }
  Object.assign(product, changes);
}

function presentedProducts(area, item) {
  if (item.products?.length) return structuredClone(item.products);
  if (!item.reportReference) return [];
  return [
    {
      id: `PROD-${item.id}-LEGACY-1`,
      itemId: item.id,
      type: area === "VICTIMAS" ? "F171" : "INFORME_INVESTIGACION",
      reference: item.reportReference,
      version: 1,
      author: null,
      createdAt: null,
      status: item.status === "CERRADA" ? "APROBADO" : "ENTREGADO",
    },
  ];
}

function problemRouting(state, request, item, at) {
  const date = at.slice(0, 10);
  const route = (state.catalogs.problemRoutes || []).find(
    (candidate) =>
      candidate.area === request.area &&
      (candidate.region === "*" || candidate.region === item.region) &&
      candidate.status === "PUBLICADO" &&
      (!candidate.validFrom || candidate.validFrom <= date) &&
      (!candidate.validTo || date < candidate.validTo),
  );
  return route
    ? {
        routeId: route.id,
        routeVersion: route.version,
        status: "EN_BANDEJA",
        scopeType: route.scopeType,
        region: item.region,
        recipientRole: route.recipientRole,
      }
    : {
        routeId: null,
        routeVersion: null,
        status: "PENDIENTE_CONFIGURACION",
        scopeType: null,
        region: item.region,
        recipientRole: null,
      };
}

function serviceFromState(state, area, id, at) {
  const service = publishedServices(state, area, at.slice(0, 10)).find(
    (entry) => entry.id === id,
  );
  if (!service) throw businessError("Servicio no válido o fuera de vigencia");
  return service;
}

function serviceFromStateById(state, id) {
  return state.catalogs.services.find((entry) => entry.id === id) || null;
}

function childItemId(prefix, number, index, count) {
  return count === 1
    ? `${prefix}-${number}`
    : `${prefix}-${number}-${String(index + 1).padStart(2, "0")}`;
}

function normalizeAreaPath(value) {
  const normalized = text(value).toUpperCase();
  if (normalized === "INVESTIGACION" || normalized === "VICTIMAS") {
    return normalized;
  }
  throw new AppError(404, "AREA_NOT_FOUND", "Área no encontrada");
}

function trackingFor(item) {
  const approvedTermPolicy =
    item.termSnapshot?.value &&
    item.termSnapshot?.dayType &&
    item.termSnapshot?.calendarId;
  if (!item.dueDate || !approvedTermPolicy) {
    return { configured: false };
  }
  const today = new Date().toISOString().slice(0, 10);
  const daysRemaining = Math.ceil(
    (new Date(`${item.dueDate}T00:00:00.000Z`) -
      new Date(`${today}T00:00:00.000Z`)) /
      86_400_000,
  );
  return {
    configured: true,
    daysRemaining,
    semaphoreCode: daysRemaining < 0 ? "VENCIDO" : "EN_PLAZO",
    semaphore: daysRemaining < 0 ? "Vencido" : "En plazo",
    opportunityCode:
      daysRemaining < 0 ? "FUERA_DE_TERMINO" : "OPORTUNO_A_LA_FECHA",
    opportunity: daysRemaining < 0 ? "Fuera de término" : "Oportuno a la fecha",
    label: daysRemaining < 0 ? "Vencido" : "En plazo",
  };
}

function dashboard(requests, area) {
  const areaRequests = requests.filter((request) => request.area === area);
  const items = areaRequests.flatMap((request) => request.items);
  return {
    requestCount: areaRequests.length,
    personCount: areaRequests.reduce(
      (total, request) => total + (request.persons?.length || 0),
      0,
    ),
    itemCount: items.length,
    assignmentCount: items.filter((item) => item.assigneeId).length,
    pendingItemCount: items.filter((item) =>
      [
        "RADICADA",
        "PENDIENTE_APROBACION_PAG",
        "PENDIENTE_EXCEPCION",
        "PENDIENTE_REASIGNACION",
      ].includes(item.status),
    ).length,
    activeItemCount: items.filter((item) =>
      ["ASIGNADA", "EN_EJECUCION", "INFORME_ENTREGADO"].includes(item.status),
    ).length,
    closedItemCount: items.filter((item) => item.status === "CERRADA").length,
  };
}

function aggregateRequestStatus(items) {
  if (!items.length) return "SIN_ITEMS";
  const statuses = new Set(items.map((item) => item.status));
  if (statuses.size === 1) return items[0].status;
  if (items.every((item) => item.status === "CERRADA")) return "CERRADA";
  if (statuses.has("CERRADA")) return "PARCIALMENTE_CERRADA";
  return "EN_TRAMITE";
}

function aggregateRequestCounts(items) {
  return {
    totalItems: items.length,
    closedItems: items.filter((item) => item.status === "CERRADA").length,
    assignedItems: items.filter((item) => item.assigneeId).length,
  };
}

function findItem(state, itemId, area) {
  for (const request of state.requests) {
    const item = request.items.find((candidate) => candidate.id === itemId);
    if (item && request.area === area) return { request, item };
  }
  throw new AppError(404, "DEMO_ITEM_NOT_FOUND", "Ítem no encontrado");
}

function transition(item, to, actor, message, at) {
  const from = item.status;
  item.status = to;
  item.timeline.push(timelineEvent(at, from, to, actor, message));
}

function applyProgress(item, payload, actor, at) {
  const observation = text(payload.observation);
  if (!observation)
    throw businessError("La observación de la actuación es obligatoria");
  item.activities ||= [];
  item.activities.push({ at, actor, observation });
  item.timeline.push(
    timelineEvent(
      at,
      item.status,
      item.status,
      actor,
      `Actuación registrada · ${observation}`,
    ),
  );
}

function assertState(item, allowed) {
  if (!allowed.includes(item.status)) {
    throw new AppError(
      409,
      "INVALID_DEMO_TRANSITION",
      `Estado ${item.status} no permite esta acción`,
      { allowed },
    );
  }
}

function rejectClientAssignee(payload) {
  if (
    payload.assigneeId ||
    payload.investigadorId ||
    payload.peritoId ||
    payload.funcionarioId
  ) {
    throw businessError(
      "El responsable no puede seleccionarse manualmente; la asignación es automática",
    );
  }
}

function catalogLabel(catalog, value) {
  return catalog.find((item) => item.id === value)?.label || null;
}

function text(value) {
  return String(value || "").trim();
}

function timelineEvent(at, from, to, actor, message) {
  return { at, from, to, actor, message };
}

function businessError(message, details = undefined) {
  return new AppError(400, "DEMO_VALIDATION_ERROR", message, details);
}
