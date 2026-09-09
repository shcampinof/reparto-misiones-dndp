import { CAPABILITIES, assertCapability } from "../auth/capabilities.js";
import { AppError } from "../../../shared/errors.js";

const TRANSITIONS = Object.freeze({
  BORRADOR: ["EN_REVISION"],
  EN_REVISION: ["PUBLICADO"],
  PUBLICADO: ["RETIRADO"],
  RETIRADO: [],
});

export function createCatalogService({
  repository,
  clock = () => new Date().toISOString(),
}) {
  function listPublished(auth, { area, at = clock().slice(0, 10) } = {}) {
    assertCapability(auth, CAPABILITIES.CONSULTAR_CATALOGO_SERVICIOS, { area });
    const state = repository.snapshot();
    return publishedServices(state, area, at);
  }

  function createDraft(auth, payload) {
    const area = normalizedArea(payload.area);
    assertCapability(auth, CAPABILITIES.PROPONER_CATALOGO, { area });
    const draft = validateDraft(payload, area);
    return repository.transaction((state) => {
      if (state.catalogs.services.some((entry) => entry.id === draft.id)) {
        throw new AppError(
          409,
          "CATALOG_ID_EXISTS",
          "Ya existe un servicio con ese código",
        );
      }
      const specialtyIds = draft.specialtyIds;
      validateSpecialties(state, area, specialtyIds);
      const at = clock();
      const serviceData = structuredClone(draft);
      delete serviceData.specialtyIds;
      const entry = {
        ...serviceData,
        version: 1,
        status: "BORRADOR",
        validFrom: payload.validFrom || null,
        validTo: payload.validTo || null,
        source: text(payload.source) || "Pendiente de fundamento funcional",
        history: [
          catalogEvent(at, null, "BORRADOR", auth.sub, "Borrador creado"),
        ],
      };
      state.catalogs.services.push(entry);
      state.catalogs.serviceSpecialtyRelations ||= [];
      for (const specialtyId of specialtyIds) {
        state.catalogs.serviceSpecialtyRelations.push({
          id: `REL-${entry.id}-${specialtyId}`,
          area,
          serviceId: entry.id,
          specialtyId,
          version: 1,
          status: "BORRADOR",
          validFrom: entry.validFrom,
          validTo: entry.validTo,
          source: entry.source,
          history: [
            catalogEvent(at, null, "BORRADOR", auth.sub, "Relación creada"),
          ],
        });
      }
      return withRelations(state, entry);
    });
  }

  function submit(auth, id, payload = {}) {
    return changeStatus(
      auth,
      id,
      "EN_REVISION",
      CAPABILITIES.PROPONER_CATALOGO,
      payload.reason,
    );
  }

  function publish(auth, id, payload = {}) {
    return changeStatus(
      auth,
      id,
      "PUBLICADO",
      CAPABILITIES.PUBLICAR_CATALOGO,
      payload.reason,
      (entry) => {
        if (!entry.validFrom) {
          throw new AppError(
            400,
            "CATALOG_VALID_FROM_REQUIRED",
            "La vigencia desde es obligatoria para publicar",
          );
        }
      },
    );
  }

  function retire(auth, id, payload = {}) {
    return changeStatus(
      auth,
      id,
      "RETIRADO",
      CAPABILITIES.PUBLICAR_CATALOGO,
      payload.reason,
      (entry) => {
        entry.validTo = payload.validTo || clock().slice(0, 10);
      },
    );
  }

  function changeStatus(auth, id, target, capability, reason, beforeChange) {
    return repository.transaction((state) => {
      const entry = state.catalogs.services.find(
        (candidate) => candidate.id === id,
      );
      if (!entry)
        throw new AppError(
          404,
          "CATALOG_SERVICE_NOT_FOUND",
          "Servicio no encontrado",
        );
      assertCapability(auth, capability, { area: entry.area });
      if (!TRANSITIONS[entry.status]?.includes(target)) {
        throw new AppError(
          409,
          "INVALID_CATALOG_TRANSITION",
          `No se permite ${entry.status} → ${target}`,
        );
      }
      beforeChange?.(entry);
      const from = entry.status;
      entry.status = target;
      const at = clock();
      const changeEvent = catalogEvent(
        at,
        from,
        target,
        auth.sub,
        text(reason) || "Cambio de gobierno del catálogo",
      );
      entry.history.push(changeEvent);
      for (const relation of state.catalogs.serviceSpecialtyRelations || []) {
        if (relation.serviceId !== entry.id) continue;
        relation.status = target;
        relation.validFrom = entry.validFrom;
        relation.validTo = entry.validTo;
        relation.history.push(
          catalogEvent(
            at,
            from,
            target,
            auth.sub,
            text(reason) || "Cambio de gobierno de la relación",
          ),
        );
      }
      return withRelations(state, entry);
    });
  }

  return { listPublished, createDraft, submit, publish, retire };
}

