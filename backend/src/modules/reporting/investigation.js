import { CAPABILITIES, hasCapability } from "../core/auth/capabilities.js";

// Reads receive only the request projection authorized for this identity.
export function investigationSupervision({ state, auth, requests }) {
  const context = { area: "INVESTIGACION", region: auth.region };
  if (
    !hasCapability(
      auth,
      CAPABILITIES.CONSULTAR_INDICADORES_INVESTIGACION,
      context,
    )
  )
    return null;
  const visible = requests.filter(
    (request) => request.area === "INVESTIGACION",
  );
  const specialties = new Map(
    state.catalogs.specialties.map((entry) => [entry.id, entry.name]),
  );
  const regions = new Map(
    state.catalogs.regions.map((entry) => [entry.id, entry.label]),
  );
  const summarize = (subset) => {
    const items = subset.flatMap((request) => request.items);
    const statuses = countBy(items.map((item) => item.status));
    const bySpecialty = countBy(
      items.flatMap((item) => item.specialtyIds || []),
    );
    return {
      requests: subset.length,
      items: items.length,
      active: items.filter((item) =>
        ["ASIGNADA", "EN_EJECUCION", "APROBADO_PENDIENTE_ENVIO"].includes(
          item.status,
        ),
      ).length,
      awaitingDispatch: statuses.APROBADO_PENDIENTE_ENVIO || 0,
      overdue: items.filter(
        (item) =>
          item.status !== "CERRADA" &&
          item.tracking?.configured &&
          item.tracking.daysRemaining < 0,
      ).length,
      awaitingReview: statuses.INFORME_ENTREGADO || 0,
      exceptions: statuses.PENDIENTE_EXCEPCION || 0,
      closed: statuses.CERRADA || 0,
      byStatus: Object.entries(statuses).map(([status, count]) => ({
        status,
        count,
      })),
      bySpecialty: Object.entries(bySpecialty).map(([id, count]) => ({
        id,
        label: specialties.get(id) || id,
        count,
      })),
      recent: subset
        .flatMap((request) =>
          request.items.flatMap((item) =>
            (item.timeline || []).map((event) => ({
              requestId: request.id,
              itemId: item.id,
              service: item.serviceLabel,
              region: item.regionLabel,
              status: event.to,
              at: event.at,
            })),
          ),
        )
        .sort((left, right) => right.at.localeCompare(left.at))
        .slice(0, 8),
    };
  };
  const allItems = visible.flatMap((request) => request.items);
  const regionalIds = [...new Set(allItems.map((item) => item.region))];
  const personnel = state.professionals
    .filter(
      (professional) =>
        professional.area === "INVESTIGACION" &&
        professional.coverages.some((region) =>
          hasCapability(auth, CAPABILITIES.CONSULTAR_PERSONAL_INVESTIGACION, {
            area: "INVESTIGACION",
            region,
          }),
        ),
    )
    .map((professional) => ({
      id: professional.id,
      name: professional.displayName,
      jobTitle: professional.jobTitle,
      baseRegion: professional.baseRegion,
      baseRegionLabel: regions.get(professional.baseRegion),
      specialties: professional.specialties.map(
        (id) => specialties.get(id) || id,
      ),
      coverages: professional.coverages.map((id) => ({
        id,
        label: regions.get(id) || id,
      })),
      available: professional.available,
      availabilityLabel: professional.availabilityLabel,
      activeAssignments: allItems.filter(
        (item) =>
          item.assigneeId === professional.id &&
          [
            "ASIGNADA",
            "EN_EJECUCION",
            "INFORME_ENTREGADO",
            "APROBADO_PENDIENTE_ENVIO",
          ].includes(item.status),
      ).length,
      closedAssignments: allItems.filter(
        (item) =>
          item.assigneeId === professional.id && item.status === "CERRADA",
      ).length,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
  return {
    scope: auth.region
      ? `Territorio autorizado: ${regions.get(auth.region) || auth.region}`
      : "Toda el área de Investigación",
    overview: summarize(visible),
    regions: regionalIds.map((id) => ({
      id,
      label: regions.get(id) || id,
      overview: summarize(
        visible
          .map((request) => ({
            ...request,
            items: request.items.filter((item) => item.region === id),
          }))
          .filter((request) => request.items.length),
      ),
    })),
    personnel,
  };
}

function countBy(values) {
  return values.reduce(
    (counts, value) => ({ ...counts, [value]: (counts[value] || 0) + 1 }),
    {},
  );
}
