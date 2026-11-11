import { AppError } from "../../shared/errors.js";
import {
  CAPABILITIES,
  assertCapability,
  hasCapability,
} from "../core/auth/capabilities.js";
import { createWorkbook } from "./xlsx.js";
import { validDate, institutionalDate } from "../core/calendars/terms.js";

export function investigationExport({
  state,
  auth,
  requests,
  filters,
  at,
  supervision,
}) {
  assertCapability(auth, CAPABILITIES.EXPORTAR_INVESTIGACION, {
    area: "INVESTIGACION",
    region: auth.region,
    ownerUserId: auth.sub,
  });
  const allowed = [
    "region",
    "assignee",
    "status",
    "from",
    "to",
    "overdue",
    "personnelSearch",
    "availability",
    "personnelRegion",
  ];
  if (
    Object.keys(filters).some(
      (key) => !allowed.includes(key) || typeof filters[key] !== "string",
    )
  )
    throw new AppError(400, "INVALID_FILTER", "Filtros de reporte no válidos");
  if (
    [filters.from, filters.to].some((date) => date && !validDate(date)) ||
    (filters.from && filters.to && filters.from > filters.to)
  )
    throw new AppError(400, "INVALID_PERIOD", "Periodo de reporte no válido");
  if (filters.overdue && filters.overdue !== "true")
    throw new AppError(
      400,
      "INVALID_FILTER",
      "Filtro de vencimiento no válido",
    );
  const visible = requests.filter(
    (request) =>
      request.area === "INVESTIGACION" &&
      (!filters.from || institutionalDate(request.createdAt) >= filters.from) &&
      (!filters.to || institutionalDate(request.createdAt) <= filters.to),
  );
  const rows = [
    [
      "Misión",
      "Ítem",
      "SPOA / identificador",
      "Solicitante",
      "Servicio",
      "Regional",
      "Investigador",
      "Estado",
      "Ingreso UTC",
      "Asignación UTC",
      "Vencimiento",
      "Política de término",
      "Origen",
      "Última actuación UTC",
      "Constancia de verificación",
      "Constancia de envío",
    ],
  ];
  for (const request of visible)
    for (const item of request.items) {
      if (
        (filters.region && filters.region !== item.region) ||
        (filters.assignee && filters.assignee !== item.assigneeId) ||
        (filters.status && filters.status !== item.status) ||
        (filters.overdue &&
          (!item.tracking?.configured ||
            item.tracking.daysRemaining >= 0 ||
            item.status === "CERRADA"))
      )
        continue;
      rows.push([
        request.displayNumber || request.id,
        item.id,
        request.externalId,
        request.requesterName,
        item.serviceLabel,
        item.regionLabel,
        item.assigneeName || "Sin asignar",
        item.status,
        request.createdAt,
        item.timeline.find((entry) => entry.to === "ASIGNADA")?.at || "",
        item.dueDate || "Pendiente de política aprobada",
        item.termSnapshot?.version || "",
        item.originItemId || "",
        item.activities?.at(-1)?.at || "",
        item.verification?.reference || "",
        item.dispatch?.evidence || "",
      ]);
    }
  const sheets = [{ name: "Control de misiones", rows }];
  const normalize = (value) =>
    String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  if (
    supervision &&
    hasCapability(auth, CAPABILITIES.CONSULTAR_PERSONAL_INVESTIGACION, {
      area: "INVESTIGACION",
      region: auth.region,
    })
  )
    sheets.push({
      name: "Investigadores",
      rows: [
        [
          "Investigador",
          "Cargo",
          "Sede",
          "Especialidades",
          "Cobertura",
          "Disponibilidad",
          "En gestión",
          "Cerradas",
        ],
        ...supervision.personnel
          .filter(
            (entry) =>
              (!filters.personnelSearch ||
                normalize(
                  [entry.name, entry.jobTitle, ...entry.specialties].join(" "),
                ).includes(normalize(filters.personnelSearch))) &&
              (!filters.availability ||
                String(entry.available) === filters.availability) &&
              (!(filters.personnelRegion || filters.region) ||
                entry.coverages.some(
                  (region) =>
                    region.id === (filters.personnelRegion || filters.region),
                )),
          )
          .map((entry) => [
            entry.name,
            entry.jobTitle,
            entry.baseRegionLabel,
            entry.specialties.join(", "),
            entry.coverages.map((region) => region.label).join(", "),
            entry.availabilityLabel,
            entry.activeAssignments,
            entry.closedAssignments,
          ]),
      ],
    });
  sheets.push({
    name: "Corte y filtros",
    rows: [
      ["Área", "INVESTIGACION"],
      ["Generado por", auth.sub],
      ["Corte UTC", at],
      ["Zona institucional", "America/Bogota"],
      ["Filtros", JSON.stringify(filters)],
      ["Unidad de conteo", "Un ítem por fila"],
      ["Alcance", "Sólo registros autorizados en servidor"],
      [
        "F147",
        "Control consultable; homologación pendiente del formato completo y procedimiento",
      ],
      [
        "Términos",
        "Sin política vigente no se infieren vencimientos ni semáforos",
      ],
    ],
  });
  state.audit.push({
    type: "EXPORTACION_INVESTIGACION",
    actor: auth.sub,
    at,
    filters: structuredClone(filters),
    rows: rows.length - 1,
  });
  return createWorkbook(sheets);
}
