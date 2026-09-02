export const DEMO_PARAMETERS = Object.freeze({
  version: "DEMO-2026-01",
  label: "Valores de demostracion — no aprobados para operacion institucional",
  investigationTermDays: 20,
  victimsTermDays: 30,
  dayType: "CALENDARIO_DEMO",
  tieBreak: "menor carga, ultima asignacion mas antigua, identificador estable",
});

export function createDemoSeed() {
  const now = "2026-09-01T14:00:00.000Z";
  return {
    counters: { investigation: 2, victims: 2 },
    users: [
      demoUser(
        "demo-admin",
        "Alex Demo",
        "administrador",
        "Administración demo",
        "AMBAS",
      ),
      demoUser(
        "demo-defensor",
        "Diana Demo",
        "defensor",
        "Defensor/a",
        "INVESTIGACION",
      ),
      demoUser(
        "demo-investigador",
        "Iván Demo",
        "investigador",
        "Investigador/a",
        "INVESTIGACION",
        "inv-demo-02",
      ),
      demoUser(
        "demo-pag-investigacion",
        "Paula Demo",
        "pag_investigacion",
        "PAG Investigación",
        "INVESTIGACION",
      ),
      demoUser(
        "demo-rjv",
        "Renata Demo",
        "rjv",
        "Representante judicial de víctimas",
        "VICTIMAS",
      ),
      demoUser(
        "demo-pag-victimas",
        "Samuel Demo",
        "pag_victimas",
        "PAG / Supervisor Víctimas",
        "VICTIMAS",
      ),
      demoUser(
        "demo-perito-psicologia",
        "Pilar Demo",
        "perito",
        "Perito psicología",
        "VICTIMAS",
        "per-demo-psi-01",
      ),
      demoUser(
        "demo-perito-financiero",
        "Fabio Demo",
        "perito",
        "Perito administrativo/financiero",
        "VICTIMAS",
        "per-demo-fin-01",
      ),
    ],
    professionals: [
      {
        id: "inv-demo-01",
        area: "INVESTIGACION",
        displayName: "Investigador Demo Norte",
        specialties: ["INVESTIGACION_CAMPO", "BALISTICA"],
        coverages: ["BOGOTA"],
        laws: [],
        available: true,
        demoBaseLoad: 1,
        lastAssignmentAt: "2026-08-20T10:00:00.000Z",
      },
      {
        id: "inv-demo-02",
        area: "INVESTIGACION",
        displayName: "Investigadora Demo Centro",
        specialties: ["INVESTIGACION_CAMPO", "ANALISIS_INFORMACION"],
        coverages: ["BOGOTA", "CUNDINAMARCA"],
        laws: [],
        available: true,
        demoBaseLoad: 0,
        lastAssignmentAt: "2026-08-10T10:00:00.000Z",
      },
      {
        id: "inv-demo-03",
        area: "INVESTIGACION",
        displayName: "Investigador Demo Occidente",
        specialties: [
          "INVESTIGACION_CAMPO",
          "BALISTICA",
          "ANALISIS_INFORMACION",
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
        displayName: "Perito Demo Psicología Centro",
        specialties: ["PSICOLOGICO"],
        coverages: ["BOGOTA", "CUNDINAMARCA"],
        laws: ["LEY_1448", "LEY_975"],
        available: true,
        demoBaseLoad: 0,
        lastAssignmentAt: "2026-08-12T10:00:00.000Z",
      },
      {
        id: "per-demo-psi-02",
        area: "VICTIMAS",
        displayName: "Perito Demo Psicología Ley 975",
        specialties: ["PSICOLOGICO"],
        coverages: ["BOGOTA"],
        laws: ["LEY_975"],
        available: true,
        demoBaseLoad: 0,
        lastAssignmentAt: "2026-08-05T10:00:00.000Z",
      },
      {
        id: "per-demo-fin-01",
        area: "VICTIMAS",
        displayName: "Perito Demo Financiero Centro",
        specialties: ["ADMINISTRATIVO_FINANCIERO"],
        coverages: ["BOGOTA", "CUNDINAMARCA"],
        laws: ["LEY_1448", "LEY_975"],
        available: true,
        demoBaseLoad: 0,
        lastAssignmentAt: "2026-08-15T10:00:00.000Z",
      },
      {
        id: "per-demo-fin-02",
        area: "VICTIMAS",
        displayName: "Perito Demo Financiero No Disponible",
        specialties: ["ADMINISTRATIVO_FINANCIERO"],
        coverages: ["BOGOTA"],
        laws: ["LEY_1448"],
        available: false,
        demoBaseLoad: 0,
        lastAssignmentAt: null,
      },
    ],
    requests: [
      {
        id: "INV-DEMO-0001",
        area: "INVESTIGACION",
        ownerUserId: "demo-defensor",
        externalId: "110016000049202600001",
        summary: "Caso sintético de investigación de campo",
        createdAt: now,
        items: [
          {
            id: "INV-ITEM-DEMO-0001",
            service: "INVESTIGACION_CAMPO",
            region: "BOGOTA",
            law: null,
            status: "EN_EJECUCION",
            assigneeId: "inv-demo-01",
            dueDate: "2026-09-21",
            progress: 40,
            reportReference: null,
            assignment: seedAssignment(
              "inv-demo-01",
              "Investigador Demo Norte",
              now,
            ),
            timeline: [
              event(
                now,
                null,
                "RADICADA",
                "demo-defensor",
                "Solicitud sintética radicada",
              ),
              event(
                now,
                "RADICADA",
                "ASIGNADA",
                "sistema-demo",
                "Reparto demostrativo ejecutado",
              ),
              event(
                now,
                "ASIGNADA",
                "EN_EJECUCION",
                "demo-investigador",
                "Misión iniciada",
              ),
            ],
          },
        ],
      },
      {
        id: "VIC-DEMO-0001",
        area: "VICTIMAS",
        ownerUserId: "demo-rjv",
        externalId: "RAD-DEMO-2026-001",
        summary: "Caso sintético de valoración financiera",
        createdAt: now,
        persons: [{ alias: "Víctima sintética 001", type: "DIRECTA" }],
        items: [
          {
            id: "VIC-ITEM-DEMO-0001",
            service: "ADMINISTRATIVO_FINANCIERO",
            region: "BOGOTA",
            law: "LEY_1448",
            status: "CERRADA",
            assigneeId: "per-demo-fin-01",
            dueDate: "2026-10-01",
            progress: 100,
            reportReference: "F171-DEMO-0001",
            assignment: seedAssignment(
              "per-demo-fin-01",
              "Perito Demo Financiero Centro",
              now,
            ),
            timeline: [
              event(
                now,
                null,
                "PENDIENTE_APROBACION_PAG",
                "demo-rjv",
                "Solicitud pericial sintética enviada",
              ),
              event(
                now,
                "PENDIENTE_APROBACION_PAG",
                "APROBADA_REPARTO",
                "demo-pag-victimas",
                "Aprobación previa demo",
              ),
              event(
                now,
                "APROBADA_REPARTO",
                "ASIGNADA",
                "sistema-demo",
                "Reparto demostrativo ejecutado",
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
                "F-171 ficticio registrado; cierre directo",
              ),
            ],
          },
        ],
      },
    ],
  };
}

function demoUser(id, fullName, role, roleLabel, area, executorId = null) {
  return {
    id,
    document: id,
    password: null,
    fullName,
    accounts: [
      {
        id: `account-${id}`,
        email: `${id}@demo.invalid`,
        role,
        roleLabel,
        area,
        initials: fullName
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join(""),
        executorId,
      },
    ],
  };
}

function seedAssignment(selectedId, selectedName, createdAt) {
  return {
    policyVersion: DEMO_PARAMETERS.version,
    demoParametersLabel: DEMO_PARAMETERS.label,
    selectedId,
    selectedName,
    selectedReason: "Semilla reproducible de demostración",
    evaluated: [],
    createdAt,
  };
}

function event(at, from, to, actor, message) {
  return { at, from, to, actor, message };
}
