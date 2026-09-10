import { CAPABILITIES } from "./capabilities.js";

export const PROPOSED_PROFILES = Object.freeze([
  proposed(
    "GESTOR_CENTRAL_EXCEPCIONES",
    "Gestión central de excepciones",
    [
      CAPABILITIES.CONSULTAR_EXCEPCIONES_INVESTIGACION,
      CAPABILITIES.CONSULTAR_COBERTURA_INVESTIGACION,
      CAPABILITIES.REINTENTAR_REPARTO_EXCEPCION,
      CAPABILITIES.RESOLVER_EXCEPCION_MANUAL,
    ],
    true,
  ),
  proposed(
    "GESTOR_OPERATIVO_REGIONAL",
    "Triage, problemas y continuidad operativa",
    [
      CAPABILITIES.REASIGNAR_ITEM,
      CAPABILITIES.GESTIONAR_NOVEDAD,
      CAPABILITIES.TRANSFERIR_SOLICITUD,
      CAPABILITIES.CONSULTAR_PROBLEMAS_INVESTIGACION,
    ],
    true,
  ),
  proposed(
    "DEFENSOR_REGIONAL",
    "Supervisión territorial de solo lectura",
    [
      CAPABILITIES.CONSULTAR_SOLICITUDES,
      CAPABILITIES.CONSULTAR_INDICADORES_INVESTIGACION,
    ],
    true,
  ),
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

function proposed(
  id,
  label,
  requiredCapabilities,
  presentationEnabled = false,
) {
  return {
    id,
    label,
    enabled: false,
    presentationEnabled,
    status: "PENDIENTE_RACI",
    requiredCapabilities,
  };
}
