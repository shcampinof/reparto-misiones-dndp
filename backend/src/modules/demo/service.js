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
const REFERENCE_CATALOGS = Object.freeze({
  regions: [
    { id: "BOGOTA", label: "Bogotá" },
    { id: "CUNDINAMARCA", label: "Cundinamarca" },
  ],
  laws: [
    { id: "LEY_1448", label: "Ley 1448" },
    { id: "LEY_975", label: "Ley 975" },
  ],
});

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
    const spoa = text(payload.spoa);
    const delito = text(payload.delito);
    if (!/^\d{21}$/.test(spoa))
      throw businessError("SPOA debe contener 21 dígitos");
    if (!delito) throw businessError("Delito es obligatorio");

    return repository.transaction((state) => {
      const at = clock();
      const requestedItems = normalizeRequestedItems(
        state,
        "INVESTIGACION",
        payload,
        at,
      );
      const sequence = state.counters.investigation++;
      const number = String(sequence).padStart(4, "0");
      const request = {
        id: `INV-2026-${number}`,
        area: "INVESTIGACION",
        ownerUserId: auth.sub,
        externalId: spoa,
        summary: delito,
        createdAt: at,
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
            assignment: null,
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
      state.requests.unshift(request);
      return presentRequestForAuth(state, request, auth);
    });
  }

  function assignInvestigationItem(auth, itemId) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertCapability(auth, CAPABILITIES.EJECUTAR_REPARTO_INVESTIGACION, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
      });
      assertState(item, ["RADICADA", "PENDIENTE_REASIGNACION"]);
      const at = clock();
      const assignment = assignInvestigation({
        professionals: professionalsWithLoad(state),
        serviceId: item.service,
        specialtyIds: item.specialtyIds,
        region: item.region,
        now: at,
      });
      item.assignment = assignment;
      if (!assignment.selectedId) {
        transition(
          item,
          "PENDIENTE_REASIGNACION",
          auth.sub,
          assignment.selectedReason,
          at,
        );
      } else {
        item.assigneeId = assignment.selectedId;
        item.dueDate = null;
        recordAssignmentInstant(state, assignment.selectedId, at);
        transition(
          item,
          "ASIGNADA",
          "sistema-demo",
          assignment.selectedReason,
          at,
        );
      }
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
        item.reportReference = reference;
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
      });
      assertState(item, ["INFORME_ENTREGADO"]);
      transition(
        item,
        "CERRADA",
        auth.sub,
        "Entrega aprobada por PAG Investigación",
        clock(),
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
      });
      assertState(item, ["INFORME_ENTREGADO"]);
      transition(
        item,
        "EN_EJECUCION",
        auth.sub,
        `Informe devuelto para corrección · ${observation}`,
        clock(),
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
    const externalId = text(payload.externalId);
    const law = text(payload.law);
    const persons = normalizePersons(payload);
    if (!/^RAD-\d{4}-\d{4}$/.test(externalId)) {
      throw businessError(
        "Use un número de radicado con formato RAD-AAAA-NNNN",
      );
    }
    requireCatalog(law, REFERENCE_CATALOGS.laws, "Ley o programa no válido");
    if (persons.length < 1) {
      throw businessError("Registre al menos una persona vinculada");
    }

    return repository.transaction((state) => {
      const at = clock();
      const requestedItems = normalizeRequestedItems(
        state,
        "VICTIMAS",
        payload,
        at,
      );
      const sequence = state.counters.victims++;
      const number = String(sequence).padStart(4, "0");
      const request = {
        id: `SVP-2026-${number}`,
        area: "VICTIMAS",
        ownerUserId: auth.sub,
        externalId,
        summary: `${requestedItems.length} servicio(s) · ${law}`,
        createdAt: at,
        persons,
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
            law: requested.law || law,
            status: "PENDIENTE_APROBACION_PAG",
            assigneeId: null,
            dueDate: null,
            termSnapshot: structuredClone(service.termPolicy),
            activities: [],
            reportReference: null,
            assignment: null,
            operations: [],
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
      });
      assertState(item, ["PENDIENTE_APROBACION_PAG"]);
      const at = clock();
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
        transition(
          item,
          "PENDIENTE_REASIGNACION",
          "sistema-demo",
          assignment.selectedReason,
          at,
        );
      } else {
        item.assigneeId = assignment.selectedId;
        item.dueDate = null;
        recordAssignmentInstant(state, assignment.selectedId, at);
        transition(
          item,
          "ASIGNADA",
          "sistema-demo",
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
      });
      assertState(item, ["PENDIENTE_APROBACION_PAG"]);
      ensureVictimsVersions(request);
      const at = clock();
      const currentVersion = request.versions.at(-1);
      currentVersion.review = {
        decision: "DEVUELTA",
        observation,
        at,
        actor: auth.sub,
      };
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
      });
      assertState(item, ["DEVUELTA"]);
      ensureVictimsVersions(request);

      const at = clock();
      const corrected = correctedVictimsData(state, request, item, payload, at);
      const service = serviceFromState(
        state,
        "VICTIMAS",
        corrected.service,
        at,
      );
      request.externalId = corrected.externalId;
      request.summary = `${request.items.length} servicio(s) · ${corrected.law}`;
      request.persons = Array.from(
        { length: corrected.victimCount },
        (_, index) => ({
          alias: `Persona vinculada ${String(index + 1).padStart(3, "0")}`,
          type: index === 0 ? "DIRECTA" : "INDIRECTA",
        }),
      );
      item.service = corrected.service;
      item.serviceVersion = service.version;
      item.specialtyIds = structuredClone(service.specialtyIds);
      item.termSnapshot = structuredClone(service.termPolicy);
      item.region = corrected.region;
      item.law = corrected.law;
      item.assigneeId = null;
      item.assignment = null;
      item.dueDate = null;

      request.versions.push(
        victimsSubmissionVersion({
          request,
          version: request.versions.length + 1,
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
        if (!/^F171-\d{4}-[A-Z0-9-]+$/.test(reference)) {
          throw businessError("Use una referencia con formato F171-AAAA-NNNN");
        }
        item.reportReference = reference;
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
        actor: auth.sub,
        createdAt: at,
        decisionCode: null,
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
      const allItems = request.items;
      return {
        ...request,
        aggregateStatus: aggregateRequestStatus(allItems),
        aggregateCounts: aggregateRequestCounts(allItems),
        items: allItems.filter((item) =>
          hasCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, {
            area: request.area,
            ownerUserId: request.ownerUserId,
            assigneeId: item.assigneeId,
          }),
        ),
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
      regionLabel: catalogLabel(REFERENCE_CATALOGS.regions, item.region),
      lawLabel: item.law
        ? catalogLabel(REFERENCE_CATALOGS.laws, item.law)
        : null,
      tracking: trackingFor(item),
      documents: item.reportReference
        ? [
            {
              id: `doc-${item.id}-v1`,
              type:
                request.area === "VICTIMAS"
                  ? "F-171"
                  : "Informe de investigación",
              reference: item.reportReference,
              version: 1,
            },
          ]
        : [],
    })),
  };
}

