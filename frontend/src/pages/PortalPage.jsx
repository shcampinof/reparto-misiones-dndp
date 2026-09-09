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
  DEVUELTA: "Devuelta para corrección",
  APROBADA_REPARTO: "Aprobada para reparto",
  PENDIENTE_REASIGNACION: "Sin candidato / pendiente",
  ASIGNADA: "Asignada",
  EN_EJECUCION: "En ejecución",
  INFORME_ENTREGADO: "Informe entregado",
  CERRADA: "Cerrada",
  EN_TRAMITE: "En trámite",
  PARCIALMENTE_CERRADA: "Parcialmente cerrada",
  SIN_ITEMS: "Sin ítems",
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

const CAPABILITIES = {
  RESET: "RESTABLECER_PRESENTACION",
  CREATE_INVESTIGATION: "CREAR_SOLICITUD_INVESTIGACION",
  ASSIGN_INVESTIGATION: "EJECUTAR_REPARTO_INVESTIGACION",
  EXECUTE_INVESTIGATION: "EJECUTAR_ITEM_INVESTIGACION",
  APPROVE_INVESTIGATION: "APROBAR_INFORME_INVESTIGACION",
  CREATE_VICTIMS: "CREAR_SOLICITUD_VICTIMAS",
  APPROVE_VICTIMS: "AVALAR_SOLICITUD_VICTIMAS",
  CORRECT_VICTIMS: "CORREGIR_SOLICITUD_VICTIMAS",
  EXECUTE_VICTIMS: "EJECUTAR_ITEM_VICTIMAS",
};

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
    return <div className="screen-loader">Cargando el sistema...</div>;
  if (!data)
    return (
      <div className="screen-loader">
        {error || "No fue posible iniciar el sistema"}
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
    requestCount: 0,
    pendingItemCount: 0,
    activeItemCount: 0,
    closedItemCount: 0,
  };
  const canUseArea = (target) => data.allowedAreas.includes(target);

  return (
    <div
      className="demo-portal"
      style={{ "--area-accent": AREA_META[area].accent }}
    >
      <header className="demo-header">
        <div className="demo-brand">
          <div>
            <strong>Defensoría del Pueblo</strong>
            <span>SIGIP-DP</span>
            <small>
              Gestión investigativa y pericial de la Defensoría del Pueblo
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
            <strong>{profile?.fullName || "Usuario"}</strong>
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
          {profileHas(profile, CAPABILITIES.RESET, area) && (
            <button
              className="reset-demo"
              disabled={Boolean(busy)}
              onClick={() => {
                if (
                  window.confirm(
                    "¿Restablecer la información inicial? Se descartarán los cambios realizados en esta sesión.",
                  )
                ) {
                  run(
                    "reset",
                    () => apiResetDemo(token),
                    "Información inicial restablecida correctamente",
                  );
                }
              }}
            >
              Restablecer información inicial
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
          <Kpi
            label="Solicitudes visibles"
            value={dashboard.requestCount}
            tone="blue"
          />
          <Kpi
            label="Ítems pendientes"
            value={dashboard.pendingItemCount}
            tone="amber"
          />
          <Kpi
            label="Ítems en gestión"
            value={dashboard.activeItemCount}
            tone="purple"
          />
          <Kpi
            label="Ítems cerrados"
            value={dashboard.closedItemCount}
            tone="green"
          />
        </section>

        {area === "INVESTIGACION" &&
          profileHas(profile, CAPABILITIES.CREATE_INVESTIGATION, area) && (
            <InvestigationForm
              catalogs={data.catalogs}
              token={token}
              run={run}
              busy={Boolean(busy)}
            />
          )}
        {area === "VICTIMAS" &&
          profileHas(profile, CAPABILITIES.CREATE_VICTIMS, area) && (
            <VictimsForm
              catalogs={data.catalogs}
              token={token}
              run={run}
              busy={Boolean(busy)}
            />
          )}

        <ServiceCatalog
          area={area}
          services={data.serviceCatalog?.services || []}
          specialties={data.serviceCatalog?.specialties || []}
        />

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
          SIGIP-DP — Gestión investigativa y pericial de la Defensoría del
          Pueblo
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

function ServiceCatalog({ area, services, specialties }) {
  const areaServices = services.filter((service) => service.area === area);
  const specialtyNames = new Map(
    specialties.map((specialty) => [specialty.id, specialty.name]),
  );
  return (
    <section className="service-catalog">
      <div className="section-title">
        <div>
          <small>Catálogo publicado y vigente</small>
          <h2>Servicios disponibles</h2>
        </div>
        <span>{areaServices.length} servicio(s)</span>
      </div>
      <details>
        <summary>Consultar alcance, requisitos y producto</summary>
        <div className="service-catalog-grid">
          {areaServices.map((service) => (
            <article key={service.id}>
              <header>
                <div>
                  <small>
                    Versión {service.version} · vigente desde{" "}
                    {service.validFrom}
                  </small>
                  <h3>{service.name}</h3>
                </div>
                <span>{service.status}</span>
              </header>
              <p>{service.description}</p>
              <dl>
                <div>
                  <dt>Especialidad o disciplina</dt>
                  <dd>
                    {service.specialtyIds
                      .map((id) => specialtyNames.get(id) || id)
                      .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>Alcance</dt>
                  <dd>{service.scope.join("; ")}</dd>
                </div>
                {service.activities?.length > 0 && (
                  <div>
                    <dt>Servicios o actividades incluidas</dt>
                    <dd>{service.activities.join("; ")}</dd>
                  </div>
                )}
                <div>
                  <dt>Exclusiones</dt>
                  <dd>{service.exclusions.join("; ")}</dd>
                </div>
                <div>
                  <dt>Requisitos</dt>
                  <dd>{service.requirements.join("; ")}</dd>
                </div>
                <div>
                  <dt>Producto esperado</dt>
                  <dd>{service.product}</dd>
                </div>
                <div>
                  <dt>Cobertura</dt>
                  <dd>{service.coverage.label}</dd>
                </div>
                <div>
                  <dt>Plazo</dt>
                  <dd>{service.termPolicy.label}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}

function InvestigationForm({ catalogs, token, run, busy }) {
  const [form, setForm] = useState({
    spoa: "110016000049202600099",
    delito: "Investigación de hechos asociados al caso",
    region: "BOGOTA",
  });
  const [services, setServices] = useState(["SVC_INV_VERIFICACION_TERRENO"]);
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggleService = (serviceId) =>
    setServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  return (
    <section className="creation-panel">
      <div className="panel-copy">
        <small>Paso 1</small>
        <h2>Radicar solicitud de investigación</h2>
        <p>
          La asignación del responsable se realiza automáticamente según los
          criterios aplicables.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(
            "create-inv",
            () =>
              apiCreateInvestigation(token, {
                ...form,
                items: services.map((service) => ({
                  service,
                  region: form.region,
                })),
              }),
            "Solicitud de Investigación radicada",
          );
        }}
      >
        <label>
          Número SPOA
          <input value={form.spoa} onChange={update("spoa")} maxLength="21" />
        </label>
        <label>
          Delito
          <input value={form.delito} onChange={update("delito")} />
        </label>
        <fieldset className="service-selector">
          <legend>Servicios requeridos</legend>
          <small>Cada servicio genera un ítem con reparto independiente.</small>
          <div>
            {catalogs.investigationServices.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={services.includes(item.id)}
                  onChange={() => toggleService(item.id)}
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
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
        <button className="primary-demo" disabled={busy || !services.length}>
          {busy ? "Procesando..." : "Radicar solicitud"}
        </button>
      </form>
    </section>
  );
}

function VictimsForm({ catalogs, token, run, busy }) {
  const [form, setForm] = useState({
    externalId: "RAD-2026-0004",
    law: "LEY_1448",
    region: "BOGOTA",
    victimCount: 2,
  });
  const [services, setServices] = useState(["SVC_VIC_EVALUACION_PSICOLOGICA"]);
  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggleService = (serviceId) =>
    setServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  return (
    <section className="creation-panel victims">
      <div className="panel-copy">
        <small>Paso 1</small>
        <h2>Crear solicitud de servicio pericial</h2>
        <p>
          Registre el contexto del servicio para remitirlo a la aprobación
          previa correspondiente.
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
                items: services.map((service) => ({
                  service,
                  region: form.region,
                  law: form.law,
                })),
              }),
            "Solicitud de Víctimas enviada a aprobación PAG",
          );
        }}
      >
        <label>
          Número de radicado
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
        <fieldset className="service-selector">
          <legend>Servicios periciales requeridos</legend>
          <small>Cada servicio conserva aprobación y reparto por ítem.</small>
          <div>
            {catalogs.victimServices.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={services.includes(item.id)}
                  onChange={() => toggleService(item.id)}
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
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
          Número de víctimas
          <input
            type="number"
            min="1"
            value={form.victimCount}
            onChange={update("victimCount")}
          />
        </label>
        <button className="primary-demo" disabled={busy || !services.length}>
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
      <p className="request-summary">{request.summary || "Caso registrado"}</p>
      <p className="request-aggregate-status">
        <strong>Estado agregado de la solicitud:</strong>{" "}
        {STATUS_LABELS[request.aggregateStatus] || request.aggregateStatus}
        {` · ${request.aggregateCounts.closedItems}/${request.aggregateCounts.totalItems} ítems cerrados`}
      </p>
      {request.persons?.length > 0 && (
        <div className="synthetic-persons">
          <strong>{request.persons.length} persona(s) vinculada(s)</strong>
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
  const isBusy = busy === item.id;
  const actionAvailable = canActOnItem(area, profile, item.status);
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
          <small>Estado del trámite</small>
          <strong>{STATUS_LABELS[item.status] || item.status}</strong>
        </span>
        <span>
          <small>Carga al repartir</small>
          <strong>
            {selectedCandidate ? selectedCandidate.metrics.load : "No aplica"}
          </strong>
        </span>
        <span>
          <small>Días restantes</small>
          <strong>{item.tracking?.daysRemaining ?? "No calculable"}</strong>
        </span>
        <span>
          <small>Semáforo</small>
          <strong>{item.tracking?.semaphore || "No calculable"}</strong>
        </span>
        <span>
          <small>Oportunidad</small>
          <strong>{item.tracking?.opportunity || "No calculable"}</strong>
        </span>
        <span>
          <small>Actuaciones</small>
          <strong>{item.activities?.length || 0}</strong>
        </span>
        <span>
          <small>Producto</small>
          <strong>{item.reportReference || "Sin entrega"}</strong>
        </span>
      </div>
      <div className="demo-actions">
        {area === "INVESTIGACION" &&
          profileHas(profile, CAPABILITIES.ASSIGN_INVESTIGATION, area) &&
          ["RADICADA", "PENDIENTE_REASIGNACION"].includes(item.status) && (
            <button
              disabled={isBusy}
              onClick={() =>
                run(
                  item.id,
                  () => apiAssignInvestigation(token, item.id),
                  "Asignación automática de Investigación completada",
                )
              }
            >
              Validar y ejecutar reparto
            </button>
          )}
        {area === "INVESTIGACION" &&
          profileHas(profile, CAPABILITIES.APPROVE_INVESTIGATION, area) &&
          item.status === "INFORME_ENTREGADO" && (
            <ReviewActions item={item} token={token} busy={isBusy} run={run} />
          )}
        {area === "VICTIMAS" &&
          profileHas(profile, CAPABILITIES.APPROVE_VICTIMS, area) &&
          item.status === "PENDIENTE_APROBACION_PAG" && (
            <VictimsApprovalActions
              item={item}
              token={token}
              busy={isBusy}
              run={run}
            />
          )}
        {area === "VICTIMAS" &&
          profileHas(profile, CAPABILITIES.CORRECT_VICTIMS, area) &&
          item.status === "DEVUELTA" && (
            <VictimsCorrectionAction
              item={item}
              token={token}
              busy={isBusy}
              run={run}
            />
          )}
        {area === "INVESTIGACION" &&
          profileHas(profile, CAPABILITIES.EXECUTE_INVESTIGATION, area) && (
            <ExecutorActions
              item={item}
              token={token}
              busy={isBusy}
              run={run}
              area="INVESTIGACION"
            />
          )}
        {area === "VICTIMAS" &&
          profileHas(profile, CAPABILITIES.EXECUTE_VICTIMS, area) && (
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

function VictimsApprovalActions({ item, token, busy, run }) {
  const [observation, setObservation] = useState("");
  return (
    <div className="review-actions">
      <label>
        Observación para devolución
        <input
          value={observation}
          onChange={(event) => setObservation(event.target.value)}
          placeholder="Indique la corrección requerida"
        />
      </label>
      <div>
        <button
          disabled={busy || !observation.trim()}
          onClick={() =>
            run(
              item.id,
              () =>
                apiVictimsAction(token, item.id, "devolver-solicitud", {
                  observation,
                }),
              "Solicitud devuelta al RJV para corrección",
            )
          }
        >
          Devolver solicitud
        </button>
        <button
          className="primary-demo"
          disabled={busy}
          onClick={() =>
            run(
              item.id,
              () => apiVictimsAction(token, item.id, "aprobar-y-repartir"),
              "Aprobación previa y asignación automática completadas",
            )
          }
        >
          Aprobar y repartir
        </button>
      </div>
    </div>
  );
}

function VictimsCorrectionAction({ item, token, busy, run }) {
  const [correctionSummary, setCorrectionSummary] = useState("");
  return (
    <div className="review-actions correction-actions">
      <label>
        Corrección realizada
        <input
          value={correctionSummary}
          onChange={(event) => setCorrectionSummary(event.target.value)}
          placeholder="Describa el ajuste antes de reenviar"
        />
      </label>
      <div>
        <button
          className="primary-demo"
          disabled={busy || !correctionSummary.trim()}
          onClick={() =>
            run(
              item.id,
              () =>
                apiVictimsAction(token, item.id, "corregir-reenviar", {
                  correctionSummary,
                }),
              "Solicitud corregida y reenviada al PAG",
            )
          }
        >
          Corregir y reenviar
        </button>
      </div>
    </div>
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
            <dt>Estado del trámite</dt>
            <dd>{STATUS_LABELS[item.status] || item.status}</dd>
          </div>
          <div>
            <dt>Días restantes</dt>
            <dd>{item.tracking?.daysRemaining ?? "No calculable"}</dd>
          </div>
          <div>
            <dt>Semáforo</dt>
            <dd>{item.tracking?.semaphore || "No calculable"}</dd>
          </div>
          <div>
            <dt>Oportunidad</dt>
            <dd>{item.tracking?.opportunity || "No calculable"}</dd>
          </div>
          <div>
            <dt>Especialidad o disciplina elegible</dt>
            <dd>{item.specialtyLabels?.join(", ") || "Sin dato"}</dd>
          </div>
        </dl>

        <p className="validation-pending">
          {item.tracking?.label ||
            "Plazo y calendario pendientes de validación funcional."}
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

        {request.versions?.length > 0 && (
          <section className="detail-section">
            <h3>Versiones de la solicitud</h3>
            <ol className="detail-timeline">
              {request.versions
                .slice()
                .reverse()
                .map((version) => (
                  <li key={version.version}>
                    <strong>Versión {version.version}</strong>
                    <small>
                      {new Date(version.submittedAt).toLocaleString("es-CO")}
                    </small>
                    <p>
                      {version.correctionSummary || "Radicación inicial"}
                      {version.review?.observation
                        ? ` · Devuelta: ${version.review.observation}`
                        : ""}
                    </p>
                  </li>
                ))}
            </ol>
          </section>
        )}

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
  const [observation, setObservation] = useState(
    "Actuación técnica registrada",
  );
  const [reference, setReference] = useState(
    area === "VICTIMAS" ? "F171-2026-0004" : "INF-2026-0004",
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
              aria-label="Descripción de la actuación"
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
                      observation,
                    }),
                  "Actuación registrada correctamente",
                )
              }
            >
              Registrar actuación
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
                    ? "F-171 registrado; servicio pericial cerrado"
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
          DEVUELTA: 0,
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
        action: "Registrar actuación o entregar informe",
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
    DEVUELTA: {
      action: "Corregir y reenviar la solicitud",
      role: "Representante judicial de víctimas",
    },
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
      action: "Registrar actuación o finalizar con F-171",
      role: "Perito asignado/a",
    },
  };
  return (
    actions[status] || { action: "Consultar estado", role: "Rol autorizado" }
  );
}

function canActOnItem(area, profile, status) {
  if (area === "INVESTIGACION") {
    return (
      (profileHas(profile, CAPABILITIES.ASSIGN_INVESTIGATION, area) &&
        ["RADICADA", "PENDIENTE_REASIGNACION"].includes(status)) ||
      (profileHas(profile, CAPABILITIES.EXECUTE_INVESTIGATION, area) &&
        ["ASIGNADA", "EN_EJECUCION"].includes(status)) ||
      (profileHas(profile, CAPABILITIES.APPROVE_INVESTIGATION, area) &&
        status === "INFORME_ENTREGADO")
    );
  }
  return (
    (profileHas(profile, CAPABILITIES.CORRECT_VICTIMS, area) &&
      status === "DEVUELTA") ||
    (profileHas(profile, CAPABILITIES.APPROVE_VICTIMS, area) &&
      status === "PENDIENTE_APROBACION_PAG") ||
    (profileHas(profile, CAPABILITIES.EXECUTE_VICTIMS, area) &&
      ["ASIGNADA", "EN_EJECUCION"].includes(status))
  );
}

function profileHas(profile, capability, area) {
  const now = new Date().toISOString();
  return (profile?.grants || []).some(
    (grant) =>
      grant.capability === capability &&
      (!grant.validFrom || grant.validFrom <= now) &&
      (!grant.validTo || now < grant.validTo) &&
      (grant.scopeType === "SYSTEM" || !grant.area || grant.area === area),
  );
}
