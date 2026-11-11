import { useState } from "react";
import {
  apiInvestigationAction,
  apiVictimsAction,
  apiExportInvestigation,
  apiWorkspace,
} from "../api.js";

const dateInBogota = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
const statusLabels = {
  RADICADA: "Radicada",
  ASIGNADA: "Asignada",
  EN_EJECUCION: "En ejecución",
  INFORME_ENTREGADO: "Informe entregado",
  APROBADO_PENDIENTE_ENVIO: "Pendiente envío al defensor",
  PENDIENTE_EXCEPCION: "Pendiente de excepción",
  PENDIENTE_ENRUTAMIENTO: "Pendiente de enrutamiento",
  CERRADA: "Cerrada",
};

export function ExportInvestigation({
  token,
  filters = {},
  label = "Descargar Excel",
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const blob = await apiExportInvestigation(token, filters);
      const url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Control-misiones-Investigacion.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="export-download">
      <button type="button" disabled={busy} onClick={download}>
        {busy ? "Generando Excel…" : label}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function InvestigationOperations({
  item,
  profile,
  catalogs,
  token,
  busy,
  run,
  area = "INVESTIGACION",
}) {
  const [reason, setReason] = useState(""),
    [support, setSupport] = useState("");
  const [observation, setObservation] = useState("");
  const [days, setDays] = useState("");
  const [region, setRegion] = useState(""),
    [service, setService] = useState("");
  const [completed, setCompleted] = useState(""),
    [pending, setPending] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submissionIds, setSubmissionIds] = useState({});
  const has = (capability) =>
    (profile.grants || []).some(
      (grant) =>
        grant.capability === capability &&
        grant.area === area &&
        (!grant.validFrom || grant.validFrom <= new Date().toISOString()) &&
        (!grant.validTo || grant.validTo > new Date().toISOString()),
    );
  function send(action, payload, message) {
    const submissionId = submissionIds[action] || crypto.randomUUID();
    setSubmissionIds((current) => ({ ...current, [action]: submissionId }));
    run(
      item.id,
      () =>
        (area === "VICTIMAS" ? apiVictimsAction : apiInvestigationAction)(
          token,
          item.id,
          action,
          {
            ...payload,
            submissionId,
          },
        ),
      message,
      () => setSubmissionIds((current) => ({ ...current, [action]: null })),
    );
  }
  function changed(setter) {
    return (event) => {
      setter(event.target.value);
      setSubmissionIds({});
    };
  }
  const extensions = item.termExtensions || [];
  return (
    <div className="investigation-operations">
      {has("SOLICITAR_PRORROGA") && item.status === "EN_EJECUCION" && (
        <details>
          <summary>Solicitar ampliación de términos</summary>
          <p>
            Solicítela durante la ejecución y antes de entregar el informe. El
            vencimiento sólo cambia después de la decisión del gestor regional.
          </p>
          <label>
            Motivo de ampliación
            <input value={reason} onChange={changed(setReason)} />
          </label>
          <label>
            Soporte de ampliación
            <input value={support} onChange={changed(setSupport)} />
          </label>
          <button
            disabled={
              busy ||
              !reason.trim() ||
              !support.trim() ||
              extensions.some((entry) => entry.status === "SOLICITADA")
            }
            onClick={() =>
              send(
                "solicitar-prorroga",
                { reason, supportReference: support },
                "Solicitud de ampliación de términos registrada",
              )
            }
          >
            Enviar solicitud de ampliación
          </button>
        </details>
      )}
      {extensions.length > 0 && (
        <details open>
          <summary>Ampliaciones de términos · {extensions.length}</summary>
          {extensions.map((extension) => (
            <article key={extension.id}>
              <strong>
                {extension.status} · {extension.reason}
              </strong>
              <p>Soporte: {extension.supportReference}</p>
              {extension.newDueDate && (
                <p>Nuevo vencimiento: {extension.newDueDate}</p>
              )}
              {extension.observation && (
                <p>Decisión: {extension.observation}</p>
              )}
              {extension.status === "SOLICITADA" &&
                has(
                  area === "VICTIMAS"
                    ? "DECIDIR_PRORROGA_VICTIMAS"
                    : "DECIDIR_PRORROGA_INVESTIGACION",
                ) && (
                  <>
                    <p>
                      Registre la justificación y los días concedidos. Se aplica
                      la política vigente conservando el vencimiento anterior.
                    </p>
                    <label>
                      Observación de ampliación
                      <input
                        value={observation}
                        onChange={changed(setObservation)}
                      />
                    </label>
                    <label>
                      Días de ampliación
                      <input
                        type="number"
                        min="1"
                        max={item.termSnapshot?.value || undefined}
                        value={days}
                        onChange={changed(setDays)}
                        placeholder="Hasta el término inicial"
                      />
                    </label>
                    {[
                      ["APROBADA", "Aprobar ampliación"],
                      ["RECHAZADA", "Rechazar ampliación"],
                    ].map(([decision, label]) => (
                      <button
                        key={decision}
                        disabled={
                          busy ||
                          !observation.trim() ||
                          (decision === "APROBADA" &&
                            (!days || Number(days) < 1))
                        }
                        onClick={() =>
                          send(
                            "decidir-prorroga",
                            {
                              extensionId: extension.id,
                              decision,
                              observation,
                              ...(decision === "APROBADA"
                                ? { days: Number(days) }
                                : {}),
                            },
                            "Decisión de ampliación registrada",
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </>
                )}
            </article>
          ))}
        </details>
      )}
      {has("REMITIR_ACTIVIDAD_INVESTIGACION") &&
        ["ASIGNADA", "EN_EJECUCION", "INFORME_ENTREGADO"].includes(
          item.status,
        ) && (
          <details>
            <summary>Remitir actividad a otra regional</summary>
            <p>
              Conserva el SPOA, el solicitante y el vínculo con la misión
              original. La regional receptora recibe la actividad y el servidor
              calcula el reparto según cobertura y disponibilidad.
            </p>
            <label>
              Servicio de la actividad derivada
              <select value={service} onChange={changed(setService)}>
                <option value="">Seleccione</option>
                {catalogs.investigationServices.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Regional receptora
              <select value={region} onChange={changed(setRegion)}>
                <option value="">Seleccione</option>
                {catalogs.regions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Motivo de remisión
              <input value={reason} onChange={changed(setReason)} />
            </label>
            <label>
              Actividades ya realizadas
              <textarea value={completed} onChange={changed(setCompleted)} />
            </label>
            <label>
              Actividades para la regional receptora
              <textarea value={pending} onChange={changed(setPending)} />
            </label>
            <button
              disabled={
                busy ||
                !service ||
                !region ||
                !reason.trim() ||
                !completed.trim() ||
                !pending.trim()
              }
              onClick={() =>
                send(
                  "remitir-actividad",
                  {
                    service,
                    region,
                    reason,
                    completedActivities: completed,
                    pendingActivities: pending,
                  },
                  "Actividad derivada enviada a la regional receptora",
                )
              }
            >
              Crear remisión vinculada
            </button>
          </details>
        )}
      {item.referral && (
        <article>
          <strong>Actividad vinculada a {item.originItemId}</strong>
          <p>Ya realizado: {item.referral.completedActivities}</p>
          <p>Encargo receptor: {item.referral.pendingActivities}</p>
          {item.status === "PENDIENTE_ENRUTAMIENTO" &&
            has("ENRUTAR_ACTIVIDAD_INVESTIGACION") && (
              <>
                <label>
                  Observación de recepción
                  <input
                    value={observation}
                    onChange={changed(setObservation)}
                  />
                </label>
                <button
                  disabled={busy || !observation.trim()}
                  onClick={() =>
                    send(
                      "enrutar-actividad",
                      { observation },
                      "Remisión enrutada mediante reparto automático",
                    )
                  }
                >
                  Recibir y calcular reparto
                </button>
              </>
            )}
        </article>
      )}
      {item.status === "APROBADO_PENDIENTE_ENVIO" &&
        has("EJECUTAR_ITEM_INVESTIGACION") && (
          <div className="execution-panel">
            <strong>Envío del informe al defensor</strong>
            <p>
              Registre la constancia del envío realizado por correo o canal
              institucional. El aplicativo no envía correo mientras no exista
              conexión configurada.
            </p>
            <label>
              Constancia del envío al defensor
              <input value={evidence} onChange={changed(setEvidence)} />
            </label>
            <button
              disabled={busy || !evidence.trim()}
              onClick={() =>
                send(
                  "registrar-envio",
                  { evidence },
                  "Envío acreditado y misión cerrada",
                )
              }
            >
              Registrar envío y cerrar
            </button>
          </div>
        )}
    </div>
  );
}

export function NotificationTray({ notifications, token, onChanged }) {
  const [error, setError] = useState("");
  async function update(id, action) {
    setError("");
    try {
      await apiWorkspace(token, `notifications/${id}/${action}`, "POST");
      await onChanged();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <details className="notification-tray">
      <summary>
        Notificaciones · {notifications.filter((n) => !n.readAt).length} sin
        leer
      </summary>
      {error && <p role="alert">{error}</p>}
      <p>
        Constancias del aplicativo. Correo institucional pendiente de
        configuración.
      </p>
      {notifications.length ? (
        <ul>
          {notifications.map((entry) => (
            <li key={entry.id}>
              <strong>
                {entry.type === "MISION_ASIGNADA"
                  ? entry.area === "INVESTIGACION"
                    ? "Misión asignada"
                    : "Encargo asignado"
                  : entry.type.startsWith("SOLICITUD_DEVUELTA")
                    ? "Solicitud devuelta para corregir"
                    : "Encargo finalizado"}
              </strong>{" "}
              · {entry.requestId} · {entry.itemId}
              <small>
                {new Date(entry.createdAt).toLocaleString("es-CO", {
                  timeZone: "America/Bogota",
                })}{" "}
                · Correo:{" "}
                {entry.status === "PENDIENTE_CONFIGURACION"
                  ? "pendiente de configuración"
                  : entry.status}
              </small>
              {!entry.readAt && (
                <button type="button" onClick={() => update(entry.id, "read")}>
                  Marcar como leído
                </button>
              )}
              {entry.status === "FALLIDA" && (
                <button type="button" onClick={() => update(entry.id, "retry")}>
                  Reintentar envío fallido
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin avisos nuevos.</p>
      )}
    </details>
  );
}

export function InvestigationControl({ requests, token, catalogs }) {
  const [filters, setFilters] = useState({
    region: "",
    assignee: "",
    status: "",
    from: "",
    to: "",
    overdue: "",
  });
  const update = (key) => (event) =>
    setFilters((current) => ({ ...current, [key]: event.target.value }));
  const items = requests.flatMap((request) =>
    request.items.map((item) => ({ ...item, request })),
  );
  const assignees = [
    ...new Map(
      items
        .filter((item) => item.assigneeId)
        .map((item) => [item.assigneeId, item.assigneeName]),
    ).entries(),
  ];
  const visible = items.filter(
    (item) =>
      (!filters.region || item.region === filters.region) &&
      (!filters.assignee || item.assigneeId === filters.assignee) &&
      (!filters.status || item.status === filters.status) &&
      (!filters.from || dateInBogota(item.request.createdAt) >= filters.from) &&
      (!filters.to || dateInBogota(item.request.createdAt) <= filters.to) &&
      (!filters.overdue ||
        (item.tracking?.configured &&
          item.tracking.daysRemaining < 0 &&
          item.status !== "CERRADA")),
  );
  return (
    <section className="supervision-panel investigation-control">
      <div className="section-title">
        <div>
          <small>Consulta y seguimiento</small>
          <h2>Control de misiones de Investigación</h2>
        </div>
        <ExportInvestigation token={token} filters={filters} />
      </div>
      <p>
        Un ítem por fila. El identificador de misión se conserva durante el
        trámite. La homologación completa del F-147 requiere el formato y el
        procedimiento oficiales.
      </p>
      <div className="supervision-filters">
        <label>
          Regional del control
          <select value={filters.region} onChange={update("region")}>
            <option value="">Todas las autorizadas</option>
            {catalogs.regions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Investigador del control
          <select value={filters.assignee} onChange={update("assignee")}>
            <option value="">Todos los autorizados</option>
            {assignees.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado del control
          <select value={filters.status} onChange={update("status")}>
            <option value="">Todos</option>
            {[...new Set(items.map((item) => item.status))].map((status) => (
              <option key={status} value={status}>
                {statusLabels[status] || status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={filters.from} onChange={update("from")} />
        </label>
        <label>
          Hasta
          <input type="date" value={filters.to} onChange={update("to")} />
        </label>
        <label>
          Vencimiento
          <select value={filters.overdue} onChange={update("overdue")}>
            <option value="">Todos</option>
            <option value="true">Sólo vencidas con plazo configurado</option>
          </select>
        </label>
      </div>
      <div className="supervision-table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Misión",
                "Servicio / ítem",
                "Regional",
                "Investigador",
                "Ingreso",
                "Vencimiento",
                "Estado",
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id}>
                <td>{item.request.displayNumber || item.request.id}</td>
                <td>
                  {item.serviceLabel}
                  <small>{item.id}</small>
                </td>
                <td>{item.regionLabel}</td>
                <td>{item.assigneeName || "Sin asignar"}</td>
                <td>
                  {new Date(item.request.createdAt).toLocaleDateString(
                    "es-CO",
                    { timeZone: "America/Bogota" },
                  )}
                </td>
                <td>{item.dueDate || "Política pendiente"}</td>
                <td>{statusLabels[item.status] || item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <small>
        {visible.length} ítem(s) · Corte actual de los registros autorizados
      </small>
    </section>
  );
}
