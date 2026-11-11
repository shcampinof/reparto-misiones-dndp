import { createHash } from "node:crypto";
import { model } from "./model.js";

const id = (...parts) =>
  createHash("sha256").update(JSON.stringify(parts)).digest("hex");
// Oracle 12.1 JSON constraints accept object/array documents; wrap scalars too.
const j = (value) => JSON.stringify({ payload: value });
const unpack = (value) => JSON.parse(value).payload;
const productContent = new Set([
  "id",
  "itemId",
  "type",
  "version",
  "reference",
  "attachment",
  "formatMetadata",
  "author",
  "createdAt",
]);
const relational = new Set([
  "users",
  "professionals",
  "requests",
  "catalogs",
  "calendars",
  "investigationPolicies",
  "victimsPolicies",
  "drafts",
  "workspaceDocuments",
  "outbox",
  "audit",
]);

function fragment(value, fields, links) {
  return {
    value: Object.fromEntries(
      Object.entries(value).filter(([key]) => !fields.includes(key)),
    ),
    collections: fields.filter((key) => Object.hasOwn(value, key)),
    ...(links ? { links } : {}),
  };
}

export function encodeState(state) {
  const tables = Object.fromEntries(model.map(({ table }) => [table, []]));
  const add = (table, ID, ORDEN, data, columns = {}) =>
    tables[table].push({ ID, ORDEN, DATOS: j(data), ...columns });
  add("SIGIP_AUXILIAR", "root", 0, {
    keys: Object.keys(state),
    catalogKeys: Object.keys(state.catalogs || {}),
  });
  for (const [key, value] of Object.entries(state))
    if (!relational.has(key))
      add("SIGIP_AUXILIAR", id("aux", key), 1, { key, value });
  for (const [n, user] of (state.users || []).entries()) {
    add("SIGIP_USUARIO", user.id, n, fragment(user, ["accounts"]));
    for (const [a, account] of (user.accounts || []).entries())
      add("SIGIP_PERFIL", account.id, a, account, {
        USUARIO_ID: user.id,
        AREA: account.area,
        ROL: account.role,
        REGIONAL: account.region || null,
      });
  }
  for (const [n, professional] of (state.professionals || []).entries())
    add("SIGIP_EJECUTOR", professional.id, n, professional, {
      AREA: professional.area,
      REGIONAL: professional.baseRegion || null,
    });
  for (const [category, entries] of Object.entries(state.catalogs || {})) {
    if (!Array.isArray(entries))
      throw new Error(`Catálogo no tabular: ${category}`);
    for (const [n, entry] of entries.entries())
      add("SIGIP_CATALOGO", id(category, entry.id ?? n), n, entry, {
        CATEGORIA: category,
        CODIGO: String(entry.id ?? n),
        VERSION: Number(entry.version) || null,
        ESTADO: entry.status || null,
        VIGENTE_DESDE: entry.validFrom || null,
        VIGENTE_HASTA: entry.validTo || null,
      });
  }
  for (const source of ["investigationPolicies", "victimsPolicies"])
    for (const [n, policy] of (state[source] || []).entries())
      add(
        "SIGIP_PARAMETRO",
        id(source, n),
        n,
        { source, value: policy },
        {
          AREA:
            source === "investigationPolicies" ? "INVESTIGACION" : "VICTIMAS",
          TIPO: policy.type || null,
          VERSION: String(policy.version ?? ""),
          ESTADO: policy.status || null,
          VIGENTE_DESDE: policy.validFrom || null,
          VIGENTE_HASTA: policy.validTo || null,
        },
      );
  for (const [n, calendar] of (state.calendars || []).entries())
    add("SIGIP_CALENDARIO", id("calendar", calendar.id ?? n), n, calendar);
  const documents = new Set();
  function document(
    kind,
    request,
    item,
    logicalId,
    version,
    n,
    content,
    metadata = {},
    submissionVersion = null,
  ) {
    const documentId = id(kind, logicalId);
    if (!documents.has(documentId)) {
      add(
        "SIGIP_DOCUMENTO",
        documentId,
        0,
        {},
        { SOLICITUD_ID: request.id, ITEM_ID: item?.id || null, CLASE: kind },
      );
      documents.add(documentId);
    }
    add("SIGIP_VERSION_DOCUMENTO", id(documentId, version), n, metadata, {
      DOCUMENTO_ID: documentId,
      VERSION: version,
      VERSION_SOL: submissionVersion,
      CONTENIDO: j(content),
    });
    return id(documentId, version);
  }
  function peopleAndIntake(request, data, version) {
    const links = { persons: [], documents: [] };
    const group = id(version, data.persons || []);
    for (const [n, person] of (data.persons || []).entries()) {
      const personId = id(request.id, version, group, n);
      add("SIGIP_PERSONA_SOLICITUD", personId, n, person, {
        SOLICITUD_ID: request.id,
        VERSION_SOL: version,
        GRUPO_ID: group,
      });
      links.persons.push(personId);
    }
    for (const [n, doc] of (data.documents || []).entries())
      links.documents.push(
        document(
          version === 0 ? "RADICACION_ACTUAL" : "RADICACION_VERSION",
          request,
          null,
          [request.id, n, ...(version === 0 ? [id(doc)] : [])],
          version || 1,
          n,
          doc,
          {},
          version,
        ),
      );
    return links;
  }
  const cases = new Set();
  for (const [n, request] of (state.requests || []).entries()) {
    const caseId = id(request.area, request.externalId);
    if (!cases.has(caseId)) {
      add(
        "SIGIP_CASO",
        caseId,
        n,
        {},
        { AREA: request.area, IDENTIFICADOR: request.externalId },
      );
      cases.add(caseId);
    }
    const links = peopleAndIntake(request, request, 0);
    add(
      "SIGIP_SOLICITUD",
      request.id,
      n,
      fragment(request, ["items", "versions", "persons", "documents"], links),
      { CASO_ID: caseId, AREA: request.area, TITULAR_ID: request.ownerUserId },
    );
    for (const [v, version] of (request.versions || []).entries()) {
      const { data, ...metadata } = version;
      const versionLinks = peopleAndIntake(request, data, version.version);
      add("SIGIP_VERSION_SOL", id(request.id, version.version), v, metadata, {
        SOLICITUD_ID: request.id,
        VERSION: version.version,
        CONTENIDO: j(fragment(data, ["persons", "documents"], versionLinks)),
      });
    }
    for (const [i, item] of (request.items || []).entries()) {
      const assignmentId = item.assignment
        ? id(item.id, item.assignment.createdAt || "actual")
        : null;
      add(
        "SIGIP_ITEM_SOLICITUD",
        item.id,
        i,
        fragment(item, ["timeline", "products", "assignment"]),
        {
          SOLICITUD_ID: request.id,
          AREA: request.area,
          SERVICIO: item.service || null,
          ESTADO: item.status,
          EJECUTOR_ID: item.assigneeId || null,
          ASIGNACION_ID: assignmentId,
        },
      );
      if (item.assignment)
        add("SIGIP_ASIGNACION", assignmentId, 0, item.assignment, {
          ITEM_ID: item.id,
          EJECUTOR_ID: item.assignment.selectedId || null,
          POLITICA: item.assignment.policyVersion || null,
        });
      for (const [t, transition] of (item.timeline || []).entries())
        add("SIGIP_TRANSICION", id(item.id, t), t, transition, {
          ITEM_ID: item.id,
        });
      for (const [p, product] of (item.products || []).entries()) {
        const content = {},
          metadata = {};
        for (const [key, value] of Object.entries(product))
          (productContent.has(key) ? content : metadata)[key] = value;
        document(
          "PRODUCTO",
          request,
          item,
          item.id,
          p + 1,
          p,
          content,
          metadata,
        );
      }
    }
  }
  const requests = new Map((state.requests || []).map((r) => [r.id, r]));
  for (const [n, doc] of (state.workspaceDocuments || []).entries())
    document(
      "SOPORTE",
      requests.get(doc.requestId),
      { id: doc.itemId },
      doc.documentId,
      doc.version,
      n,
      doc,
    );
  for (const [n, draft] of (state.drafts || []).entries())
    add("SIGIP_BORRADOR", draft.id, n, draft, {
      TITULAR_ID: draft.ownerUserId,
      AREA: draft.area,
      REVISION: draft.revision,
    });
  for (const [n, entry] of (state.outbox || []).entries())
    add("SIGIP_OUTBOX", entry.id, n, entry, {
      CLAVE: entry.key,
      ITEM_ID: entry.itemId,
      ESTADO: entry.status,
    });
  for (const [n, entry] of (state.audit || []).entries())
    add("SIGIP_AUDITORIA", String(n + 1), n, entry);
  return tables;
}

