import { grantsForRole } from "../../modules/core/auth/capabilities.js";
import { createCatalogSeed } from "./catalog-seeds.js";
import { createInvestigationTeam } from "./investigation-team.js";
import { sampleF171Attachment } from "./sample-f171.js";
import { enqueueWorkflowNotifications } from "../../modules/core/notifications/outbox.js";

export const DEMO_PARAMETERS = Object.freeze({
  version: "PRE-ORACLE-2026-09",
  label: "Política técnica pre-Oracle; valores institucionales pendientes",
  tieBreak: "menor carga, ultima asignacion mas antigua, identificador estable",
  pendingDecisionCodes: ["DEC-PLZ-001", "DEC-TURNO-001"],
});

export function createDemoSeed() {
  const now = "2026-09-01T14:00:00.000Z";
  const seed = {
    counters: { investigation: 4, victims: 4 },
    catalogs: createCatalogSeed(),
    operations: [seedProblem(now)],
    audit: [],
    investigationPolicies: [],
    calendars: [],
    outbox: [],
    investigationTextPolicy: {
      version: "DEMO-TEXTO-1",
      maxLength: 10000,
      kind: "LIMITE_TECNICO_DEMO",
      approvalEvidence: null,
    },
    users: [
      demoUser(
        "demo-admin",
        "Andrés Molina",
        "administrador",
        "Administrador del sistema",
        "AMBAS",
      ),
      demoUser(
        "demo-defensor",
        "Laura Méndez",
        "defensor",
        "Defensor/a solicitante",
        "INVESTIGACION",
      ),
      demoUser(
        "demo-investigador",
        "Julián Rojas",
        "investigador",
        "Investigador/a",
        "INVESTIGACION",
        "inv-demo-02",
      ),
      demoUser(
        "demo-pag-investigacion",
        "Paula Serrano",
        "pag_investigacion",
        "PAG Investigación",
        "INVESTIGACION",
      ),
      demoUser(
        "demo-gestor-regional-investigacion",
        "Camila Duarte",
        "gestor_operativo_regional",
        "Gestor operativo regional",
        "INVESTIGACION",
        null,
        "BOGOTA",
      ),
      demoUser(
        "demo-gestor-central-excepciones",
        "Felipe Cárdenas",
        "gestor_central_excepciones",
        "Gestor central de excepciones",
        "INVESTIGACION",
      ),
      demoUser(
        "demo-defensor-regional",
        "Diana Salcedo",
        "defensor_regional",
        "Defensor regional",
        "INVESTIGACION",
        null,
        "BOGOTA",
      ),
      demoUser(
        "demo-rjv",
        "Natalia Pardo",
        "rjv",
        "Representante judicial de víctimas",
        "VICTIMAS",
      ),
      demoUser(
        "demo-pag-victimas",
        "Ricardo Beltrán",
        "pag_victimas",
        "PAG Víctimas",
        "VICTIMAS",
      ),
      demoUser(
        "demo-perito-psicologia",
        "Mariana Torres",
        "perito",
        "Perito/a en psicología",
        "VICTIMAS",
        "per-demo-psi-01",
      ),
      demoUser(
        "demo-perito-financiero",
        "Santiago Acosta",
        "perito",
        "Perito/a financiero",
        "VICTIMAS",
        "per-demo-fin-01",
      ),
    ],
    professionals: [
      {
        id: "inv-demo-01",
        area: "INVESTIGACION",
        displayName: "Mateo Herrera",
        specialties: ["ESP_INV_CAMPO", "ESP_INV_BALISTICA"],
        coverages: ["BOGOTA"],
        laws: [],
        available: true,
        demoBaseLoad: 1,
        lastAssignmentAt: "2026-08-20T10:00:00.000Z",
      },
      {
        id: "inv-demo-02",
        area: "INVESTIGACION",
        displayName: "Julián Rojas",
        specialties: ["ESP_INV_CAMPO", "ESP_INV_ANALISIS_INFO"],
        coverages: ["BOGOTA", "CUNDINAMARCA"],
        laws: [],
        available: true,
        demoBaseLoad: 0,
        lastAssignmentAt: "2026-08-10T10:00:00.000Z",
      },
      {
        id: "inv-demo-03",
        area: "INVESTIGACION",
        displayName: "Valeria Castro",
        specialties: [
          "ESP_INV_CAMPO",
          "ESP_INV_BALISTICA",
          "ESP_INV_ANALISIS_INFO",
        ],
        coverages: ["BOGOTA"],
        laws: [],
        available: false,
        demoBaseLoad: 0,
        lastAssignmentAt: null,
      },
      {
        id: "per-demo-psi-01",
        area: "VICTIMAS",
        displayName: "Mariana Torres",
        specialties: ["DISC_VIC_PSICOLOGIA"],
        coverages: ["BOGOTA", "CUNDINAMARCA"],
        laws: [
          "LEY_1448",
          "LEY_975",
          "LEY_1098",
          "LEY_1257",
          "LEY_1719",
          "LEY_1761",
          "LEY_1773",
          "LEY_985",
        ],
        available: true,
        demoBaseLoad: 0,
        lastAssignmentAt: "2026-08-12T10:00:00.000Z",
      },
      {
        id: "per-demo-psi-02",
        area: "VICTIMAS",
        displayName: "Elena Vargas",
        specialties: ["DISC_VIC_PSICOLOGIA"],
        coverages: ["BOGOTA"],
        laws: ["LEY_975"],
        available: true,
        demoBaseLoad: 0,
        lastAssignmentAt: "2026-08-05T10:00:00.000Z",
      },
      {
        id: "per-demo-fin-01",
        area: "VICTIMAS",
        displayName: "Santiago Acosta",
        specialties: ["DISC_VIC_FINANCIERA"],
        coverages: ["BOGOTA", "CUNDINAMARCA"],
        laws: [
          "LEY_1448",
          "LEY_975",
          "LEY_1098",
          "LEY_1257",
          "LEY_1719",
          "LEY_1761",
          "LEY_1773",
          "LEY_985",
        ],
        available: true,
        demoBaseLoad: 0,
        lastAssignmentAt: "2026-08-15T10:00:00.000Z",
      },
      {
        id: "per-demo-fin-02",
        area: "VICTIMAS",
        displayName: "Tomás Medina",
        specialties: ["DISC_VIC_FINANCIERA"],
        coverages: ["BOGOTA"],
        laws: ["LEY_1448"],
        available: false,
        demoBaseLoad: 0,
        lastAssignmentAt: null,
      },
    ],
    requests: [
      {
        id: "INV-2026-0001",
        area: "INVESTIGACION",
        ownerUserId: "demo-defensor",
        externalId: "110016000049202600001",
        summary: "Misión de investigación de campo",
        createdAt: now,
        items: [
          {
            id: "MT-2026-0001",
            service: "SVC_INV_VERIFICACION_TERRENO",
            serviceVersion: 1,
            specialtyIds: ["ESP_INV_CAMPO"],
            region: "BOGOTA",
            law: null,
            status: "EN_EJECUCION",
            assigneeId: "inv-demo-01",
            dueDate: "2026-09-21",
            termSnapshot: pendingTermPolicy(),
            activities: [
              {
                at: now,
                actor: "demo-investigador",
                observation: "Misión iniciada",
              },
            ],
            reportReference: null,
            assignment: seedAssignment("inv-demo-01", "Mateo Herrera", now),
            operations: [seedProblem(now)],
            timeline: [
              event(
                now,
                null,
                "RADICADA",
                "demo-defensor",
                "Solicitud de misión radicada",
              ),
              event(
                now,
                "RADICADA",
                "ASIGNADA",
                "sistema-demo",
                "Asignación automática ejecutada",
              ),
              event(
                now,
                "ASIGNADA",
                "EN_EJECUCION",
                "demo-investigador",
                "Misión iniciada",
              ),
              event(
                now,
                "EN_EJECUCION",
                "EN_EJECUCION",
                "demo-investigador",
                "Problema reportado · Insumo documental ilegible",
              ),
            ],
          },
          {
            id: "MT-2026-0001-02",
            service: "SVC_INV_ANALISIS_BALISTICO",
            serviceVersion: 1,
            specialtyIds: ["ESP_INV_BALISTICA"],
            region: "CUNDINAMARCA",
            law: null,
            status: "PENDIENTE_EXCEPCION",
            assigneeId: null,
            dueDate: null,
            termSnapshot: pendingTermPolicy(),
            activities: [],
            reportReference: null,
            assignment: pendingAssignment(now),
            operations: [],
            timeline: [
              event(
                now,
                null,
                "RADICADA",
                "demo-defensor",
                "Segundo ítem de la solicitud radicado",
              ),
              event(
                now,
                "RADICADA",
                "PENDIENTE_EXCEPCION",
                "motor-reparto",
                "Sin candidato elegible para la cobertura vigente",
              ),
            ],
          },
        ],
      },
      {
        id: "SVP-2026-0001",
        area: "VICTIMAS",
        ownerUserId: "demo-rjv",
        externalId: "RAD-2026-0001",
        summary: "Solicitud de valoración financiera",
        createdAt: now,
        persons: [{ alias: "Persona vinculada 001", type: "DIRECTA" }],
        items: [
          {
            id: "VIC-ITEM-DEMO-0001",
            service: "SVC_VIC_LIQUIDACION_PERJUICIOS",
            serviceVersion: 1,
            specialtyIds: ["DISC_VIC_FINANCIERA"],
            region: "BOGOTA",
            law: "LEY_1448",
            status: "CERRADA",
            assigneeId: "per-demo-fin-01",
            dueDate: "2026-10-01",
            termSnapshot: pendingTermPolicy(),
            activities: [],
            reportReference: "F171-2026-0001",
            assignment: seedAssignment(
              "per-demo-fin-01",
              "Santiago Acosta",
              now,
            ),
            operations: [],
            timeline: [
              event(
                now,
                null,
                "PENDIENTE_APROBACION_PAG",
                "demo-rjv",
                "Solicitud pericial enviada",
              ),
              event(
                now,
                "PENDIENTE_APROBACION_PAG",
                "APROBADA_REPARTO",
                "demo-pag-victimas",
                "Aprobación previa registrada",
              ),
              event(
                now,
                "APROBADA_REPARTO",
                "ASIGNADA",
                "sistema-demo",
                "Asignación automática ejecutada",
              ),
              event(
                now,
                "ASIGNADA",
                "EN_EJECUCION",
                "demo-perito-financiero",
                "Peritaje iniciado",
              ),
              event(
                now,
                "EN_EJECUCION",
                "CERRADA",
                "demo-perito-financiero",
                "F-171 registrado; servicio cerrado",
              ),
            ],
          },
        ],
      },
      {
        id: "INV-2026-0002",
        area: "INVESTIGACION",
        ownerUserId: "demo-defensor",
        externalId: "110016000049202600002",
        summary: "Misión de análisis de información",
        createdAt: "2026-08-28T15:00:00.000Z",
        items: [
          {
            id: "MT-2026-0002",
            service: "SVC_INV_ANALISIS_DATOS",
            serviceVersion: 1,
            specialtyIds: ["ESP_INV_ANALISIS_INFO"],
            region: "BOGOTA",
            law: null,
            status: "INFORME_ENTREGADO",
            assigneeId: "inv-demo-02",
            dueDate: "2026-09-17",
            termSnapshot: pendingTermPolicy(),
            activities: [],
            reportReference: "INF-2026-0002",
            assignment: seedAssignment(
              "inv-demo-02",
              "Julián Rojas",
              "2026-08-28T15:10:00.000Z",
            ),
            operations: [],
            timeline: [
              event(
                "2026-08-28T15:00:00.000Z",
                null,
                "RADICADA",
                "demo-defensor",
                "Solicitud radicada y validada",
              ),
              event(
                "2026-08-28T15:10:00.000Z",
                "RADICADA",
                "ASIGNADA",
                "sistema-demo",
                "Asignación automática ejecutada",
              ),
              event(
                "2026-08-29T13:00:00.000Z",
                "ASIGNADA",
                "EN_EJECUCION",
                "demo-investigador",
                "Misión iniciada",
              ),
              event(
                "2026-09-01T16:00:00.000Z",
                "EN_EJECUCION",
                "INFORME_ENTREGADO",
                "demo-investigador",
                "Informe entregado para revisión PAG",
              ),
            ],
          },
        ],
      },
      {
        id: "INV-2026-0003",
        area: "INVESTIGACION",
        ownerUserId: "demo-defensor",
        externalId: "110016000049202600003",
        summary: "Misión de balística forense cerrada",
        createdAt: "2026-08-12T14:00:00.000Z",
        items: [
          {
            id: "MT-2026-0003",
            service: "SVC_INV_ANALISIS_BALISTICO",
            serviceVersion: 1,
            specialtyIds: ["ESP_INV_BALISTICA"],
            region: "BOGOTA",
            law: null,
            status: "CERRADA",
            assigneeId: "inv-demo-01",
            dueDate: "2026-09-01",
            termSnapshot: pendingTermPolicy(),
            activities: [],
            reportReference: "INF-2026-0003",
            assignment: seedAssignment(
              "inv-demo-01",
              "Mateo Herrera",
              "2026-08-12T14:05:00.000Z",
            ),
            operations: [],
            timeline: [
              event(
                "2026-08-12T14:00:00.000Z",
                null,
                "RADICADA",
                "demo-defensor",
                "Solicitud de misión radicada",
              ),
              event(
                "2026-08-12T14:05:00.000Z",
                "RADICADA",
                "ASIGNADA",
                "sistema-demo",
                "Asignación automática ejecutada",
              ),
              event(
                "2026-08-13T13:00:00.000Z",
                "ASIGNADA",
                "EN_EJECUCION",
                "demo-investigador",
                "Misión iniciada",
              ),
              event(
                "2026-08-25T15:00:00.000Z",
                "EN_EJECUCION",
                "INFORME_ENTREGADO",
                "demo-investigador",
                "Informe entregado",
              ),
              event(
                "2026-08-26T14:00:00.000Z",
                "INFORME_ENTREGADO",
                "CERRADA",
                "demo-pag-investigacion",
                "Entrega aprobada por PAG Investigación",
              ),
            ],
          },
        ],
      },
      {
        id: "SVP-2026-0002",
        area: "VICTIMAS",
        ownerUserId: "demo-rjv",
        externalId: "RAD-2026-0002",
        summary: "Solicitud pericial pendiente de aprobación previa",
        createdAt: "2026-09-01T15:00:00.000Z",
        persons: [
          { alias: "Persona vinculada 002", type: "DIRECTA" },
          { alias: "Persona vinculada 003", type: "INDIRECTA" },
        ],
        items: [
          {
            id: "VIC-ITEM-DEMO-0002",
            service: "SVC_VIC_EVALUACION_PSICOLOGICA",
            serviceVersion: 1,
            specialtyIds: ["DISC_VIC_PSICOLOGIA"],
            region: "BOGOTA",
            law: "LEY_975",
            status: "PENDIENTE_APROBACION_PAG",
            assigneeId: null,
            dueDate: null,
            termSnapshot: pendingTermPolicy(),
            activities: [],
            reportReference: null,
            assignment: null,
            operations: [],
            timeline: [
              event(
                "2026-09-01T15:00:00.000Z",
                null,
                "PENDIENTE_APROBACION_PAG",
                "demo-rjv",
                "Solicitud enviada a aprobación previa",
              ),
            ],
          },
          {
            id: "VIC-ITEM-DEMO-0002-02",
            service: "SVC_VIC_LIQUIDACION_PERJUICIOS",
            serviceVersion: 1,
            specialtyIds: ["DISC_VIC_FINANCIERA"],
            region: "BOGOTA",
            law: "LEY_975",
            status: "ASIGNADA",
            assigneeId: "per-demo-fin-01",
            dueDate: null,
            termSnapshot: pendingTermPolicy(),
            activities: [],
            reportReference: null,
            assignment: seedAssignment(
              "per-demo-fin-01",
              "Santiago Acosta",
              "2026-09-01T15:10:00.000Z",
            ),
            operations: [],
            timeline: [
              event(
                "2026-09-01T15:00:00.000Z",
                null,
                "PENDIENTE_APROBACION_PAG",
                "demo-rjv",
                "Segundo ítem pericial enviado",
              ),
              event(
                "2026-09-01T15:05:00.000Z",
                "PENDIENTE_APROBACION_PAG",
                "APROBADA_REPARTO",
                "demo-pag-victimas",
                "Aval previo registrado para el ítem financiero",
              ),
              event(
                "2026-09-01T15:10:00.000Z",
                "APROBADA_REPARTO",
                "ASIGNADA",
                "sistema-demo",
                "Asignación automática ejecutada",
              ),
            ],
          },
        ],
      },
      {
        id: "SVP-2026-0003",
        area: "VICTIMAS",
        ownerUserId: "demo-rjv",
        externalId: "RAD-2026-0003",
        summary: "Solicitud de valoración psicológica asignada",
        createdAt: "2026-08-30T14:00:00.000Z",
        persons: [{ alias: "Persona vinculada 004", type: "DIRECTA" }],
        items: [
          {
            id: "VIC-ITEM-DEMO-0003",
            service: "SVC_VIC_EVALUACION_PSICOLOGICA",
            serviceVersion: 1,
            specialtyIds: ["DISC_VIC_PSICOLOGIA"],
            region: "BOGOTA",
            law: "LEY_1448",
            status: "ASIGNADA",
            assigneeId: "per-demo-psi-01",
            dueDate: "2026-09-29",
            termSnapshot: pendingTermPolicy(),
            activities: [],
            reportReference: null,
            assignment: seedAssignment(
              "per-demo-psi-01",
              "Mariana Torres",
              "2026-08-30T14:10:00.000Z",
            ),
            operations: [],
            timeline: [
              event(
                "2026-08-30T14:00:00.000Z",
                null,
                "PENDIENTE_APROBACION_PAG",
                "demo-rjv",
                "Solicitud pericial enviada",
              ),
              event(
                "2026-08-30T14:05:00.000Z",
                "PENDIENTE_APROBACION_PAG",
                "APROBADA_REPARTO",
                "demo-pag-victimas",
                "Aprobación previa registrada",
              ),
              event(
                "2026-08-30T14:10:00.000Z",
                "APROBADA_REPARTO",
                "ASIGNADA",
                "sistema-demo",
                "Asignación automática ejecutada",
              ),
            ],
          },
        ],
      },
    ],
  };
  const team = createInvestigationTeam();
  seed.users.push(
    demoUser(
      "demo-investigador-mateo",
      "Mateo Herrera",
      "investigador",
      "Investigador/a",
      "INVESTIGACION",
      "inv-demo-01",
    ),
  );
  seed.professionals.push(...team);
  seed.users.push(
    ...team.map((professional) =>
      demoUser(
        `demo-${professional.id}`,
        professional.displayName,
        "investigador",
        "Investigador/a · especialista",
        "INVESTIGACION",
        professional.id,
      ),
    ),
  );
  for (const professional of seed.professionals) {
    professional.baseRegion ??= professional.coverages[0];
    professional.jobTitle ??=
      professional.area === "INVESTIGACION"
        ? "Profesional de investigación"
        : "Profesional pericial";
    professional.availabilityLabel ??= professional.available
      ? "Disponible"
      : "No disponible por novedad";
  }
  const scenarios = [
    [
      "fotografia",
      "SVC_INV_FOTO_VIDEO",
      "BOGOTA",
      "EN_EJECUCION",
      "Registro audiovisual del lugar de los hechos",
      "Luis Sandoval",
    ],
    [
      "digital",
      "SVC_INV_DIGITAL",
      "BOGOTA",
      "INFORME_ENTREGADO",
      "Análisis de mensajes aportados por la defensa",
      "Carolina Durán",
    ],
    [
      "campo-medellin",
      "SVC_INV_VERIFICACION_TERRENO",
      "ANTIOQUIA",
      "ASIGNADA",
      "Entrevistas y verificación de ubicación en Medellín",
      "Manuel Restrepo",
    ],
    [
      "documentologia",
      "SVC_INV_GRAFOLOGIA",
      "VALLE_CAUCA",
      "CERRADA",
      "Verificación documental de una firma cuestionada",
      "Beatriz Campos",
    ],
    [
      "ambiental",
      "SVC_INV_AMBIENTAL",
      "META",
      "ASIGNADA",
      "Análisis de informes sobre afectación ambiental",
      "Pablo Montero",
    ],
  ];
  for (const [
    index,
    [specialist, serviceId, region, status, summary, person],
  ] of scenarios.entries()) {
    const number = String(101 + index).padStart(4, "0");
    const at = `2026-10-0${index + 1}T14:00:00.000Z`;
    const professional = team.find(
      (entry) => entry.id === `inv-presentacion-${specialist}`,
    );
    const service = seed.catalogs.services.find(
      (entry) => entry.id === serviceId,
    );
    const stages = [
      "RADICADA",
      "ASIGNADA",
      ...(["EN_EJECUCION", "INFORME_ENTREGADO", "CERRADA"].includes(status)
        ? ["EN_EJECUCION"]
        : []),
      ...(["INFORME_ENTREGADO", "CERRADA"].includes(status)
        ? ["INFORME_ENTREGADO"]
        : []),
      ...(status === "CERRADA" ? ["CERRADA"] : []),
    ];
    seed.requests.push({
      id: `INV-2026-${number}`,
      area: "INVESTIGACION",
      ownerUserId: "demo-defensor",
      externalId: `1100160000492026${String(101 + index).padStart(5, "0")}`,
      summary,
      createdAt: at,
      persons: [
        {
          alias: person,
          relationship: "Procesado/a",
          notes: "Persona vinculada al caso de presentación",
        },
      ],
      documents: [
        {
          type: "SOLICITUD_DEFENSA",
          reference: `Solicitud de misión ${number}`,
        },
      ],
      caseData: {
        processReference: `Proceso penal 2026-${number}`,
        conduct: summary,
        facts: summary,
        hypothesis:
          "Contrastar la información aportada para apoyar la teoría de la defensa.",
        requiredWork: summary,
        hearingApplies: false,
      },
      items: [
        {
          id: `MT-2026-${number}`,
          service: serviceId,
          serviceVersion: service.version,
          specialtyIds: seed.catalogs.serviceSpecialtyRelations
            .filter((entry) => entry.serviceId === serviceId)
            .map((entry) => entry.specialtyId),
          region,
          law: null,
          status,
          assigneeId: professional.id,
          dueDate: null,
          termSnapshot: pendingTermPolicy(),
          activities: [],
          reportReference: ["INFORME_ENTREGADO", "CERRADA"].includes(status)
            ? `Informe técnico ${number}`
            : null,
          assignment: seedAssignment(
            professional.id,
            professional.displayName,
            at,
          ),
          operations: [],
          timeline: stages.map((stage, position) =>
            event(
              at,
              position ? stages[position - 1] : null,
              stage,
              stage === "CERRADA"
                ? "demo-pag-investigacion"
                : stage === "RADICADA"
                  ? "demo-defensor"
                  : `demo-${professional.id}`,
              "Actividad registrada en la misión",
            ),
          ),
        },
      ],
    });
  }
  seed.counters.investigation = 106;
  migratePresentationRecords(seed, now);
  for (const request of seed.requests)
    enqueueWorkflowNotifications(seed, request, request.createdAt);
  return seed;
}

