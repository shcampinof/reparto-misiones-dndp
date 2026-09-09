import { AppError } from "../../../shared/errors.js";

export const CAPABILITIES = Object.freeze({
  CONSULTAR_SOLICITUDES: "CONSULTAR_SOLICITUDES",
  CONSULTAR_CATALOGO_SERVICIOS: "CONSULTAR_CATALOGO_SERVICIOS",
  ADMINISTRAR_PLATAFORMA: "ADMINISTRAR_PLATAFORMA",
  RESTABLECER_PRESENTACION: "RESTABLECER_PRESENTACION",
  CREAR_SOLICITUD_INVESTIGACION: "CREAR_SOLICITUD_INVESTIGACION",
  EJECUTAR_REPARTO_INVESTIGACION: "EJECUTAR_REPARTO_INVESTIGACION",
  EJECUTAR_ITEM_INVESTIGACION: "EJECUTAR_ITEM_INVESTIGACION",
  APROBAR_INFORME_INVESTIGACION: "APROBAR_INFORME_INVESTIGACION",
  CREAR_SOLICITUD_VICTIMAS: "CREAR_SOLICITUD_VICTIMAS",
  AVALAR_SOLICITUD_VICTIMAS: "AVALAR_SOLICITUD_VICTIMAS",
  CORREGIR_SOLICITUD_VICTIMAS: "CORREGIR_SOLICITUD_VICTIMAS",
  EJECUTAR_ITEM_VICTIMAS: "EJECUTAR_ITEM_VICTIMAS",
  REPORTAR_PROBLEMA: "REPORTAR_PROBLEMA",
  GESTIONAR_NOVEDAD: "GESTIONAR_NOVEDAD",
  RESOLVER_EXCEPCION_MANUAL: "RESOLVER_EXCEPCION_MANUAL",
  REASIGNAR_ITEM: "REASIGNAR_ITEM",
  TRANSFERIR_SOLICITUD: "TRANSFERIR_SOLICITUD",
  SOLICITAR_PRORROGA: "SOLICITAR_PRORROGA",
  SOLICITAR_AMPLIACION: "SOLICITAR_AMPLIACION",
  PROPONER_CATALOGO: "PROPONER_CATALOGO",
  PUBLICAR_CATALOGO: "PUBLICAR_CATALOGO",
});

export const SCOPE_TYPES = Object.freeze({
  SYSTEM: "SYSTEM",
  AREA: "AREA",
  OWN_REQUESTS: "OWN_REQUESTS",
  OWN_ASSIGNMENTS: "OWN_ASSIGNMENTS",
});

const OPEN_ENDED = null;
const BASE_VALID_FROM = "2026-09-01T00:00:00.000Z";

