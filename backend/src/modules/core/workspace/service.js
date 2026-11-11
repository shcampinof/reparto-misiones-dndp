import { createHash, randomUUID } from "node:crypto";
import { AppError } from "../../../shared/errors.js";
import {
  CAPABILITIES as C,
  assertCapability,
  hasCapability,
} from "../auth/capabilities.js";
import { normalizeDelivery } from "../../demo/delivery.js";

const fail = (status, code, message) => {
  throw new AppError(status, code, message);
};
const metadata = ({ contentBase64: _bytes, ...document }) => document;
const areaName = (area) => {
  const value = String(area).toUpperCase();
  if (!["INVESTIGACION", "VICTIMAS"].includes(value))
    fail(404, "AREA_NOT_FOUND", "Área no encontrada");
  return value;
};
const escapeHtml = (text) =>
  String(text ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export function createWorkspaceService({
  repository,
  config,
  clock = () => new Date().toISOString(),
}) {
  const policy = config.files;
  function locate(state, auth, area, itemId) {
    const request = state.requests.find(
      (r) => r.area === areaName(area) && r.items.some((i) => i.id === itemId),
    );
    const item = request?.items.find((i) => i.id === itemId);
    if (!item) fail(404, "ITEM_NOT_FOUND", "Encargo no encontrado");
    const context = {
      area: request.area,
      region: item.region,
      ownerUserId: request.ownerUserId,
      assigneeId: item.assigneeId,
    };
    assertCapability(auth, C.CONSULTAR_SOLICITUDES, context);
    return { request, item, context };
  }
  function contentAllowed(auth, { request, item }) {
    return (
      request.area !== "VICTIMAS" ||
      request.ownerUserId === auth.sub ||
      Boolean(auth.executorId && auth.executorId === item.assigneeId)
    );
  }
  function audit(state, auth, type, extra = {}) {
    state.audit.push({ type, actor: auth.sub, at: clock(), ...extra });
  }
  function draftPermission(auth, area) {
    assertCapability(
      auth,
      area === "INVESTIGACION"
        ? C.CREAR_SOLICITUD_INVESTIGACION
        : C.CREAR_SOLICITUD_VICTIMAS,
      { area, ownerUserId: auth.sub },
    );
  }
  return {
    policy: () => ({
      version: policy.version,
      maxFileBytes: policy.maxFileBytes,
      maxIntakeBytes: policy.maxIntakeBytes,
      maxItemBytes: policy.maxItemBytes,
      antivirus: Boolean(policy.antimalwareCommand),
    }),
    async drafts(auth, area) {
      area = areaName(area);
      draftPermission(auth, area);
      return ((await repository.snapshot()).drafts || [])
        .filter(
          (d) => d.ownerUserId === auth.sub && d.area === area && !d.deletedAt,
        )
        .map((d) => ({
          id: d.id,
          revision: d.revision,
          updatedAt: d.updatedAt,
          title: d.title,
        }));
    },
    async draft(auth, area, id) {
      area = areaName(area);
      draftPermission(auth, area);
      const d = (await repository.snapshot()).drafts?.find(
        (d) =>
          d.id === id &&
          d.area === area &&
          d.ownerUserId === auth.sub &&
          !d.deletedAt,
      );
      if (!d) fail(404, "DRAFT_NOT_FOUND", "Borrador no encontrado");
      return d;
    },
    saveDraft(auth, area, payload) {
      area = areaName(area);
      draftPermission(auth, area);
      if (
        !/^[a-zA-Z0-9-]{8,80}$/.test(payload.id || "") ||
        !payload.data ||
        typeof payload.data !== "object" ||
        Array.isArray(payload.data)
      )
        fail(400, "INVALID_DRAFT", "Borrador no válido");
      if (
        Buffer.byteLength(JSON.stringify(payload.data)) > policy.maxRequestBytes
      )
        fail(413, "DRAFT_TOO_LARGE", "El borrador supera el tamaño permitido");
      // Only form data is retained. Ownership, grants, assignment and state never come from drafts.
      const allowed = [
        "form",
        "persons",
        "documents",
        "services",
        "serviceRegions",
        "step",
        "submissionId",
      ];
      const data = Object.fromEntries(
        allowed
          .filter((key) => key in payload.data)
          .map((key) => [key, structuredClone(payload.data[key])]),
      );
      return repository.transaction((state) => {
        state.drafts ||= [];
        let draft = state.drafts.find((d) => d.id === payload.id);
        if (
          draft &&
          (draft.ownerUserId !== auth.sub ||
            draft.area !== area ||
            draft.deletedAt)
        )
          fail(404, "DRAFT_NOT_FOUND", "Borrador no encontrado");
        if ((draft?.revision || 0) !== payload.revision)
          fail(
            409,
            "DRAFT_CONFLICT",
            "El borrador cambió en otra sesión. Recupérelo antes de guardar.",
          );
        if (!draft) {
          if (
            state.drafts.filter(
              (d) => d.ownerUserId === auth.sub && !d.deletedAt,
            ).length >= 20
          )
            fail(
              409,
              "DRAFT_LIMIT",
              "Archive un borrador antes de crear otro (máximo técnico: 20).",
            );
          draft = { id: payload.id, area, ownerUserId: auth.sub, revision: 0 };
          state.drafts.push(draft);
        }
        Object.assign(draft, {
          data,
          title: String(
            data.form?.spoa ||
              data.form?.externalId ||
              "Solicitud sin identificador",
          ).slice(0, 100),
          revision: draft.revision + 1,
          updatedAt: clock(),
        });
        audit(state, auth, "BORRADOR_GUARDADO", {
          draftId: draft.id,
          revision: draft.revision,
        });
        return draft;
      });
    },
    async deleteDraft(auth, area, id, revision) {
      await this.draft(auth, area, id);
      return repository.transaction((state) => {
        const d = state.drafts.find(
          (d) => d.id === id && d.ownerUserId === auth.sub && !d.deletedAt,
        );
        if (!d || d.revision !== revision)
          fail(409, "DRAFT_CONFLICT", "El borrador cambió en otra sesión");
        d.deletedAt = clock();
        d.revision++;
        audit(state, auth, "BORRADOR_ARCHIVADO", { draftId: id });
        return { archived: true };
      });
    },
    async documents(auth, area, itemId) {
      const state = await repository.snapshot(),
        found = locate(state, auth, area, itemId);
      const canRead = contentAllowed(auth, found);
      return {
        canRead,
        canUpload:
          canRead &&
          !["CERRADA", "IMPROCEDENTE"].includes(found.item.status) &&
          (found.request.ownerUserId === auth.sub ||
            hasCapability(
              auth,
              found.request.area === "VICTIMAS"
                ? C.EJECUTAR_ITEM_VICTIMAS
                : C.EJECUTAR_ITEM_INVESTIGACION,
              found.context,
            ) ||
            hasCapability(
              auth,
              C.APROBAR_INFORME_INVESTIGACION,
              found.context,
            )),
        documents: (state.workspaceDocuments || [])
          .filter((d) => d.itemId === itemId)
          .map((d) =>
            canRead
              ? metadata(d)
              : {
                  id: d.id,
                  documentId: d.documentId,
                  version: d.version,
                  type: d.type,
                  createdAt: d.createdAt,
                  reserved: true,
                },
          ),
      };
    },
    async upload(auth, area, itemId, payload) {
      const permissions = await this.documents(auth, area, itemId);
      if (!permissions.canRead)
        fail(
          403,
          "RESERVED_DOCUMENT",
          "Contenido reservado al titular y ejecutor asignado",
        );
      if (
        !/^[a-zA-Z0-9-]{8,80}$/.test(payload.submissionId || "") ||
        !String(payload.reason || "").trim() ||
        String(payload.reason).length > 1000
      )
        fail(
          400,
          "INVALID_DOCUMENT",
          "Indique motivo y un identificador de envío válido",
        );
      if (
        ![
          "ANEXO",
          "ACTUACION",
          "PROBLEMA",
          "PRORROGA",
          "VERIFICACION",
          "ENVIO",
        ].includes(payload.type)
      )
        fail(400, "INVALID_DOCUMENT_TYPE", "Tipo de soporte no permitido");
      const { attachment } = normalizeDelivery(
        { deliveryMode: "PDF", file: payload.file },
        "reference",
        { maxFileBytes: policy.maxFileBytes },
      );
      const fingerprint = createHash("sha256")
        .update(
          JSON.stringify([
            attachment.sha256,
            attachment.name,
            payload.type,
            payload.reason,
            payload.documentId || null,
          ]),
        )
        .digest("hex");
      return repository.transaction((state) => {
        const found = locate(state, auth, area, itemId);
        state.workspaceDocuments ||= [];
        const replay = state.workspaceDocuments.find(
          (d) =>
            d.submissionId === payload.submissionId && d.authorId === auth.sub,
        );
        if (replay) {
          if (replay.itemId !== itemId || replay.fingerprint !== fingerprint)
            fail(
              409,
              "IDEMPOTENCY_CONFLICT",
              "El envío ya se usó con otro contenido",
            );
          return metadata(replay);
        }
        if (
          !permissions.canUpload ||
          !contentAllowed(auth, found) ||
          ["CERRADA", "IMPROCEDENTE"].includes(found.item.status)
        )
          fail(
            403,
            "UPLOAD_FORBIDDEN",
            "No puede aportar documentos en este encargo o estado",
          );
        const docs = state.workspaceDocuments.filter(
          (d) => d.itemId === itemId,
        );
        const previous = payload.documentId
          ? docs.filter((d) => d.documentId === payload.documentId).at(-1)
          : null;
        if (payload.documentId && !previous)
          fail(404, "DOCUMENT_NOT_FOUND", "Documento original no encontrado");
        if (
          previous &&
          (previous.version !== payload.previousVersion ||
            previous.type !== payload.type)
        )
          fail(
            409,
            "DOCUMENT_CONFLICT",
            "La versión o tipo cambió. Actualice la lista antes de reemplazar.",
          );
        if (
          docs.reduce((sum, d) => sum + d.size, 0) + attachment.size >
          policy.maxItemBytes
        )
          fail(
            413,
            "ITEM_QUOTA",
            "Los soportes y sus versiones superan la cuota técnica del encargo",
          );
        const document = {
          ...attachment,
          id: randomUUID(),
          documentId: previous?.documentId || randomUUID(),
          itemId,
          requestId: found.request.id,
          area: found.request.area,
          version: (previous?.version || 0) + 1,
          type: payload.type,
          reason: payload.reason.trim(),
          authorId: auth.sub,
          author: auth.fullName || auth.sub,
          createdAt: clock(),
          submissionId: payload.submissionId,
          fingerprint,
          validationStatus: payload.validationStatus || "VALIDACION_BASICA",
          policyVersion: policy.version,
          policySnapshot: {
            version: policy.version,
            maxFileBytes: policy.maxFileBytes,
            maxItemBytes: policy.maxItemBytes,
          },
        };
        state.workspaceDocuments.push(document);
        found.item.timeline.push({
          at: clock(),
          from: found.item.status,
          to: found.item.status,
          actor: auth.sub,
          message: `Soporte ${payload.type} registrado · versión ${document.version}`,
        });
        audit(state, auth, "SOPORTE_REGISTRADO", {
          itemId,
          documentId: document.id,
          version: document.version,
        });
        return metadata(document);
      });
    },
    download(auth, area, itemId, id) {
      return repository.transaction((state) => {
        const found = locate(state, auth, area, itemId);
        if (!contentAllowed(auth, found))
          fail(
            403,
            "RESERVED_DOCUMENT",
            "Contenido reservado al titular y ejecutor asignado",
          );
        const document = state.workspaceDocuments?.find(
          (d) => d.itemId === itemId && d.id === id,
        );
        if (!document)
          fail(404, "DOCUMENT_NOT_FOUND", "Documento no encontrado");
        audit(state, auth, "CONSULTA_SOPORTE", { itemId, documentId: id });
        return {
          name: document.name,
          bytes: Buffer.from(document.contentBase64, "base64"),
        };
      });
    },
    readNotification(auth, id) {
      return repository.transaction((state) => {
        const entry = state.outbox?.find(
          (e) => e.id === id && e.recipientUserId === auth.sub,
        );
        if (!entry) fail(404, "NOTICE_NOT_FOUND", "Aviso no encontrado");
        locate(state, auth, entry.area, entry.itemId);
        entry.readAt ||= clock();
        return { readAt: entry.readAt };
      });
    },
    retryNotification(auth, id) {
      return repository.transaction((state) => {
        const entry = state.outbox?.find(
          (e) => e.id === id && e.recipientUserId === auth.sub,
        );
        if (!entry) fail(404, "NOTICE_NOT_FOUND", "Aviso no encontrado");
        locate(state, auth, entry.area, entry.itemId);
        if (entry.status !== "FALLIDA")
          fail(
            409,
            "NOTICE_NOT_RETRYABLE",
            "Sólo puede reintentar un envío fallido con proveedor configurado",
          );
        entry.status = "PENDIENTE";
        entry.nextAttemptAt = clock();
        audit(state, auth, "AVISO_REINTENTO", { notificationId: id });
        return { status: entry.status };
      });
    },
    receipt(auth, area, itemId) {
      return repository.transaction((state) => {
        const { request, item } = locate(state, auth, area, itemId);
        const receiptId = randomUUID();
        audit(state, auth, "CONSTANCIA_DESCARGADA", { itemId, receiptId });
        const dated = (value) =>
          value
            ? new Date(value).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
              })
            : "Sin registro";
        const approved = request.versions?.find(
          (v) => v.version === item.approvedSubmissionVersion,
        )?.data;
        const contextId =
          request.area === "VICTIMAS" &&
          auth.executorId &&
          auth.executorId === item.assigneeId
            ? approved?.externalId
            : request.externalId;
        const rows = [
          ["Constancia", receiptId],
          ["Solicitud", request.id],
          ["Encargo", item.id],
          ["Identificador del caso", contextId || "Sin registro"],
          ["Área", request.area],
          ["Radicación (Bogotá)", dated(request.createdAt)],
          ["Estado", item.status],
          [
            "Responsable",
            state.professionals.find((p) => p.id === item.assigneeId)
              ?.displayName || "Sin asignar",
          ],
          [
            "Asignación (Bogotá)",
            dated(item.timeline?.find((event) => event.to === "ASIGNADA")?.at),
          ],
          ["Vencimiento", item.dueDate || "Según política aplicable"],
          [
            "Cierre (Bogotá)",
            dated(
              item.timeline?.findLast((event) => event.to === "CERRADA")?.at,
            ),
          ],
          [
            "Constancia de envío",
            item.dispatch?.evidence || "Sin envío acreditado",
          ],
          ["Corte (Bogotá)", dated(clock())],
        ];
        return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Constancia ${escapeHtml(item.id)}</title><style>body{font:15px Arial;max-width:800px;margin:40px auto;padding:20px;color:#29333f}h1{font-size:23px;font-weight:600}dt{font-weight:600;margin-top:14px}dd{margin:4px 0;overflow-wrap:anywhere}</style><h1>Constancia de seguimiento SIGIP-DP</h1><p>Esta constancia contiene los eventos registrados en el aplicativo a la fecha de corte. El registro de envío no equivale a un acuse de recibo ni a una firma digital.</p><dl>${rows.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl></html>`;
      });
    },
  };
}