function migratePresentationRecords(seed, at) {
  for (const request of seed.requests) {
    if (request.area === "INVESTIGACION") {
      const user = seed.users.find((entry) => entry.id === request.ownerUserId);
      request.requester ||= {
        userId: request.ownerUserId,
        fullName: user?.fullName || "Solicitante",
        email: user?.accounts[0]?.email || null,
        role: "defensor",
      };
      request.documents ||= [
        {
          type: "SOLICITUD_DEFENSA",
          reference: `Solicitud de referencia ${request.id}`,
        },
      ];
    }
    for (const item of request.items) {
      if (
        request.area === "INVESTIGACION" &&
        item.termSnapshot?.status !== "APROBADA"
      )
        item.dueDate = null;
      item.products = item.reportReference
        ? [
            seedProduct(
              request.area,
              item,
              request.area === "VICTIMAS"
                ? "REGISTRADO"
                : item.status === "CERRADA"
                  ? "APROBADO"
                  : "ENTREGADO",
              at,
            ),
          ]
        : [];
      item.exception =
        item.status === "PENDIENTE_EXCEPCION"
          ? {
              type: "FALTA_CANDIDATO",
              createdAt: item.assignment?.createdAt || at,
              assignmentPolicyVersion: item.assignment?.policyVersion || null,
              reason:
                item.assignment?.selectedReason || "Sin candidato elegible",
            }
          : null;
      if (request.area === "VICTIMAS") {
        item.submissionVersion = 1;
        item.approvedSubmissionVersion = [
          "APROBADA_REPARTO",
          "ASIGNADA",
          "EN_EJECUCION",
          "CERRADA",
        ].includes(item.status)
          ? 1
          : null;
        item.approval = item.approvedSubmissionVersion
          ? {
              at:
                item.timeline.find((eventEntry) =>
                  ["APROBADA_REPARTO", "ASIGNADA"].includes(eventEntry.to),
                )?.at || at,
              actor: "demo-pag-victimas",
              requestVersion: 1,
            }
          : null;
      }
    }
    if (request.area === "VICTIMAS") {
      request.versions = [seedVictimsVersion(request, at)];
    }
  }
}

