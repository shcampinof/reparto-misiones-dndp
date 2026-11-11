import { AppError } from "../../../shared/errors.js";

export const institutionalDate = (at) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));

export const operationalPolicy = (policy) =>
  Boolean(
    (policy?.status === "APROBADA" && policy.approvalEvidence) ||
    (policy?.status === "PROVISIONAL" &&
      policy.operationalEnabled === true &&
      policy.implementationAuthorization),
  );

export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function addTermDays(start, days, dayType, calendar) {
  if (
    !validDate(start) ||
    !Number.isSafeInteger(days) ||
    days <= 0 ||
    !["CALENDARIO", "HABILES"].includes(dayType) ||
    !calendar?.version ||
    !Array.isArray(calendar.holidays) ||
    !calendar.holidays.every(validDate) ||
    !Array.isArray(calendar.weekendDays) ||
    calendar.weekendDays.length >= 7 ||
    !calendar.weekendDays.every(
      (day) => Number.isInteger(day) && day >= 0 && day <= 6,
    )
  )
    throw new AppError(
      409,
      "INVALID_TERM_POLICY",
      "Falta una política o calendario válido",
    );
  const date = new Date(`${start}T00:00:00Z`);
  let remaining = days;
  // An invalid calendar must never produce an unbounded loop.
  for (let count = 0; remaining && count < 36600; count++) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.toISOString().slice(0, 10);
    if (
      (calendar.validFrom && day < calendar.validFrom) ||
      (calendar.validTo && day >= calendar.validTo)
    )
      throw new AppError(
        409,
        "CALENDAR_OUT_OF_VALIDITY",
        "El calendario no cubre todo el término",
      );
    if (
      dayType === "CALENDARIO" ||
      (!calendar.weekendDays.includes(date.getUTCDay()) &&
        !calendar.holidays.includes(day))
    )
      remaining--;
  }
  if (remaining)
    throw new AppError(
      409,
      "INVALID_CALENDAR",
      "El calendario no permite calcular el término",
    );
  return date.toISOString().slice(0, 10);
}

export function activePolicy(state, type, at, service, area = "INVESTIGACION") {
  const date = institutionalDate(at);
  const matches = (
    area === "VICTIMAS"
      ? state.victimsPolicies || []
      : state.investigationPolicies || []
  ).filter(
    (policy) =>
      policy.type === type &&
      policy.area === area &&
      operationalPolicy(policy) &&
      policy.version &&
      policy.validFrom <= date &&
      (!policy.validTo || date < policy.validTo) &&
      (!policy.service || policy.service === service),
  );
  if (matches.length !== 1)
    throw new AppError(
      409,
      "PENDING_FUNCTIONAL_DECISION",
      "Se requiere una única política aprobada y vigente para esta operación",
    );
  return structuredClone(matches[0]);
}

export function termTracking(item, at = new Date().toISOString()) {
  const extension = item.termExtensions
    ?.filter((entry) => entry.status === "APROBADA")
    .at(-1);
  const policy = extension?.policySnapshot || item.termSnapshot;
  const calendar = extension?.calendarSnapshot || item.calendarSnapshot;
  if (
    !validDate(item.dueDate) ||
    !operationalPolicy(policy) ||
    !calendar?.version
  )
    return { configured: false };
  const today = institutionalDate(at);
  const endEvent =
    item.timeline?.findLast((entry) => entry.to === "INFORME_ENTREGADO") ||
    item.timeline?.findLast((entry) => entry.to === "CERRADA");
  const comparisonDate =
    ["INFORME_ENTREGADO", "APROBADO_PENDIENTE_ENVIO", "CERRADA"].includes(
      item.status,
    ) && endEvent
      ? institutionalDate(endEvent.at)
      : today;
  const overdue = comparisonDate > item.dueDate;
  let daysRemaining = 0;
  const from = comparisonDate < item.dueDate ? comparisonDate : item.dueDate;
  const until = comparisonDate < item.dueDate ? item.dueDate : comparisonDate;
  const cursor = new Date(`${from}T00:00:00Z`);
  while (cursor.toISOString().slice(0, 10) < until) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (
      policy.dayType === "CALENDARIO" ||
      (!calendar.weekendDays.includes(cursor.getUTCDay()) &&
        !calendar.holidays.includes(cursor.toISOString().slice(0, 10)))
    )
      daysRemaining++;
  }
  if (overdue) daysRemaining = -Math.max(1, daysRemaining);
  const delivered = [
    "INFORME_ENTREGADO",
    "APROBADO_PENDIENTE_ENVIO",
    "CERRADA",
  ].includes(item.status);
  return {
    configured: true,
    provisional: policy.status === "PROVISIONAL",
    daysRemaining,
    dayType: policy.dayType,
    semaphoreCode: overdue ? "VENCIDO" : "EN_PLAZO",
    semaphore: overdue ? "Vencido" : "En plazo",
    opportunityCode: overdue ? "FUERA_DE_TERMINO" : "OPORTUNO_A_LA_FECHA",
    opportunity: overdue
      ? "Fuera de término"
      : delivered
        ? "Entregado en plazo"
        : "Oportuno a la fecha",
    label: delivered
      ? "Oportunidad calculada a la entrega del informe"
      : "Calculado con la política y el calendario conservados",
  };
}
