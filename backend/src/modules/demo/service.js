import { DEMO_PARAMETERS } from "../../infrastructure/demo/seeds.js";
import { AppError } from "../../shared/errors.js";
import { assignInvestigation } from "../assignment/strategies/investigation.js";
import { assignVictims } from "../assignment/strategies/victims.js";

const ACTIVE_STATES = new Set([
  "ASIGNADA",
  "EN_EJECUCION",
  "INFORME_ENTREGADO",
]);
const CATALOGS = Object.freeze({
  investigationServices: [
    { id: "INVESTIGACION_CAMPO", label: "Investigación de campo" },
    { id: "BALISTICA", label: "Balística forense" },
    { id: "ANALISIS_INFORMACION", label: "Análisis de información" },
  ],
  victimServices: [
    { id: "PSICOLOGICO", label: "Peritaje psicológico" },
    {
      id: "ADMINISTRATIVO_FINANCIERO",
      label: "Peritaje administrativo/financiero",
    },
  ],
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
  clock = () => new Date().toISOString(),
}) {
  function bootstrap(auth) {
    const state = repository.snapshot();
    const requests = visibleRequests(state, auth).map((request) =>
      presentRequest(state, request),
    );
    return {
      demo: true,
      productName:
        "SIGIP-DP — Sistema de Información para la Gestión Investigativa y Pericial de la Defensoría del Pueblo",
      allowedAreas: allowedAreas(auth.role),
      catalogs: CATALOGS,
      parameters: DEMO_PARAMETERS,
      requests,
      dashboards: {
        INVESTIGACION: dashboard(requests, "INVESTIGACION"),
        VICTIMAS: dashboard(requests, "VICTIMAS"),
      },
    };
  }

  function createInvestigation(auth, payload) {
    assertRole(auth, ["defensor"]);
    rejectClientAssignee(payload);
    const spoa = text(payload.spoa);
    const delito = text(payload.delito);
    const service = text(payload.service);
    const region = text(payload.region);
    if (!/^\d{21}$/.test(spoa))
      throw businessError("SPOA debe contener 21 dígitos");
    requireCatalog(
      service,
      CATALOGS.investigationServices,
      "Especialidad no válida",
    );
    requireCatalog(region, CATALOGS.regions, "Cobertura no válida");
    if (!delito) throw businessError("Delito es obligatorio");

    return repository.transaction((state) => {
      const sequence = state.counters.investigation++;
      const number = String(sequence).padStart(4, "0");
      const at = clock();
      const request = {
        id: `INV-2026-${number}`,
        area: "INVESTIGACION",
        ownerUserId: auth.sub,
        externalId: spoa,
        summary: delito,
        createdAt: at,
        items: [
          {
            id: `MT-2026-${number}`,
            service,
            region,
            law: null,
            status: "RADICADA",
            assigneeId: null,
            dueDate: null,
            progress: 0,
            reportReference: null,
            assignment: null,
            timeline: [
              timelineEvent(
                at,
                null,
                "RADICADA",
                auth.sub,
                "Solicitud de misión radicada",
              ),
            ],
          },
        ],
      };
      state.requests.unshift(request);
      return presentRequest(state, request);
    });
  }

  function assignInvestigationItem(auth, itemId) {
    assertRole(auth, ["defensor"]);
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      if (auth.role === "defensor" && request.ownerUserId !== auth.sub)
        throw forbidden();
      assertState(item, ["RADICADA", "PENDIENTE_REASIGNACION"]);
      const at = clock();
      const assignment = assignInvestigation({
        professionals: professionalsWithLoad(state),
        service: item.service,
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
        item.dueDate = addCalendarDays(
          at,
          DEMO_PARAMETERS.investigationTermDays,
        );
        transition(
          item,
          "ASIGNADA",
          "sistema-demo",
          assignment.selectedReason,
          at,
        );
      }
      return presentRequest(state, request);
    });
  }

  function startInvestigation(auth, itemId) {
    return executorTransition(
      auth,
      itemId,
      "INVESTIGACION",
      ["investigador"],
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
      ["investigador"],
      ["EN_EJECUCION"],
      (item, at) => applyProgress(item, payload, auth.sub, at),
    );
  }

  function deliverInvestigation(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "INVESTIGACION",
      ["investigador"],
      ["EN_EJECUCION"],
      (item, at) => {
        const reference = text(payload.reference);
        if (!reference)
          throw businessError("La referencia del informe es obligatoria");
        item.reportReference = reference;
        item.progress = 100;
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
    assertRole(auth, ["pag_investigacion"]);
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertState(item, ["INFORME_ENTREGADO"]);
      transition(
        item,
        "CERRADA",
        auth.sub,
        "Entrega aprobada por PAG Investigación",
        clock(),
      );
      return presentRequest(state, request);
    });
  }

  function returnInvestigationDelivery(auth, itemId, payload) {
    assertRole(auth, ["pag_investigacion"]);
    const observation = text(payload.observation);
    if (!observation) {
      throw businessError("La observación de devolución es obligatoria");
    }
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertState(item, ["INFORME_ENTREGADO"]);
      transition(
        item,
        "EN_EJECUCION",
        auth.sub,
        `Informe devuelto para corrección · ${observation}`,
        clock(),
      );
      return presentRequest(state, request);
    });
  }

  function createVictims(auth, payload) {
    assertRole(auth, ["rjv"]);
    rejectClientAssignee(payload);
    const externalId = text(payload.externalId);
    const law = text(payload.law);
    const service = text(payload.service);
    const region = text(payload.region);
    const victimCount = Number(payload.victimCount);
    if (!/^RAD-\d{4}-\d{4}$/.test(externalId)) {
      throw businessError(
        "Use un número de radicado con formato RAD-AAAA-NNNN",
      );
    }
    requireCatalog(law, CATALOGS.laws, "Ley o programa no válido");
    requireCatalog(service, CATALOGS.victimServices, "Peritaje no válido");
    requireCatalog(region, CATALOGS.regions, "Cobertura no válida");
    if (!Number.isInteger(victimCount) || victimCount < 1) {
      throw businessError("Registre al menos una persona vinculada");
    }

    return repository.transaction((state) => {
      const sequence = state.counters.victims++;
      const number = String(sequence).padStart(4, "0");
      const at = clock();
      const request = {
        id: `SVP-2026-${number}`,
        area: "VICTIMAS",
        ownerUserId: auth.sub,
        externalId,
        summary: `${service} · ${law}`,
        createdAt: at,
        persons: Array.from({ length: victimCount }, (_, index) => ({
          alias: `Persona vinculada ${String(index + 1).padStart(3, "0")}`,
          type: index === 0 ? "DIRECTA" : "INDIRECTA",
        })),
        items: [
          {
            id: `VIC-ITEM-DEMO-${number}`,
            service,
            region,
            law,
            status: "PENDIENTE_APROBACION_PAG",
            assigneeId: null,
            dueDate: null,
            progress: 0,
            reportReference: null,
            assignment: null,
            timeline: [
              timelineEvent(
                at,
                null,
                "PENDIENTE_APROBACION_PAG",
                auth.sub,
                "Solicitud pericial enviada a aprobación previa",
              ),
            ],
          },
        ],
      };
      request.versions = [
        victimsSubmissionVersion({
          request,
          item: request.items[0],
          version: 1,
          at,
          actor: auth.sub,
          correctionSummary: null,
        }),
      ];
      state.requests.unshift(request);
      return presentRequest(state, request);
    });
  }

  function approveVictimsAndAssign(auth, itemId) {
    assertRole(auth, ["pag_victimas"]);
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
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
        service: item.service,
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
        item.dueDate = addCalendarDays(at, DEMO_PARAMETERS.victimsTermDays);
        transition(
          item,
          "ASIGNADA",
          "sistema-demo",
          assignment.selectedReason,
          at,
        );
      }
      return presentRequest(state, request);
    });
  }

  function returnVictimsRequest(auth, itemId, payload) {
    assertRole(auth, ["pag_victimas"]);
    const observation = text(payload.observation);
    if (!observation) {
      throw businessError("La observación de devolución es obligatoria");
    }

    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      assertState(item, ["PENDIENTE_APROBACION_PAG"]);
      ensureVictimsVersions(request, item);
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
      return presentRequest(state, request);
    });
  }

  function correctAndResubmitVictims(auth, itemId, payload) {
    assertRole(auth, ["rjv"]);
    const correctionSummary = text(payload.correctionSummary);
    if (!correctionSummary) {
      throw businessError("La descripción de la corrección es obligatoria");
    }

    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      if (request.ownerUserId !== auth.sub) throw forbidden();
      assertState(item, ["DEVUELTA"]);
      ensureVictimsVersions(request, item);

      const corrected = correctedVictimsData(request, item, payload);
      request.externalId = corrected.externalId;
      request.summary = `${corrected.service} · ${corrected.law}`;
      request.persons = Array.from(
        { length: corrected.victimCount },
        (_, index) => ({
          alias: `Persona vinculada ${String(index + 1).padStart(3, "0")}`,
          type: index === 0 ? "DIRECTA" : "INDIRECTA",
        }),
      );
      item.service = corrected.service;
      item.region = corrected.region;
      item.law = corrected.law;
      item.assigneeId = null;
      item.assignment = null;
      item.dueDate = null;

      const at = clock();
      request.versions.push(
        victimsSubmissionVersion({
          request,
          item,
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
      return presentRequest(state, request);
    });
  }

  function startVictims(auth, itemId) {
    return executorTransition(
      auth,
      itemId,
      "VICTIMAS",
      ["perito"],
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
      ["perito"],
      ["EN_EJECUCION"],
      (item, at) => applyProgress(item, payload, auth.sub, at),
    );
  }

  function finishVictims(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "VICTIMAS",
      ["perito"],
      ["EN_EJECUCION"],
      (item, at) => {
        const reference = text(payload.f171Reference);
        if (!/^F171-\d{4}-[A-Z0-9-]+$/.test(reference)) {
          throw businessError("Use una referencia con formato F171-AAAA-NNNN");
        }
        item.reportReference = reference;
        item.progress = 100;
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
    assertRole(auth, ["administrador"]);
    repository.reset();
    return bootstrap(auth);
  }

  function executorTransition(auth, itemId, area, roles, states, mutate) {
    assertRole(auth, roles);
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, area);
      if (!auth.executorId || item.assigneeId !== auth.executorId)
        throw forbidden();
      assertState(item, states);
      mutate(item, clock());
      return presentRequest(state, request);
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
    reset,
  };
}