function seedProduct(area, item, status, at) {
  const type = area === "VICTIMAS" ? "F171" : "INFORME_INVESTIGACION";
  return {
    id: `PROD-${item.id}-${type}-1`,
    itemId: item.id,
    type,
    reference: item.reportReference,
    ...(area === "VICTIMAS" ? { attachment: sampleF171Attachment(item) } : {}),
    version: 1,
    author:
      item.timeline.find((entry) =>
        area === "VICTIMAS"
          ? entry.to === "CERRADA"
          : entry.to === "INFORME_ENTREGADO",
      )?.actor || null,
    createdAt:
      item.timeline.find((entry) =>
        area === "VICTIMAS"
          ? entry.to === "CERRADA"
          : entry.to === "INFORME_ENTREGADO",
      )?.at || at,
    status,
  };
}

function seedVictimsVersion(request, at) {
  return {
    version: 1,
    submittedAt: request.createdAt || at,
    submittedBy: request.ownerUserId,
    correctionSummary: null,
    reviews: request.items
      .filter((item) => item.approvedSubmissionVersion)
      .map((item) => ({
        itemId: item.id,
        decision: "APROBADA",
        at: item.approval.at,
        actor: item.approval.actor,
      })),
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

function demoUser(
  id,
  fullName,
  role,
  roleLabel,
  area,
  executorId = null,
  region = null,
) {
  return {
    id,
    document: id,
    password: null,
    fullName,
    accounts: [
      {
        id: `account-${id}`,
        email: `${fullName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replaceAll(" ", ".")}@sigip.example`,
        role,
        roleLabel,
        area,
        grants: grantsForRole(role, area, region),
        initials: fullName
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join(""),
        executorId,
        region,
      },
    ],
  };
}

function seedAssignment(selectedId, selectedName, createdAt) {
  return {
    policyVersion: DEMO_PARAMETERS.version,
    policyLabel: DEMO_PARAMETERS.label,
    selectedId,
    selectedName,
    selectedReason:
      "Asignación automática según especialidad, cobertura, disponibilidad y carga",
    evaluated: [],
    createdAt,
  };
}

function pendingAssignment(createdAt) {
  return {
    policyVersion: DEMO_PARAMETERS.version,
    policyLabel: DEMO_PARAMETERS.label,
    selectedId: null,
    selectedName: null,
    selectedReason: "No existe candidato elegible para la cobertura vigente",
    evaluated: [],
    createdAt,
  };
}

function seedProblem(createdAt) {
  return {
    id: "OP-0001",
    type: "PROBLEMA",
    area: "INVESTIGACION",
    requestId: "INV-2026-0001",
    itemId: "MT-2026-0001",
    status: "REGISTRADO",
    reason: "Insumo documental ilegible",
    description: "Se requiere una copia legible para continuar la actuación",
    supportReference: "DOC-INV-0001",
    actor: "demo-investigador",
    createdAt,
    decisionCode: null,
    primaryStatusSnapshot: "EN_EJECUCION",
    routing: {
      routeId: "RUTA-PROBLEMA-INV-REGIONAL",
      routeVersion: 1,
      status: "EN_BANDEJA",
      scopeType: "REGION",
      region: "BOGOTA",
      recipientRole: "gestor_operativo_regional",
    },
  };
}

function pendingTermPolicy() {
  return {
    value: null,
    dayType: null,
    startEvent: null,
    calendarId: null,
    decisionCode: "DEC-PLZ-001",
    label: "Plazo parametrizable por servicio",
  };
}

function event(at, from, to, actor, message) {
  return { at, from, to, actor, message };
}