export function grantsForRole(role, area) {
  const viewCatalog = grant(
    CAPABILITIES.CONSULTAR_CATALOGO_SERVICIOS,
    area,
    area === "AMBAS" ? SCOPE_TYPES.SYSTEM : SCOPE_TYPES.AREA,
  );
  const grants = {
    administrador: [
      grant(CAPABILITIES.CONSULTAR_SOLICITUDES, "AMBAS", SCOPE_TYPES.SYSTEM),
      grant(CAPABILITIES.ADMINISTRAR_PLATAFORMA, "AMBAS", SCOPE_TYPES.SYSTEM),
      grant(CAPABILITIES.RESTABLECER_PRESENTACION, "AMBAS", SCOPE_TYPES.SYSTEM),
    ],
    defensor: [
      grant(
        CAPABILITIES.CONSULTAR_SOLICITUDES,
        "INVESTIGACION",
        SCOPE_TYPES.OWN_REQUESTS,
      ),
      grant(
        CAPABILITIES.CREAR_SOLICITUD_INVESTIGACION,
        "INVESTIGACION",
        SCOPE_TYPES.OWN_REQUESTS,
      ),
      grant(
        CAPABILITIES.EJECUTAR_REPARTO_INVESTIGACION,
        "INVESTIGACION",
        SCOPE_TYPES.OWN_REQUESTS,
      ),
      grant(
        CAPABILITIES.SOLICITAR_AMPLIACION,
        "INVESTIGACION",
        SCOPE_TYPES.OWN_REQUESTS,
      ),
    ],
    investigador: [
      grant(
        CAPABILITIES.CONSULTAR_SOLICITUDES,
        "INVESTIGACION",
        SCOPE_TYPES.OWN_ASSIGNMENTS,
      ),
      grant(
        CAPABILITIES.EJECUTAR_ITEM_INVESTIGACION,
        "INVESTIGACION",
        SCOPE_TYPES.OWN_ASSIGNMENTS,
      ),
      grant(
        CAPABILITIES.REPORTAR_PROBLEMA,
        "INVESTIGACION",
        SCOPE_TYPES.OWN_ASSIGNMENTS,
      ),
      grant(
        CAPABILITIES.SOLICITAR_PRORROGA,
        "INVESTIGACION",
        SCOPE_TYPES.OWN_ASSIGNMENTS,
      ),
    ],
    pag_investigacion: [
      grant(
        CAPABILITIES.CONSULTAR_SOLICITUDES,
        "INVESTIGACION",
        SCOPE_TYPES.AREA,
      ),
      grant(
        CAPABILITIES.APROBAR_INFORME_INVESTIGACION,
        "INVESTIGACION",
        SCOPE_TYPES.AREA,
      ),
    ],
    rjv: [
      grant(
        CAPABILITIES.CONSULTAR_SOLICITUDES,
        "VICTIMAS",
        SCOPE_TYPES.OWN_REQUESTS,
      ),
      grant(
        CAPABILITIES.CREAR_SOLICITUD_VICTIMAS,
        "VICTIMAS",
        SCOPE_TYPES.OWN_REQUESTS,
      ),
      grant(
        CAPABILITIES.CORREGIR_SOLICITUD_VICTIMAS,
        "VICTIMAS",
        SCOPE_TYPES.OWN_REQUESTS,
      ),
      grant(
        CAPABILITIES.SOLICITAR_AMPLIACION,
        "VICTIMAS",
        SCOPE_TYPES.OWN_REQUESTS,
      ),
    ],
    pag_victimas: [
      grant(CAPABILITIES.CONSULTAR_SOLICITUDES, "VICTIMAS", SCOPE_TYPES.AREA),
      grant(
        CAPABILITIES.AVALAR_SOLICITUD_VICTIMAS,
        "VICTIMAS",
        SCOPE_TYPES.AREA,
      ),
    ],
    perito: [
      grant(
        CAPABILITIES.CONSULTAR_SOLICITUDES,
        "VICTIMAS",
        SCOPE_TYPES.OWN_ASSIGNMENTS,
      ),
      grant(
        CAPABILITIES.EJECUTAR_ITEM_VICTIMAS,
        "VICTIMAS",
        SCOPE_TYPES.OWN_ASSIGNMENTS,
      ),
      grant(
        CAPABILITIES.REPORTAR_PROBLEMA,
        "VICTIMAS",
        SCOPE_TYPES.OWN_ASSIGNMENTS,
      ),
      grant(
        CAPABILITIES.SOLICITAR_PRORROGA,
        "VICTIMAS",
        SCOPE_TYPES.OWN_ASSIGNMENTS,
      ),
    ],
  };
  return [...(grants[role] || []), viewCatalog];
}

export function hasCapability(
  auth,
  capability,
  context = {},
  now = new Date(),
) {
  return (auth.grants || []).some(
    (candidate) =>
      candidate.capability === capability &&
      isGrantCurrent(candidate, now) &&
      scopeMatches(candidate, auth, context),
  );
}

export function assertCapability(auth, capability, context = {}) {
  if (!hasCapability(auth, capability, context)) {
    throw new AppError(
      403,
      "CAPABILITY_FORBIDDEN",
      "No tiene capacidad, alcance o vigencia para esta acción",
      { capability },
    );
  }
}

function grant(capability, area, scopeType) {
  return {
    capability,
    area,
    scopeType,
    validFrom: BASE_VALID_FROM,
    validTo: OPEN_ENDED,
  };
}

function isGrantCurrent(candidate, now) {
  const instant = now instanceof Date ? now.toISOString() : String(now);
  return (
    (!candidate.validFrom || candidate.validFrom <= instant) &&
    (!candidate.validTo || instant < candidate.validTo)
  );
}

function scopeMatches(grantEntry, auth, context) {
  if (grantEntry.scopeType === SCOPE_TYPES.SYSTEM) return true;
  if (grantEntry.area !== context.area) return false;
  if (grantEntry.scopeType === SCOPE_TYPES.AREA) return true;
  if (grantEntry.scopeType === SCOPE_TYPES.OWN_REQUESTS) {
    return Boolean(context.ownerUserId) && context.ownerUserId === auth.sub;
  }
  if (grantEntry.scopeType === SCOPE_TYPES.OWN_ASSIGNMENTS) {
    return Boolean(auth.executorId) && context.assigneeId === auth.executorId;
  }
  return false;
}
