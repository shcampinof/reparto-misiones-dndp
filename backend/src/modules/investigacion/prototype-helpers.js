import {
  PRIORITIES,
  PROCESS_STAGES,
  buildMissionView,
  specialties,
} from "../../data.js";

export function findSpecialtiesByIds(ids) {
  return ids
    .map((id) =>
      specialties.find((item) => item.id === Number(id) && item.activo),
    )
    .filter(Boolean);
}

export function isInstitutionalEmail(email) {
  return /^[^\s@]+@defensoria\.gov\.co$/.test(
    String(email || "")
      .trim()
      .toLowerCase(),
  );
}

export function isNumeric(value) {
  return /^\d+$/.test(String(value || "").trim());
}

export function isSpoaValid(value) {
  return /^\d{21}$/.test(String(value || "").trim());
}

export function normalizePriority(value, isUrgent) {
  if (isUrgent) return "urgente";
  return PRIORITIES.includes(value) ? value : "normal";
}

export function sanitizeText(value) {
  return String(value || "").trim();
}

export function nowIso() {
  return new Date().toISOString();
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function appendHistory(radicado, event, detail) {
  radicado.historial.push({ evento: event, fecha: nowIso(), detalle: detail });
}

export function canInvestigatorOperate(req, radicado) {
  if (req.auth.role !== "investigador") return true;
  return Boolean(
    req.auth.investigatorId &&
    radicado.investigador_id === req.auth.investigatorId,
  );
}

export function missionResponse(row, message) {
  return {
    message,
    mission: buildMissionView().find(
      (mission) => mission.id === row.numero_radicado,
    ),
  };
}

export { PROCESS_STAGES };
