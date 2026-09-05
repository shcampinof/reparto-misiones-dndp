import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiAssignInvestigation,
  apiCreateInvestigation,
  apiCreateVictims,
  apiDemoBootstrap,
  apiInvestigationAction,
  apiResetDemo,
  apiVictimsAction,
} from "../api";
import { useAuth } from "../context/AuthContext";

const STATUS_LABELS = {
  RADICADA: "Radicada",
  PENDIENTE_APROBACION_PAG: "Pendiente aprobación PAG",
  APROBADA_REPARTO: "Aprobada para reparto",
  PENDIENTE_REASIGNACION: "Sin candidato / pendiente",
  ASIGNADA: "Asignada",
  EN_EJECUCION: "En ejecución",
  INFORME_ENTREGADO: "Informe entregado",
  CERRADA: "Cerrada",
};

const AREA_META = {
  INVESTIGACION: {
    label: "Investigación",
    subtitle: "Misiones de trabajo para la defensa",
    accent: "#074794",
  },
  VICTIMAS: {
    label: "Víctimas",
    subtitle: "Asignación de actividades periciales",
    accent: "#2f64ad",
  },
};

const TRAYS = [
  { id: "PENDIENTES", label: "Pendientes" },
  { id: "EN_EJECUCION", label: "En ejecución" },
  { id: "POR_REVISAR", label: "Por revisar" },
  { id: "CERRADOS", label: "Cerrados" },
];

