import { addTermDays, operationalPolicy } from "../calendars/terms.js";
import { AppError } from "../../../shared/errors.js";

const version = "PROVISIONAL-2026-10-16-v1";
const authorization =
  "Solicitud del usuario 16-oct-2026: implementar criterio lógico con referencia más reciente, pendiente ratificación funcional";
const base = {
  status: "PROVISIONAL",
  operationalEnabled: true,
  implementationAuthorization: authorization,
  version,
  validFrom: "2026-10-16",
  validTo: "2028-01-01",
};

export function applyProvisionalRules(state) {
  state.provisionalRules = {
    version,
    authorization,
    institutionalApproval: false,
  };
  for (const policy of state.catalogs.identifierPolicies || []) {
    if (policy.area === "VICTIMAS" && !policy.approved) {
      policy.requireUnique = false;
      policy.source =
        "Un caso admite varias solicitudes; unicidad en consecutivo de solicitud y reintento idempotente";
    }
  }
  const calendar = {
    id: "CO-PRUEBAS",
    version: "CO-2026-2027-v1",
    weekendDays: [0, 6],
    validFrom: "2026-01-01",
    validTo: "2028-01-01",
    source:
      "Calendario colombiano de pruebas; validar calendario institucional antes del piloto",
    holidays: [
      "2026-01-01",
      "2026-01-12",
      "2026-03-23",
      "2026-04-02",
      "2026-04-03",
      "2026-05-01",
      "2026-05-18",
      "2026-06-08",
      "2026-06-15",
      "2026-06-29",
      "2026-07-20",
      "2026-08-07",
      "2026-08-17",
      "2026-10-12",
      "2026-11-02",
      "2026-11-16",
      "2026-12-08",
      "2026-12-25",
      "2027-01-01",
      "2027-01-11",
      "2027-03-22",
      "2027-03-25",
      "2027-03-26",
      "2027-05-01",
      "2027-05-10",
      "2027-05-31",
      "2027-06-07",
      "2027-07-05",
      "2027-07-20",
      "2027-08-07",
      "2027-08-16",
      "2027-10-18",
      "2027-11-01",
      "2027-11-15",
      "2027-12-08",
      "2027-12-25",
    ],
  };
  state.calendars = [
    ...(state.calendars || []).filter((entry) => entry.id !== calendar.id),
    calendar,
  ];
  for (const service of state.catalogs.services) {
    const investigation = service.area === "INVESTIGACION";
    const field = (state.catalogs.serviceSpecialtyRelations || []).some(
      (entry) =>
        entry.serviceId === service.id && entry.specialtyId === "ESP_INV_CAMPO",
    );
    service.termPolicy = {
      ...base,
      area: service.area,
      value: investigation ? (field ? 25 : 45) : 40,
      dayType: investigation ? "CALENDARIO" : "HABILES",
      startEvent: investigation ? "ASIGNACION" : "RADICACION_COMPLETA",
      calendarId: calendar.id,
      calendarVersion: calendar.version,
      source: investigation
        ? "SD-P03 v10 como referencia de duración; ratificación pendiente"
        : "SD-P06 / I14 como referencia conservada por instrucción del usuario",
      label:
        "Término provisional para pruebas; pendiente ratificación institucional",
    };
    if (service.id === "SVC_VIC_DICTAMEN_PSICOLOGICO") {
      service.status = "RETIRADO";
      service.validTo = "2026-10-16";
      service.history.push({
        at: "2026-10-16T14:00:00Z",
        from: "PUBLICADO",
        to: "RETIRADO",
        actor: "configuracion-versionada",
        reason:
          "Reunión Víctimas 8-oct 21:19–22:19: duplicado de evaluación psicológica; conservar historial",
      });
    }
  }
  state.investigationPolicies = [
    {
      ...base,
      type: "PRORROGA",
      area: "INVESTIGACION",
      maxExtensions: 1,
      durationMode: "HASTA_TERMINO_INICIAL",
      approverRole: "gestor_operativo_regional",
      allowAfterReturn: false,
      requiresProblem: false,
      dayType: "CALENDARIO",
      calendarId: calendar.id,
      calendarVersion: calendar.version,
      source:
        "Reunión 7-oct 20:50–22:42; duración máxima SD-P03 actividad 9; autorización provisional del usuario",
    },
    {
      ...base,
      type: "REMISION",
      area: "INVESTIGACION",
      route: "REGIONAL",
      initiatorRole: "pag_investigacion",
      routerRole: "pag_investigacion",
      source:
        "Reunión 7-oct 48:49–51:36: recepción por PG/PAG de destino y reparto automático",
    },
  ];
  state.victimsPolicies = [
    {
      ...base,
      type: "PRORROGA",
      area: "VICTIMAS",
      maxExtensions: null,
      durationMode: "HASTA_TERMINO_INICIAL",
      approverRole: "pag_victimas",
      requiresProblem: false,
      allowAfterReturn: false,
      dayType: "HABILES",
      calendarId: calendar.id,
      calendarVersion: calendar.version,
      source:
        "Diseño provisional autorizado por usuario: petición motivada del perito, decisión PAG, hasta término inicial; sin límite numérico institucional inferido",
    },
  ];
  // Historical records remain historical; do not invent a fresh clock or due date.
  return state;
}

export function calculateItemTerm(state, item, at, request) {
  const policy = item.termSnapshot;
  if (!operationalPolicy(policy)) {
    item.dueDate = null;
    return;
  }
  const date = new Date(at).toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  });
  if (
    !policy.version ||
    !policy.validFrom ||
    date < policy.validFrom ||
    (policy.validTo && date >= policy.validTo)
  )
    throw new AppError(
      409,
      "TERM_POLICY_NOT_APPLICABLE",
      "La política de términos no está vigente",
    );
  const calendar = state.calendars.find(
    (entry) =>
      entry.id === policy.calendarId &&
      entry.version === policy.calendarVersion,
  );
  const start =
    policy.startEvent === "RADICACION_COMPLETA"
      ? item.completeSubmissionAt ||
        request.completeSubmissionAt ||
        request.createdAt
      : at;
  item.dueDate = addTermDays(
    new Date(start).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }),
    policy.value,
    policy.dayType,
    calendar,
  );
  item.termStartedAt = start;
  item.calendarSnapshot = structuredClone(calendar);
}
