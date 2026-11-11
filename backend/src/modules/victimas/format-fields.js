import { AppError } from "../../shared/errors.js";

const clean = (value) => String(value ?? "").trim();
const invalid = (message) =>
  new AppError(400, "DEMO_VALIDATION_ERROR", message);

// SD-P06-F163 / F168 / F169: optional fields until requiredness is approved.
export function victimsPersonFields(source) {
  const result = {};
  for (const field of [
    "identityDocument",
    "factNumber",
    "factPlace",
    "incomeSupportReference",
    "contactUnavailableReason",
  ]) {
    if (clean(source[field])) result[field] = clean(source[field]);
  }
  for (const field of ["birthDate", "factDate"]) {
    if (clean(source[field])) result[field] = formatDate(source[field], field);
  }
  if (
    source.monthlyIncome !== undefined &&
    source.monthlyIncome !== null &&
    source.monthlyIncome !== ""
  ) {
    const amount = Number(source.monthlyIncome);
    if (!Number.isFinite(amount) || amount < 0)
      throw invalid("El ingreso laboral debe ser un valor no negativo");
    result.monthlyIncome = amount;
  }
  for (const field of ["emergingDamage", "displacementDays"]) {
    if (
      source[field] !== undefined &&
      source[field] !== null &&
      source[field] !== ""
    ) {
      const number = Number(source[field]);
      if (
        !Number.isFinite(number) ||
        number < 0 ||
        (field === "displacementDays" && !Number.isInteger(number))
      )
        throw invalid(
          "Daño emergente y días de desplazamiento deben ser valores no negativos válidos",
        );
      result[field] = number;
    }
  }
  if (result.birthDate && result.factDate && result.birthDate > result.factDate)
    throw invalid("La fecha del hecho no puede preceder al nacimiento");
  return result;
}

export function victimsCaseFields(source) {
  const result = {};
  for (const field of [
    "offenses",
    "judicialAuthority",
    "defendantName",
    "requestedMeasures",
    "hearingPlace",
  ]) {
    if (clean(source[field])) result[field] = clean(source[field]);
  }
  if (clean(source.sentenceDate))
    result.sentenceDate = formatDate(source.sentenceDate, "sentencia");
  return result;
}

export function f171Metadata(source, at) {
  if (!source) return {};
  const reportNumber = clean(source.reportNumber);
  if (!reportNumber) throw invalid("Registre el número del informe F171");
  return {
    formatCode: "SD-P06-F171",
    reportNumber,
    deliveryDate: at.slice(0, 10),
    ...(clean(source.assessmentDate)
      ? { assessmentDate: formatDate(source.assessmentDate, "valoración") }
      : {}),
  };
}

export function formatDate(value, label) {
  const date = clean(value);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw invalid(`Fecha de ${label} no válida`);
  return date;
}
