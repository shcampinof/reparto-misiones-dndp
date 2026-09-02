import { useCallback, useEffect, useState } from "react";
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
    accent: "#174b8a",
  },
  VICTIMAS: {
    label: "Víctimas",
    subtitle: "Asignación de actividades periciales",
    accent: "#7b2f6f",
  },
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

  async function run(key, action, successMessage) {
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
          <span className="institutional-seal small">DP</span>
          <div>
            <strong>SIGIP-DP</strong>
            <small>
              Sistema de Información para la Gestión Investigativa y Pericial
            </small>
          </div>
        </div>
        <div className="demo-profile">
          <span>{profile?.initials || "DE"}</span>
          <div>
            <strong>{profile?.fullName || "Usuario demo"}</strong>
            <small>{profile?.roleLabel || profile?.role}</small>
          </div>
          <button onClick={logout}>Cambiar rol</button>
        </div>
      </header>

      <nav className="portal-area-switch" aria-label="Selector de área">
        {Object.entries(AREA_META).map(([id, meta]) => (
          <button
            key={id}
            className={area === id ? "active" : ""}
            disabled={!canUseArea(id)}
            onClick={() => setArea(id)}
          >
            <span>{id === "INVESTIGACION" ? "01" : "02"}</span>
            <div>
              <strong>{meta.label}</strong>
              <small>
                {canUseArea(id) ? meta.subtitle : "No habilitada para este rol"}
              </small>
            </div>
          </button>
        ))}
      </nav>

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
              onClick={() =>
                run(
                  "reset",
                  () => apiResetDemo(token),
                  "Datos sintéticos restablecidos",
                )
              }
            >
              Restablecer datos de demostración
            </button>
          )}
        </section>

        {(message || error) && (
          <div className={error ? "notice error" : "notice success"}>
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
          <InvestigationForm catalogs={data.catalogs} token={token} run={run} />
        )}
        {area === "VICTIMAS" && profile?.role === "rjv" && (
          <VictimsForm catalogs={data.catalogs} token={token} run={run} />
        )}

        <section className="request-section">
          <div className="section-title">
            <div>
              <small>Bandeja del rol</small>
              <h2>Solicitudes y encargos</h2>
            </div>
            <span>{requests.length} registro(s) visibles</span>
          </div>
          {requests.length === 0 ? (
            <div className="presentable-empty">
              <strong>Sin registros para este rol</strong>
              <p>
                Cambie a un rol del guion o cree una solicitud sintética para
                continuar.
              </p>
            </div>
          ) : (
            <div className="request-grid">
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  profile={profile}
                  token={token}
                  busy={busy}
                  run={run}
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

function InvestigationForm({ catalogs, token, run }) {
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
        <button className="primary-demo">Radicar solicitud</button>
      </form>
    </section>
  );
}

function VictimsForm({ catalogs, token, run }) {
  const [form, setForm] = useState({
    externalId: "RAD-DEMO-2026-002",
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
        <button className="primary-demo">Enviar a aprobación previa</button>
      </form>
    </section>
  );
}

function RequestCard({ request, profile, token, busy, run }) {
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
        />
      ))}
    </article>
  );
}

function ItemCard({ item, area, profile, token, busy, run }) {
  const role = profile?.role;
  const isBusy = busy === item.id;
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
              Ejecutar reparto automático
            </button>
          )}
        {area === "INVESTIGACION" &&
          role === "pag_investigacion" &&
          item.status === "INFORME_ENTREGADO" && (
            <button
              disabled={isBusy}
              onClick={() =>
                run(
                  item.id,
                  () =>
                    apiInvestigationAction(token, item.id, "aprobar-entrega"),
                  "Entrega aprobada y misión cerrada",
                )
              }
            >
              Aprobar entrega y cerrar
            </button>
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
      </div>

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

function ExecutorActions({ item, token, busy, run, area }) {
  const [progress, setProgress] = useState(70);
  const [observation, setObservation] = useState(
    "Avance sintético registrado durante la demostración",
  );
  const [reference, setReference] = useState(
    area === "VICTIMAS" ? "F171-DEMO-2026-002" : "INF-DEMO-2026-002",
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
              type="number"
              min="1"
              max="99"
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
            />
            <input
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
    <details className="assignment-explanation" open>
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