export function publishedServices(state, area, at) {
  return state.catalogs.services
    .filter(
      (entry) =>
        entry.area === area &&
        entry.status === "PUBLICADO" &&
        isEffective(entry, at),
    )
    .map((entry) => withRelations(state, entry, at));
}

function withRelations(state, entry, effectiveAt = null) {
  const specialtyIds = (state.catalogs.serviceSpecialtyRelations || [])
    .filter(
      (relation) =>
        relation.serviceId === entry.id &&
        (!effectiveAt ||
          (relation.status === "PUBLICADO" &&
            isEffective(relation, effectiveAt))),
    )
    .map((relation) => relation.specialtyId);
  return { ...structuredClone(entry), specialtyIds };
}

function isEffective(entry, at) {
  return (
    (!entry.validFrom || entry.validFrom <= at) &&
    (!entry.validTo || at < entry.validTo)
  );
}

function normalizedArea(value) {
  const area = text(value).toUpperCase();
  if (!["INVESTIGACION", "VICTIMAS"].includes(area)) {
    throw new AppError(
      400,
      "CATALOG_AREA_INVALID",
      "Área de servicio no válida",
    );
  }
  return area;
}

function validateDraft(payload, area) {
  const id = text(payload.id).toUpperCase();
  const name = text(payload.name);
  if (!/^SVC_(INV|VIC)_[A-Z0-9_]+$/.test(id) || !name) {
    throw new AppError(
      400,
      "CATALOG_FIELDS_REQUIRED",
      "Código de servicio y nombre son obligatorios",
    );
  }
  return {
    id,
    area,
    name,
    description: text(payload.description),
    activities: textArray(payload.activities),
    scope: textArray(payload.scope),
    exclusions: textArray(payload.exclusions),
    requirements: textArray(payload.requirements),
    product: text(payload.product),
    specialtyIds: textArray(payload.specialtyIds),
    coverage: payload.coverage || {
      mode: "PENDIENTE",
      label: "Pendiente",
      decisionCode: "DEC-COB-001",
    },
    termPolicy: payload.termPolicy || {
      value: null,
      dayType: null,
      startEvent: null,
      calendarId: null,
      decisionCode: "DEC-PLZ-001",
      label: "Pendiente de aprobación",
    },
  };
}

function validateSpecialties(state, area, specialtyIds) {
  if (specialtyIds.length === 0) {
    throw new AppError(
      400,
      "CATALOG_SPECIALTY_REQUIRED",
      "El servicio debe relacionarse con al menos una especialidad o disciplina",
    );
  }
  const valid = new Set(
    state.catalogs.specialties
      .filter((entry) => entry.area === area)
      .map((entry) => entry.id),
  );
  if (specialtyIds.some((id) => !valid.has(id))) {
    throw new AppError(
      400,
      "CATALOG_SPECIALTY_INVALID",
      "La relación incluye una especialidad o disciplina no válida",
    );
  }
}

function catalogEvent(at, from, to, actor, reason) {
  return { at, from, to, actor, reason };
}

function textArray(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function text(value) {
  return String(value || "").trim();
}
