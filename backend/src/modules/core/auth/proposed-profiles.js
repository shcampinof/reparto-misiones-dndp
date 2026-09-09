import { CAPABILITIES } from "./capabilities.js";

export const PROPOSED_PROFILES = Object.freeze([
  proposed("PAG_CENTRAL", "Gestión central de excepciones", [
    CAPABILITIES.RESOLVER_EXCEPCION_MANUAL,
  ]),
  proposed(
    "GESTOR_OPERATIVO_REGIONAL",
    "Triage, problemas y continuidad operativa",
    [
      CAPABILITIES.REASIGNAR_ITEM,
      CAPABILITIES.GESTIONAR_NOVEDAD,
      CAPABILITIES.TRANSFERIR_SOLICITUD,
    ],
  ),
  proposed("DEFENSOR_REGIONAL", "Supervisión territorial de solo lectura", [
    CAPABILITIES.CONSULTAR_SOLICITUDES,
    CAPABILITIES.TRANSFERIR_SOLICITUD,
  ]),
  proposed("COORDINADOR_GID", "Coordinación funcional por validar", [
    CAPABILITIES.RESOLVER_EXCEPCION_MANUAL,
  ]),
  proposed("ADMINISTRATIVO_DELEGADO", "Apoyo operativo por validar", [
    CAPABILITIES.REASIGNAR_ITEM,
  ]),
  proposed("PAG_UNIDAD_OPERATIVA", "Supervisión de unidad por validar", [
    CAPABILITIES.CONSULTAR_SOLICITUDES,
  ]),
  proposed(
    "GESTOR_FUNCIONAL_CATALOGOS",
    "Propone contenido funcional de catálogos",
    [CAPABILITIES.PROPONER_CATALOGO],
  ),
  proposed(
    "RESPONSABLE_PUBLICACION_CATALOGOS",
    "Aprueba y publica versiones funcionales",
    [CAPABILITIES.PUBLICAR_CATALOGO],
  ),
]);

function proposed(id, label, requiredCapabilities) {
  return {
    id,
    label,
    enabled: false,
    status: "PENDIENTE_RACI",
    requiredCapabilities,
  };
}