export default function PortalPage() {
  const { token, profile, logout } = useAuth();
  const [data, setData] = useState(null);
  const [area, setArea] = useState(
    profile?.area === "VICTIMAS" ? "VICTIMAS" : "INVESTIGACION",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tray, setTray] = useState("");
  const [detail, setDetail] = useState(null);
  const detailOpenerRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  const closeDetail = useCallback(() => {
    const opener = detailOpenerRef.current;
    setDetail(null);
    window.setTimeout(() => opener?.focus({ preventScroll: true }), 0);
  }, []);

  function openDetail(requestId, itemId, opener) {
    detailOpenerRef.current = opener;
    setDetail({ requestId, itemId });
  }

  const reload = useCallback(async () => {
    const response = await apiDemoBootstrap(token);
    setData(response);
    if (!response.allowedAreas.includes(area))
      setArea(response.allowedAreas[0] || "INVESTIGACION");
    return response;
  }, [token, area]);

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    setTray("");
    setDetail(null);
  }, [area]);

  useEffect(() => {
    if (!detail) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detail, closeDetail]);

  async function run(key, action, successMessage) {
    if (busy) return;
    setBusy(key);
    setMessage("");
    setError("");
    try {
      await action();
      await reload();
      setMessage(successMessage);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  if (loading)
    return (
      <div className="screen-loader">Cargando ambiente de demostración...</div>
    );
  if (!data)
    return (
      <div className="screen-loader">
        {error || "No fue posible iniciar la demostración"}
      </div>
    );

  const requests = data.requests.filter((request) => request.area === area);
  const trayCounts = Object.fromEntries(
    TRAYS.map(({ id }) => [
      id,
      requests
        .flatMap((request) => request.items)
        .filter((item) => trayForStatus(item.status) === id).length,
    ]),
  );
  const activeTray =
    tray || TRAYS.find(({ id }) => trayCounts[id] > 0)?.id || "PENDIENTES";
  const visibleRequests = requests
    .map((request) => ({
      ...request,
      items: request.items.filter(
        (item) => trayForStatus(item.status) === activeTray,
      ),
    }))
    .filter((request) => request.items.length > 0);
  const detailRequest = detail
    ? requests.find((entry) => entry.id === detail.requestId)
    : null;
  const detailItem = detailRequest?.items.find(
    (entry) => entry.id === detail?.itemId,
  );
  const detailRecord =
    detailRequest && detailItem
      ? { request: detailRequest, item: detailItem }
      : null;
  const dashboard = data.dashboards[area] || {
    requests: 0,
    pending: 0,
    active: 0,
    closed: 0,
  };
  const canUseArea = (target) => data.allowedAreas.includes(target);

  return (
    <div
      className="demo-portal"
      style={{ "--area-accent": AREA_META[area].accent }}
    >
      <div className="demo-banner">{data.banner}</div>
      <header className="demo-header">
        <div className="demo-brand">
          <div>
            <strong>Defensoría del Pueblo</strong>
            <span>SIGIP-DP</span>
            <small>
              Sistema de Información para la Gestión Investigativa y Pericial
            </small>
          </div>
        </div>
        <nav className="portal-area-tabs" aria-label="Módulos del portal">
          {Object.entries(AREA_META).map(([id, meta]) => (
            <button
              type="button"
              key={id}
              className={area === id ? "active" : ""}
              disabled={!canUseArea(id)}
              aria-current={area === id ? "page" : undefined}
              title={
                canUseArea(id)
                  ? `Abrir módulo de ${meta.label}`
                  : `${meta.label}: no habilitada para esta cuenta`
              }
              onClick={() => setArea(id)}
            >
              {meta.label}
            </button>
          ))}
        </nav>
        <div className="demo-profile">
          <span>{profile?.initials || "DE"}</span>
          <div>
            <strong>{profile?.fullName || "Usuario demo"}</strong>
            <small>{profile?.roleLabel || profile?.role}</small>
          </div>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <main className="demo-content">
        <section className="area-heading">
          <div>
            <small>Área activa</small>
            <h1>{AREA_META[area].label}</h1>
            <p>{AREA_META[area].subtitle}</p>
          </div>
          {profile?.role === "administrador" && (
            <button
              className="reset-demo"
              disabled={Boolean(busy)}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Restablecer los datos sintéticos de la demostración? Se descartarán los cambios temporales.",
                  )
                ) {
                  run(
                    "reset",
                    () => apiResetDemo(token),
                    "Datos sintéticos restablecidos correctamente",
                  );
                }
              }}
            >
              Restablecer datos de demostración
            </button>
          )}
        </section>

        {(message || error) && (
          <div
            className={error ? "notice error" : "notice success"}
            role={error ? "alert" : "status"}
            aria-live="polite"
          >
            {error || message}
          </div>
        )}

        <section className="demo-kpis">
          <Kpi label="Solicitudes" value={dashboard.requests} tone="blue" />
          <Kpi label="Pendientes" value={dashboard.pending} tone="amber" />
          <Kpi label="En gestión" value={dashboard.active} tone="purple" />
          <Kpi label="Cerradas" value={dashboard.closed} tone="green" />
        </section>

        {area === "INVESTIGACION" && profile?.role === "defensor" && (
          <InvestigationForm
            catalogs={data.catalogs}
            token={token}
            run={run}
            busy={Boolean(busy)}
          />
        )}
        {area === "VICTIMAS" && profile?.role === "rjv" && (
          <VictimsForm
            catalogs={data.catalogs}
            token={token}
            run={run}
            busy={Boolean(busy)}
          />
        )}

        <section className="request-section">
          <div className="section-title">
            <div>
              <small>Bandeja del rol</small>
              <h2>Solicitudes y encargos</h2>
            </div>
            <span>{requests.length} caso(s) visibles</span>
          </div>
          <nav className="role-trays" aria-label="Bandejas del rol">
            {TRAYS.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className={activeTray === entry.id ? "active" : ""}
                aria-pressed={activeTray === entry.id}
                onClick={() => setTray(entry.id)}
              >
                <span>{entry.label}</span>
                <strong>{trayCounts[entry.id]}</strong>
              </button>
            ))}
          </nav>
          {visibleRequests.length === 0 ? (
            <div className="presentable-empty">
              <strong>Sin casos en esta bandeja</strong>
              <p>
                El rol no tiene registros en la etapa seleccionada. Puede
                consultar otra bandeja sin cambiar sus permisos.
              </p>
            </div>
          ) : (
            <div className="request-grid">
              {visibleRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  profile={profile}
                  token={token}
                  busy={busy}
                  run={run}
                  onOpenDetail={(itemId, opener) =>
                    openDetail(request.id, itemId, opener)
                  }
                />
              ))}
            </div>
          )}
        </section>

        <footer className="demo-disclaimer">
          <strong>{data.parameters.label}</strong>
          <span>
            Política {data.parameters.version} · Plazos de calendario demo:
            Investigación {data.parameters.investigationTermDays} días /
            Víctimas {data.parameters.victimsTermDays} días.
          </span>
          <span>
            Persistencia temporal reiniciable. Sin Oracle, identidad
            institucional, documentos o integraciones reales.
          </span>
        </footer>
      </main>
      {detailRecord && (
        <CaseDetail
          request={detailRecord.request}
          item={detailRecord.item}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, tone }) {
  return (
    <article className={`demo-kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <i />
    </article>
  );
}

function InvestigationForm({ catalogs, token, run, busy }) {
  const [form, setForm] = useState({
    spoa: "110016000049202600099",
    delito: "Delito sintético para demostración",
    service: "INVESTIGACION_CAMPO",
    region: "BOGOTA",
  });
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <section className="creation-panel">
      <div className="panel-copy">
        <small>Paso 1</small>
        <h2>Radicar solicitud investigativa sintética</h2>
        <p>
          El reparto se ejecutará después en el backend; el formulario no envía
          investigador.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(
            "create-inv",
            () => apiCreateInvestigation(token, form),
            "Solicitud de Investigación radicada",
          );
        }}
      >
        <label>
          SPOA sintético
          <input value={form.spoa} onChange={update("spoa")} maxLength="21" />
        </label>
        <label>
          Delito
          <input value={form.delito} onChange={update("delito")} />
        </label>
        <label>
          Especialidad
          <select value={form.service} onChange={update("service")}>
            {catalogs.investigationServices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cobertura
          <select value={form.region} onChange={update("region")}>
            {catalogs.regions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-demo" disabled={busy}>
          {busy ? "Procesando..." : "Radicar solicitud"}
        </button>
      </form>
    </section>
  );
}

function VictimsForm({ catalogs, token, run, busy }) {
  const [form, setForm] = useState({
    externalId: "RAD-DEMO-2026-004",
    law: "LEY_1448",
    service: "PSICOLOGICO",
    region: "BOGOTA",
    victimCount: 2,
  });
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <section className="creation-panel victims">
      <div className="panel-copy">
        <small>Paso 1</small>
        <h2>Crear solicitud pericial sintética</h2>
        <p>
          Las víctimas se generan como alias; no se capturan nombres ni
          documentos personales.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(
            "create-vic",
            () =>
              apiCreateVictims(token, {
                ...form,
                victimCount: Number(form.victimCount),
              }),
            "Solicitud de Víctimas enviada a aprobación PAG",
          );
        }}
      >
        <label>
          Radicado sintético
          <input value={form.externalId} onChange={update("externalId")} />
        </label>
        <label>
          Ley/programa
          <select value={form.law} onChange={update("law")}>
            {catalogs.laws.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Peritaje
          <select value={form.service} onChange={update("service")}>
            {catalogs.victimServices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cobertura
          <select value={form.region} onChange={update("region")}>
            {catalogs.regions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Víctimas sintéticas
          <input
            type="number"
            min="1"
            max="5"
            value={form.victimCount}
            onChange={update("victimCount")}
          />
        </label>
        <button className="primary-demo" disabled={busy}>
          {busy ? "Procesando..." : "Enviar a aprobación previa"}
        </button>
      </form>
    </section>
  );
}

function RequestCard({ request, profile, token, busy, run, onOpenDetail }) {
  return (
    <article className="request-card">
      <header>
        <div>
          <small>
            {request.area === "INVESTIGACION"
              ? "Misión de trabajo"
              : "Solicitud pericial"}
          </small>
          <h3>{request.id}</h3>
        </div>
        <span className="external-id">{request.externalId}</span>
      </header>
      <p className="request-summary">{request.summary || "Caso sintético"}</p>
      {request.persons?.length > 0 && (
        <div className="synthetic-persons">
          <strong>{request.persons.length} víctima(s) sintética(s)</strong>
          {request.persons.map((person) => (
            <span key={person.alias}>
              {person.alias} ·{" "}
              {person.type === "DIRECTA" ? "Directa" : "Indirecta"}
            </span>
          ))}
        </div>
      )}
      {request.items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          area={request.area}
          profile={profile}
          token={token}
          busy={busy}
          run={run}
          onOpenDetail={(opener) => onOpenDetail(item.id, opener)}
        />
      ))}
    </article>
  );
}

function ItemCard({ item, area, profile, token, busy, run, onOpenDetail }) {
  const role = profile?.role;
  const isBusy = busy === item.id;
  const actionAvailable = canActOnItem(area, role, item.status);
  const nextAction = nextActionFor(area, item.status);
  const selectedCandidate = item.assignment?.evaluated?.find(
    (candidate) => candidate.candidateId === item.assigneeId,
  );
  return (
    <section className="item-card">
      <div className="item-top">
        <div>
          <strong>{item.serviceLabel || item.service}</strong>
          <small>
            {item.regionLabel || item.region}
            {item.lawLabel ? ` · ${item.lawLabel}` : ""}
          </small>
        </div>
        <span className={`status-pill status-${item.status.toLowerCase()}`}>
          {STATUS_LABELS[item.status] || item.status}
        </span>
      </div>
      <ProcessStepper area={area} status={item.status} />
      <div className="next-action">
        <span>Siguiente acción</span>
        <strong>{nextAction.action}</strong>
        <small>{nextAction.role}</small>
      </div>
      <div className="item-facts">
        <span>
          <small>Responsable</small>
          <strong>{item.assigneeName || "Pendiente de reparto"}</strong>
        </span>
        <span>
          <small>Progreso</small>
          <strong>{item.progress ?? 0}%</strong>
        </span>
        <span>
          <small>Carga al repartir</small>
          <strong>
            {selectedCandidate ? selectedCandidate.metrics.load : "No aplica"}
          </strong>
        </span>
        <span>
          <small>Plazo demo</small>
          <strong>{item.dueDate || "Por calcular"}</strong>
        </span>
        <span>
          <small>Producto</small>
          <strong>{item.reportReference || "Sin entrega"}</strong>
        </span>
      </div>
      <div className="progress-track demo">
        <i style={{ width: `${item.progress || 0}%` }} />
      </div>

      <div className="demo-actions">
        {area === "INVESTIGACION" &&
          role === "defensor" &&
          ["RADICADA", "PENDIENTE_REASIGNACION"].includes(item.status) && (
            <button
              disabled={isBusy}
              onClick={() =>
                run(
                  item.id,
                  () => apiAssignInvestigation(token, item.id),
                  "Reparto backend de Investigación completado",
                )
              }
            >
              Validar y ejecutar reparto
            </button>
          )}
        {area === "INVESTIGACION" &&
          role === "pag_investigacion" &&
          item.status === "INFORME_ENTREGADO" && (
            <ReviewActions item={item} token={token} busy={isBusy} run={run} />
          )}
        {area === "VICTIMAS" &&
          role === "pag_victimas" &&
          item.status === "PENDIENTE_APROBACION_PAG" && (
            <button
              disabled={isBusy}
              onClick={() =>
                run(
                  item.id,
                  () => apiVictimsAction(token, item.id, "aprobar-y-repartir"),
                  "Aprobación previa y reparto backend completados",
                )
              }
            >
              Aprobar y repartir
            </button>
          )}
        {area === "INVESTIGACION" && role === "investigador" && (
          <ExecutorActions
            item={item}
            token={token}
            busy={isBusy}
            run={run}
            area="INVESTIGACION"
          />
        )}
        {area === "VICTIMAS" && role === "perito" && (
          <ExecutorActions
            item={item}
            token={token}
            busy={isBusy}
            run={run}
            area="VICTIMAS"
          />
        )}
        <button
          className="detail-button"
          type="button"
          onClick={(event) => onOpenDetail(event.currentTarget)}
        >
          Ver detalle del caso
        </button>
      </div>

      {!actionAvailable && (
        <p className="action-guidance">
          {item.status === "CERRADA"
            ? "El servicio está cerrado; solo se permite consultar su trazabilidad."
            : `Esta cuenta puede consultar. La acción corresponde a ${nextAction.role.toLowerCase()}.`}
        </p>
      )}

      {item.assignment && (
        <AssignmentExplanation assignment={item.assignment} />
      )}
      <details className="timeline">
        <summary>Línea de tiempo · {item.timeline.length} evento(s)</summary>
        <ol>
          {item.timeline
            .slice()
            .reverse()
            .map((event, index) => (
              <li key={`${event.at}-${index}`}>
                <i />
                <div>
                  <strong>{STATUS_LABELS[event.to] || event.to}</strong>
                  <small>{new Date(event.at).toLocaleString("es-CO")}</small>
                  <p>{event.message}</p>
                </div>
              </li>
            ))}
        </ol>
      </details>
    </section>
  );
}

function ReviewActions({ item, token, busy, run }) {
  const [observation, setObservation] = useState(
    "Aclarar la conclusión técnica del informe",
  );
  return (
    <div className="review-actions">
      <label>
        Observación para devolución
        <input
          value={observation}
          onChange={(event) => setObservation(event.target.value)}
        />
      </label>
      <div>
        <button
          disabled={busy || !observation.trim()}
          onClick={() =>
            run(
              item.id,
              () =>
                apiInvestigationAction(token, item.id, "devolver-entrega", {
                  observation,
                }),
              "Informe devuelto al investigador para corrección",
            )
          }
        >
          Devolver informe
        </button>
        <button
          className="primary-demo"
          disabled={busy}
          onClick={() =>
            run(
              item.id,
              () => apiInvestigationAction(token, item.id, "aprobar-entrega"),
              "Entrega aprobada y misión cerrada",
            )
          }
        >
          Aprobar y cerrar
        </button>
      </div>
    </div>
  );
}

function ProcessStepper({ area, status }) {
  const process = processFor(area, status);
  return (
    <ol className="process-stepper" aria-label="Estado del proceso">
      {process.steps.map((step, index) => {
        const state =
          process.complete || index < process.current
            ? "complete"
            : index === process.current
              ? "current"
              : "upcoming";
        return (
          <li
            key={step}
            className={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span>{index + 1}</span>
            <small>{step}</small>
          </li>
        );
      })}
    </ol>
  );
}

function CaseDetail({ request, item, onClose }) {
  const closeButtonRef = useRef(null);
  const semaphore = semaphoreFor(item);
  const assignmentSummary = item.assignment
    ? `${item.assignment.selectedName || "Sin candidato"}. ${item.assignment.selectedReason}`
    : "El reparto todavía no se ha ejecutado.";
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  function keepFocusInside(event) {
    if (event.key !== "Tab") return;
    const focusable = event.currentTarget.querySelectorAll(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary",
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="detail-overlay" onMouseDown={onClose}>
      <aside
        className="case-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={keepFocusInside}
      >
        <header>
          <div>
            <small>Detalle de caso</small>
            <h2 id="case-detail-title">{request.id}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            Cerrar
          </button>
        </header>

        <dl className="detail-facts">
          <div>
            <dt>Identificador externo</dt>
            <dd>{request.externalId}</dd>
          </div>
          <div>
            <dt>Área y servicio</dt>
            <dd>
              {AREA_META[request.area].label} · {item.serviceLabel}
            </dd>
          </div>
          <div>
            <dt>Solicitante</dt>
            <dd>{request.requesterName}</dd>
          </div>
          <div>
            <dt>Responsable asignado</dt>
            <dd>{item.assigneeName || "Pendiente de reparto"}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{STATUS_LABELS[item.status] || item.status}</dd>
          </div>
          <div>
            <dt>Plazo y semáforo</dt>
            <dd>
              {item.dueDate || "Sin plazo asignado"} · {semaphore.label}
            </dd>
          </div>
          <div>
            <dt>Especialidad</dt>
            <dd>{item.serviceLabel}</dd>
          </div>
        </dl>

        <p className="validation-pending">
          Plazo y referencia de semáforo de demostración — pendiente de
          validación funcional.
        </p>

        <section className="detail-section">
          <h3>Explicación resumida de asignación</h3>
          <p>{assignmentSummary}</p>
        </section>

        <section className="detail-section">
          <h3>Documentos</h3>
          {item.documents?.length ? (
            <ul className="document-list">
              {item.documents.map((document) => (
                <li key={document.id}>
                  <strong>{document.type}</strong>
                  <span>
                    {document.reference} · Versión {document.version}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin referencias documentales registradas en esta etapa.</p>
          )}
        </section>

        <section className="detail-section">
          <h3>Historial cronológico</h3>
          <ol className="detail-timeline">
            {item.timeline
              .slice()
              .reverse()
              .map((event, index) => (
                <li key={`${event.at}-${index}`}>
                  <strong>{STATUS_LABELS[event.to] || event.to}</strong>
                  <small>{new Date(event.at).toLocaleString("es-CO")}</small>
                  <p>{event.message}</p>
                </li>
              ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}

function ExecutorActions({ item, token, busy, run, area }) {
  const [progress, setProgress] = useState(70);
  const [observation, setObservation] = useState(
    "Avance sintético registrado durante la demostración",
  );
  const [reference, setReference] = useState(
    area === "VICTIMAS" ? "F171-DEMO-2026-004" : "INF-DEMO-2026-004",
  );
  const action =
    area === "VICTIMAS" ? apiVictimsAction : apiInvestigationAction;
  return (
    <div className="executor-actions">
      {item.status === "ASIGNADA" && (
        <button
          disabled={busy}
          onClick={() =>
            run(
              item.id,
              () => action(token, item.id, "iniciar"),
              "Encargo iniciado",
            )
          }
        >
          Iniciar
        </button>
      )}
      {item.status === "EN_EJECUCION" && (
        <>
          <div className="inline-action">
            <input
              aria-label="Porcentaje de avance"
              type="number"
              min="1"
              max="99"
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
            />
            <input
              aria-label="Observación del avance"
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
            />
            <button
              disabled={busy}
              onClick={() =>
                run(
                  item.id,
                  () =>
                    action(token, item.id, "avance", {
                      progress: Number(progress),
                      observation,
                    }),
                  "Avance persistido en backend",
                )
              }
            >
              Guardar avance
            </button>
          </div>
          <div className="inline-action">
            <input
              aria-label={
                area === "VICTIMAS"
                  ? "Referencia del F-171"
                  : "Referencia del informe"
              }
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
            <button
              className="primary-demo"
              disabled={busy}
              onClick={() =>
                run(
                  item.id,
                  () =>
                    action(
                      token,
                      item.id,
                      area === "VICTIMAS" ? "finalizar" : "entregar",
                      area === "VICTIMAS"
                        ? { f171Reference: reference }
                        : { reference },
                    ),
                  area === "VICTIMAS"
                    ? "F-171 ficticio registrado; peritaje cerrado directamente"
                    : "Informe entregado; pendiente aprobación PAG",
                )
              }
            >
              {area === "VICTIMAS" ? "Finalizar con F-171" : "Entregar informe"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AssignmentExplanation({ assignment }) {
  const included =
    assignment.evaluated?.filter((candidate) => candidate.eligible) || [];
  const excluded =
    assignment.evaluated?.filter((candidate) => !candidate.eligible) || [];
  return (
    <details className="assignment-explanation">
      <summary>¿Por qué se seleccionó este responsable?</summary>
      <p>
        <strong>{assignment.selectedName || "Sin candidato"}</strong> ·{" "}
        {assignment.selectedReason}
      </p>
      <div className="assignment-meta">
        <span>Política {assignment.policyVersion}</span>
        <span>{assignment.strategy || "SEMILLA_DEMO"}</span>
      </div>
      {assignment.evaluated?.length > 0 && (
        <div className="candidate-columns">
          <div>
            <strong>Elegibles ({included.length})</strong>
            {included.map((candidate) => (
              <span key={candidate.candidateId}>
                {candidate.candidateName} · carga {candidate.metrics.load}
              </span>
            ))}
          </div>
          <div>
            <strong>Excluidos ({excluded.length})</strong>
            {excluded.map((candidate) => (
              <span key={candidate.candidateId}>
                {candidate.candidateName} · {candidate.exclusions.join(", ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </details>
  );
}

function trayForStatus(status) {
  if (status === "EN_EJECUCION") return "EN_EJECUCION";
  if (status === "INFORME_ENTREGADO") return "POR_REVISAR";
  if (status === "CERRADA") return "CERRADOS";
  return "PENDIENTES";
}

function processFor(area, status) {
  const steps =
    area === "INVESTIGACION"
      ? [
          "Solicitud",
          "Reparto",
          "Ejecución",
          "Entrega",
          "Revisión PAG",
          "Cierre",
        ]
      : [
          "Solicitud",
          "Aprobación previa",
          "Reparto",
          "Ejecución",
          "F-171",
          "Cierre",
        ];
  if (status === "CERRADA")
    return { steps, current: steps.length, complete: true };

  const currentByStatus =
    area === "INVESTIGACION"
      ? {
          RADICADA: 1,
          PENDIENTE_REASIGNACION: 1,
          ASIGNADA: 2,
          EN_EJECUCION: 2,
          INFORME_ENTREGADO: 4,
        }
      : {
          PENDIENTE_APROBACION_PAG: 1,
          APROBADA_REPARTO: 2,
          PENDIENTE_REASIGNACION: 2,
          ASIGNADA: 3,
          EN_EJECUCION: 3,
        };
  return { steps, current: currentByStatus[status] ?? 0, complete: false };
}

function nextActionFor(area, status) {
  if (status === "CERRADA") {
    return { action: "Proceso finalizado", role: "Consulta según permisos" };
  }
  if (area === "INVESTIGACION") {
    const actions = {
      RADICADA: {
        action: "Validar datos y ejecutar reparto automático",
        role: "Defensor/a solicitante",
      },
      PENDIENTE_REASIGNACION: {
        action: "Reintentar reparto con datos elegibles",
        role: "Defensor/a solicitante",
      },
      ASIGNADA: {
        action: "Iniciar misión",
        role: "Investigador/a asignado/a",
      },
      EN_EJECUCION: {
        action: "Registrar avance o entregar informe",
        role: "Investigador/a asignado/a",
      },
      INFORME_ENTREGADO: {
        action: "Aprobar, devolver o cerrar",
        role: "PAG Investigación",
      },
    };
    return (
      actions[status] || { action: "Consultar estado", role: "Rol autorizado" }
    );
  }
  const actions = {
    PENDIENTE_APROBACION_PAG: {
      action: "Aprobar y ejecutar reparto automático",
      role: "PAG / Supervisor Víctimas",
    },
    APROBADA_REPARTO: {
      action: "Ejecutar reparto automático",
      role: "Sistema",
    },
    PENDIENTE_REASIGNACION: {
      action: "Gestionar excepción por falta de candidato",
      role: "PAG / Supervisor Víctimas",
    },
    ASIGNADA: {
      action: "Iniciar servicio pericial",
      role: "Perito asignado/a",
    },
    EN_EJECUCION: {
      action: "Registrar avance o finalizar con F-171",
      role: "Perito asignado/a",
    },
  };
  return (
    actions[status] || { action: "Consultar estado", role: "Rol autorizado" }
  );
}

function canActOnItem(area, role, status) {
  if (area === "INVESTIGACION") {
    return (
      (role === "defensor" &&
        ["RADICADA", "PENDIENTE_REASIGNACION"].includes(status)) ||
      (role === "investigador" &&
        ["ASIGNADA", "EN_EJECUCION"].includes(status)) ||
      (role === "pag_investigacion" && status === "INFORME_ENTREGADO")
    );
  }
  return (
    (role === "pag_victimas" && status === "PENDIENTE_APROBACION_PAG") ||
    (role === "perito" && ["ASIGNADA", "EN_EJECUCION"].includes(status))
  );
}

function semaphoreFor(item) {
  if (item.status === "CERRADA") return { label: "Cerrado" };
  if (!item.dueDate) return { label: "Sin plazo asignado" };
  const today = new Date();
  const dueDate = new Date(`${item.dueDate}T23:59:59Z`);
  if (dueDate < today) return { label: "Vencido" };
  if (dueDate.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)) {
    return { label: "Vence hoy" };
  }
  return { label: "En plazo" };
}
