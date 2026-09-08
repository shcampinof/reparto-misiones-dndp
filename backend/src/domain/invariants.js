export class DomainValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "DomainValidationError";
    this.details = Object.freeze({ ...details });
  }
}

export class OptimisticLockError extends Error {
  constructor(entityType, id, expectedVersion) {
    super(
      `Conflicto de versión en ${entityType} ${id}; se esperaba ${expectedVersion}`,
    );
    this.name = "OptimisticLockError";
    this.entityType = entityType;
    this.entityId = id;
    this.expectedVersion = expectedVersion;
  }
}

export function requiredText(value, field) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new DomainValidationError(`${field} es obligatorio`);
  return normalized;
}

export function optionalText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function isoInstant(value, field) {
  const normalized = requiredText(value, field);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new DomainValidationError(`${field} debe ser una fecha ISO válida`);
  }
  return new Date(normalized).toISOString();
}

export function optionalInstant(value, field) {
  return value === null || value === undefined || value === ""
    ? null
    : isoInstant(value, field);
}

export function effectivePeriod(effectiveFrom, effectiveTo = null) {
  const from = isoInstant(effectiveFrom, "effectiveFrom");
  const to = optionalInstant(effectiveTo, "effectiveTo");
  if (to && to <= from) {
    throw new DomainValidationError(
      "effectiveTo debe ser posterior a effectiveFrom",
    );
  }
  return { effectiveFrom: from, effectiveTo: to };
}

export function isEffectiveAt(record, at) {
  const instant = isoInstant(at, "at");
  return (
    record.active !== false &&
    record.effectiveFrom <= instant &&
    (!record.effectiveTo || instant < record.effectiveTo)
  );
}

export function uniqueNonEmpty(values, field) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new DomainValidationError(`${field} debe contener al menos un valor`);
  }
  const normalized = values.map((value) => requiredText(value, field));
  if (new Set(normalized).size !== normalized.length) {
    throw new DomainValidationError(`${field} no admite duplicados`);
  }
  return normalized;
}

export function immutable(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) immutable(child);
  }
  return value;
}