function presentRequestForAuth(state, request, auth) {
  const visibleItems = request.items.filter((item) =>
    hasCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, {
      area: request.area,
      ownerUserId: request.ownerUserId,
      assigneeId: item.assigneeId,
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
  if (request.versions?.length) return;
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
    data: {
      externalId: request.externalId,
      persons: structuredClone(request.persons || []),
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
  const victimCount = Number(payload.victimCount ?? request.persons?.length);
  if (!/^RAD-\d{4}-\d{4}$/.test(externalId)) {
    throw businessError("Use un número de radicado con formato RAD-AAAA-NNNN");
  }
  requireCatalog(law, REFERENCE_CATALOGS.laws, "Ley o programa no válido");
  serviceFromState(state, "VICTIMAS", service, at);
  requireCatalog(region, REFERENCE_CATALOGS.regions, "Cobertura no válida");
  if (!Number.isInteger(victimCount) || victimCount < 1) {
    throw businessError("Registre al menos una persona vinculada");
  }
  return { externalId, law, service, region, victimCount };
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
    regions: REFERENCE_CATALOGS.regions,
    laws: REFERENCE_CATALOGS.laws,
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
    requireCatalog(region, REFERENCE_CATALOGS.regions, "Cobertura no válida");
    if (area === "VICTIMAS") {
      requireCatalog(law, REFERENCE_CATALOGS.laws, "Ley o programa no válido");
    }
    return { service, region, law };
  });
}

function normalizePersons(payload) {
  if (Array.isArray(payload.persons)) {
    return payload.persons.map((person, index) => ({
      alias:
        text(person.alias) ||
        `Persona vinculada ${String(index + 1).padStart(3, "0")}`,
      type:
        text(person.type).toUpperCase() === "INDIRECTA"
          ? "INDIRECTA"
          : "DIRECTA",
      relationship: text(person.relationship) || null,
      familyGroup: text(person.familyGroup) || null,
    }));
  }
  const victimCount = Number(payload.victimCount);
  if (!Number.isInteger(victimCount) || victimCount < 1) return [];
  return Array.from({ length: victimCount }, (_, index) => ({
    alias: `Persona vinculada ${String(index + 1).padStart(3, "0")}`,
    type: index === 0 ? "DIRECTA" : "INDIRECTA",
  }));
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
  const terminal = item.status === "CERRADA";
  const approvedTermPolicy =
    item.termSnapshot?.value &&
    item.termSnapshot?.dayType &&
    item.termSnapshot?.calendarId;
  if (!item.dueDate || !approvedTermPolicy) {
    return {
      daysRemaining: null,
      semaphoreCode: terminal ? "CERRADO" : "PENDIENTE_PARAMETRO",
      semaphore: terminal ? "Cerrado" : "Sin configuración aprobada",
      opportunityCode: terminal ? "CERRADO" : "NO_CALCULABLE",
      opportunity: terminal ? "Cerrado" : "No calculable",
      label: terminal
        ? "Ítem cerrado"
        : "Plazo y calendario pendientes de definición funcional",
    };
  }
  const today = new Date().toISOString().slice(0, 10);
  const daysRemaining = Math.ceil(
    (new Date(`${item.dueDate}T00:00:00.000Z`) -
      new Date(`${today}T00:00:00.000Z`)) /
      86_400_000,
  );
  return {
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
    assignedItems: items.filter((item) => item.assignment).length,
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

function requireCatalog(value, catalog, message) {
  if (!catalog.some((item) => item.id === value)) throw businessError(message);
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

function businessError(message) {
  return new AppError(400, "DEMO_VALIDATION_ERROR", message);
}