function visibleRequests(state, auth) {
  const allAreaRoles = new Set([
    "administrador",
    "pag_investigacion",
    "pag_victimas",
  ]);
  if (allAreaRoles.has(auth.role)) {
    return state.requests.filter((request) => {
      if (auth.role === "pag_investigacion")
        return request.area === "INVESTIGACION";
      if (auth.role === "pag_victimas") return request.area === "VICTIMAS";
      return true;
    });
  }
  if (["defensor", "rjv"].includes(auth.role)) {
    return state.requests.filter((request) => request.ownerUserId === auth.sub);
  }
  if (["investigador", "perito"].includes(auth.role)) {
    return state.requests
      .map((request) => ({
        ...request,
        items: request.items.filter(
          (item) => item.assigneeId === auth.executorId,
        ),
      }))
      .filter((request) => request.items.length > 0);
  }
  return [];
}

function allowedAreas(role) {
  if (role === "administrador") return ["INVESTIGACION", "VICTIMAS"];
  if (["defensor", "investigador", "pag_investigacion"].includes(role))
    return ["INVESTIGACION"];
  if (["rjv", "perito", "pag_victimas"].includes(role)) return ["VICTIMAS"];
  return [];
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

function presentRequest(state, request) {
  const professionals = new Map(
    state.professionals.map((professional) => [professional.id, professional]),
  );
  const users = new Map(state.users.map((user) => [user.id, user.fullName]));
  return {
    ...structuredClone(request),
    requesterName: users.get(request.ownerUserId) || "Solicitante",
    items: request.items.map((item) => ({
      ...structuredClone(item),
      assigneeName: professionals.get(item.assigneeId)?.displayName || null,
      serviceLabel: serviceLabel(item.service),
      regionLabel: catalogLabel(CATALOGS.regions, item.region),
      lawLabel: item.law ? catalogLabel(CATALOGS.laws, item.law) : null,
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

function ensureVictimsVersions(request, item) {
  if (request.versions?.length) return;
  request.versions = [
    victimsSubmissionVersion({
      request,
      item,
      version: 1,
      at: request.createdAt,
      actor: request.ownerUserId,
      correctionSummary: null,
    }),
  ];
}

function victimsSubmissionVersion({
  request,
  item,
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
      service: item.service,
      region: item.region,
      law: item.law,
    },
  };
}

function correctedVictimsData(request, item, payload) {
  const externalId = text(payload.externalId ?? request.externalId);
  const law = text(payload.law ?? item.law);
  const service = text(payload.service ?? item.service);
  const region = text(payload.region ?? item.region);
  const victimCount = Number(payload.victimCount ?? request.persons?.length);
  if (!/^RAD-\d{4}-\d{4}$/.test(externalId)) {
    throw businessError("Use un número de radicado con formato RAD-AAAA-NNNN");
  }
  requireCatalog(law, CATALOGS.laws, "Ley o programa no válido");
  requireCatalog(service, CATALOGS.victimServices, "Peritaje no válido");
  requireCatalog(region, CATALOGS.regions, "Cobertura no válida");
  if (!Number.isInteger(victimCount) || victimCount < 1) {
    throw businessError("Registre al menos una persona vinculada");
  }
  return { externalId, law, service, region, victimCount };
}

function dashboard(requests, area) {
  const items = requests
    .filter((request) => request.area === area)
    .flatMap((request) => request.items);
  return {
    requests: requests.filter((request) => request.area === area).length,
    pending: items.filter((item) =>
      [
        "RADICADA",
        "PENDIENTE_APROBACION_PAG",
        "PENDIENTE_REASIGNACION",
      ].includes(item.status),
    ).length,
    active: items.filter((item) =>
      ["ASIGNADA", "EN_EJECUCION", "INFORME_ENTREGADO"].includes(item.status),
    ).length,
    closed: items.filter((item) => item.status === "CERRADA").length,
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
  const progress = Number(payload.progress);
  const observation = text(payload.observation);
  if (!Number.isInteger(progress) || progress < 1 || progress > 99) {
    throw businessError("El avance debe estar entre 1 y 99");
  }
  if (!observation)
    throw businessError("La observación de avance es obligatoria");
  item.progress = progress;
  item.timeline.push(
    timelineEvent(
      at,
      item.status,
      item.status,
      actor,
      `${progress}% · ${observation}`,
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

function assertRole(auth, allowed) {
  if (!allowed.includes(auth.role)) throw forbidden();
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

function serviceLabel(service) {
  return (
    catalogLabel(CATALOGS.investigationServices, service) ||
    catalogLabel(CATALOGS.victimServices, service) ||
    service
  );
}

function catalogLabel(catalog, value) {
  return catalog.find((item) => item.id === value)?.label || null;
}

function text(value) {
  return String(value || "").trim();
}

function addCalendarDays(isoDate, days) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function timelineEvent(at, from, to, actor, message) {
  return { at, from, to, actor, message };
}

function businessError(message) {
  return new AppError(400, "DEMO_VALIDATION_ERROR", message);
}

function forbidden() {
  return new AppError(
    403,
    "DEMO_FORBIDDEN",
    "No tiene permisos para esta acción",
  );
}
