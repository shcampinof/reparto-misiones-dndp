import { CAPABILITIES } from "../auth/capabilities.js";

export const OPERATION_CONTRACTS = Object.freeze({
  PROBLEMA: {
    capability: CAPABILITIES.REPORTAR_PROBLEMA,
    enabled: true,
    areas: ["INVESTIGACION", "VICTIMAS"],
    allowedStates: ["ASIGNADA", "EN_EJECUCION"],
    requiredFields: ["reason", "description"],
    preservesPrimaryState: true,
  },
  NOVEDAD: pending(
    CAPABILITIES.GESTIONAR_NOVEDAD,
    "DEC-NOV-001",
    "Falta definir autorizador y efecto sobre encargos activos",
  ),
  EXCEPCION_MANUAL: pending(
    CAPABILITIES.RESOLVER_EXCEPCION_MANUAL,
    "DEC-ASG-EXC",
    "Faltan autorizador y restricciones excepcionables",
  ),
  REASIGNACION: pending(
    CAPABILITIES.REASIGNAR_ITEM,
    "DEC-RACI-OPERACIONES",
    "Falta aprobar el gestor operativo y su alcance",
  ),
  TRANSFERENCIA: pending(
    CAPABILITIES.TRANSFERIR_SOLICITUD,
    "DEC-RACI-TRANSFERENCIA",
    "Falta aprobar el actor que transfiere la titularidad",
  ),
  PRORROGA: pending(
    CAPABILITIES.SOLICITAR_PRORROGA,
    "DEC-PLZ-001",
    "Faltan aprobador, causal, duración y efecto en calendario",
  ),
  AMPLIACION: pending(
    CAPABILITIES.SOLICITAR_AMPLIACION,
    "DEC-AMP-001",
    "Faltan punto de corte, plazo y regla final de continuidad",
  ),
});

function pending(capability, decisionCode, reason) {
  return {
    capability,
    enabled: false,
    areas: ["INVESTIGACION", "VICTIMAS"],
    allowedStates: [],
    requiredFields: [],
    decisionCode,
    reason,
  };
}