export function decodeState(tables) {
  const rows = (table) =>
    [...(tables[table] || [])].sort((a, b) => a.ORDEN - b.ORDEN);
  const root = rows("SIGIP_AUXILIAR").find((r) => r.ID === "root");
  if (!root) return null;
  const { keys, catalogKeys } = unpack(root.DATOS);
  const state = {};
  for (const key of keys)
    state[key] =
      key === "catalogs"
        ? Object.fromEntries(catalogKeys.map((k) => [k, []]))
        : relational.has(key)
          ? []
          : undefined;
  for (const row of rows("SIGIP_AUXILIAR"))
    if (row.ID !== "root") {
      const { key, value } = unpack(row.DATOS);
      state[key] = value;
    }
  const docs = new Map(rows("SIGIP_DOCUMENTO").map((r) => [r.ID, r]));
  const documentRows = rows("SIGIP_VERSION_DOCUMENTO");
  const people = rows("SIGIP_PERSONA_SOLICITUD");
  function attach(fragmentValue) {
    const { value, collections, links } = fragmentValue;
    if (collections.includes("persons"))
      value.persons = people
        .filter((r) => links.persons.includes(r.ID))
        .map((r) => unpack(r.DATOS));
    if (collections.includes("documents"))
      value.documents = documentRows
        .filter((r) => links.documents.includes(r.ID))
        .map((r) => unpack(r.CONTENIDO));
    return value;
  }
  state.users = rows("SIGIP_USUARIO").map((r) => {
    const { value, collections } = unpack(r.DATOS);
    if (collections.includes("accounts"))
      value.accounts = rows("SIGIP_PERFIL")
        .filter((p) => p.USUARIO_ID === r.ID)
        .map((p) => unpack(p.DATOS));
    return value;
  });
  state.professionals = rows("SIGIP_EJECUTOR").map((r) => unpack(r.DATOS));
  for (const row of rows("SIGIP_CATALOGO"))
    state.catalogs[row.CATEGORIA].push(unpack(row.DATOS));
  for (const row of rows("SIGIP_PARAMETRO")) {
    const { source, value } = unpack(row.DATOS);
    state[source].push(value);
  }
  if (keys.includes("calendars"))
    state.calendars = rows("SIGIP_CALENDARIO").map((r) => unpack(r.DATOS));
  const assignments = new Map(
    rows("SIGIP_ASIGNACION").map((r) => [r.ID, unpack(r.DATOS)]),
  );
  state.requests = rows("SIGIP_SOLICITUD").map((r) => {
    const wrapper = unpack(r.DATOS);
    const request = attach(wrapper, r.ID, 0);
    if (wrapper.collections.includes("versions"))
      request.versions = rows("SIGIP_VERSION_SOL")
        .filter((v) => v.SOLICITUD_ID === r.ID)
        .map((v) => ({
          ...unpack(v.DATOS),
          data: attach(unpack(v.CONTENIDO), r.ID, v.VERSION),
        }));
    if (wrapper.collections.includes("items"))
      request.items = rows("SIGIP_ITEM_SOLICITUD")
        .filter((i) => i.SOLICITUD_ID === r.ID)
        .map((i) => {
          const { value, collections } = unpack(i.DATOS);
          if (collections.includes("assignment"))
            value.assignment = assignments.get(i.ASIGNACION_ID) || null;
          if (collections.includes("timeline"))
            value.timeline = rows("SIGIP_TRANSICION")
              .filter((t) => t.ITEM_ID === i.ID)
              .map((t) => unpack(t.DATOS));
          if (collections.includes("products"))
            value.products = documentRows
              .filter((v) => {
                const doc = docs.get(v.DOCUMENTO_ID);
                return doc.CLASE === "PRODUCTO" && doc.ITEM_ID === i.ID;
              })
              .map((v) => ({ ...unpack(v.CONTENIDO), ...unpack(v.DATOS) }));
          return value;
        });
    return request;
  });
  if (keys.includes("workspaceDocuments"))
    state.workspaceDocuments = documentRows
      .filter((v) => docs.get(v.DOCUMENTO_ID).CLASE === "SOPORTE")
      .map((v) => unpack(v.CONTENIDO));
  for (const [key, table] of [
    ["drafts", "SIGIP_BORRADOR"],
    ["outbox", "SIGIP_OUTBOX"],
    ["audit", "SIGIP_AUDITORIA"],
  ])
    if (keys.includes(key))
      state[key] = rows(table).map((r) => unpack(r.DATOS));
  return state;
}
