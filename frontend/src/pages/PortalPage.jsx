import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiCreateInvestigation,
  apiCreateVictims,
  apiDemoBootstrap,
  apiInvestigationAction,
  apiRegisterOperation,
  apiResetDemo,
  apiVictimsAction,
} from "../api";
import { useAuth } from "../context/AuthContext";

const STATUS_LABELS = {
  RADICADA: "Radicada",
  PENDIENTE_APROBACION_PAG: "Pendiente aprobación PAG",
  DEVUELTA: "Devuelta para corrección",
  APROBADA_REPARTO: "Aprobada para reparto",
  PENDIENTE_EXCEPCION: "Pendiente de excepción",
  PENDIENTE_REASIGNACION: "Pendiente de reasignación",
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
  EXECUTE_INVESTIGATION: "EJECUTAR_ITEM_INVESTIGACION",
  APPROVE_INVESTIGATION: "APROBAR_INFORME_INVESTIGACION",
  VIEW_PROBLEMS: "CONSULTAR_PROBLEMAS_INVESTIGACION",
  VIEW_EXCEPTIONS: "CONSULTAR_EXCEPCIONES_INVESTIGACION",
  VIEW_COVERAGE: "CONSULTAR_COBERTURA_INVESTIGACION",
  VIEW_INDICATORS: "CONSULTAR_INDICADORES_INVESTIGACION",
  CREATE_VICTIMS: "CREAR_SOLICITUD_VICTIMAS",
  APPROVE_VICTIMS: "AVALAR_SOLICITUD_VICTIMAS",
  CORRECT_VICTIMS: "CORREGIR_SOLICITUD_VICTIMAS",
  EXECUTE_VICTIMS: "EJECUTAR_ITEM_VICTIMAS",
  REPORT_PROBLEM: "REPORTAR_PROBLEMA",
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
              profile={profile}
              token={token}
              run={run}
              busy={Boolean(busy)}
            />
          )}
        {area === "VICTIMAS" &&
          profileHas(profile, CAPABILITIES.CREATE_VICTIMS, area) && (
            <VictimsForm
              catalogs={data.catalogs}
              profile={profile}
              token={token}
              run={run}
              busy={Boolean(busy)}
            />
          )}

        {area === "INVESTIGACION" && (
          <InvestigationRoleWorkspace
            profile={profile}
            requests={requests}
            area={area}
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

function InvestigationRoleWorkspace({ profile, requests }) {
  const items = requests.flatMap((request) =>
    request.items.map((item) => ({ ...item, requestId: request.id })),
  );
  if (profileHas(profile, CAPABILITIES.VIEW_EXCEPTIONS, "INVESTIGACION")) {
    const exceptions = items.filter(
      (item) => item.status === "PENDIENTE_EXCEPCION",
    );
    return (
      <section className="role-workspace">
        <div className="section-title">
          <div>
            <small>Alcance nacional</small>
            <h2>Cola de excepciones de Investigación</h2>
          </div>
          <span>{exceptions.length} ítem(s)</span>
        </div>
        <p>
          Consulta de cobertura, candidatos excluidos y causales. La gestión
          manual no está habilitada sin RACI vigente.
        </p>
        {exceptions.map((item) => (
          <article key={item.id}>
            <strong>
              {item.requestId} · {item.serviceLabel}
            </strong>
            <span>{item.regionLabel}</span>
            <small>{item.assignment?.selectedReason}</small>
          </article>
        ))}
      </section>
    );
  }
  if (profileHas(profile, CAPABILITIES.VIEW_PROBLEMS, "INVESTIGACION")) {
    const problems = items.flatMap((item) =>
      (item.operations || [])
        .filter((operation) => operation.type === "PROBLEMA")
        .map((operation) => ({ ...operation, itemId: item.id })),
    );
    const corrections = items.flatMap((item) =>
      (item.timeline || [])
        .filter((event) => /devuelt|correg/i.test(event.message))
        .map((event) => ({ ...event, itemId: item.id })),
    );
    return (
      <section className="role-workspace">
        <div className="section-title">
          <div>
            <small>
              Alcance regional · {profile?.region || "Regional asignada"}
            </small>
            <h2>Continuidad operativa de Investigación</h2>
          </div>
          <span>{requests.length} solicitud(es)</span>
        </div>
        <div className="role-workspace-columns">
          <article>
            <strong>Problemas reportados</strong>
            <span>{problems.length}</span>
            <small>Consulta de reportes recibidos por la regional.</small>
          </article>
          <article>
            <strong>Historial de correcciones</strong>
            <span>{corrections.length}</span>
            <small>
              Las radicaciones y sus eventos se conservan sin sobrescritura.
            </small>
          </article>
        </div>
        {problems.length > 0 && (
          <div className="role-problem-list">
            {problems.map((problem) => (
              <article key={problem.id}>
                <strong>
                  {problem.itemId} · {problem.reason}
                </strong>
                <span>{problem.description}</span>
                <small>
                  Soporte: {problem.supportReference} · Estado conservado:{" "}
                  {STATUS_LABELS[problem.primaryStatusSnapshot] ||
                    problem.primaryStatusSnapshot}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }
  if (profileHas(profile, CAPABILITIES.VIEW_INDICATORS, "INVESTIGACION")) {
    return (
      <section className="role-workspace">
        <div className="section-title">
          <div>
            <small>Alcance regional · solo lectura</small>
            <h2>Seguimiento territorial</h2>
          </div>
          <span>{requests.length} solicitud(es)</span>
        </div>
        <p>
          Consulta de estados, cargas, productos e indicadores disponibles. Esta
          cuenta no reparte, reasigna, corrige, aprueba ni cierra.
        </p>
      </section>
    );
  }
  return null;
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
                  <dd>Plazo parametrizable por servicio</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}

function InvestigationForm({ catalogs, profile, token, run, busy }) {
  const steps = [
    "Solicitante",
    "Proceso",
    "Necesidad",
    "Servicios",
    "Confirmación",
  ];
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState({
    identifierType: "SPOA",
    spoa: "110016000049202600099",
    processReference: "Proceso penal 2026-0099",
    delito: "Conducta asociada al proceso",
    proceduralStage: "INVESTIGACION",
    hearingApplies: true,
    hearingDate: "2026-10-15",
    facts: "Hechos relevantes informados por la defensa.",
    hypothesis: "Hipótesis de trabajo que orienta la verificación.",
    requiredWork: "Ubicar fuentes y verificar las circunstancias indicadas.",
    region: "BOGOTA",
    differentialApplies: true,
    differentialDetail: "Medidas de acceso y comunicación pertinentes.",
    priorityType: "ORDINARIA",
    priorityReason: "",
    prioritySupport: "",
  });
  const [persons, setPersons] = useState([
    { alias: "Persona relacionada A", relationship: "Procesado/a", notes: "" },
  ]);
  const [documents, setDocuments] = useState([
    { type: "SOLICITUD_DEFENSA", reference: "REF-SOL-2026-0099" },
  ]);
  const [services, setServices] = useState(["SVC_INV_VERIFICACION_TERRENO"]);
  const update = (key) => (event) =>
    setForm((current) => ({
      ...current,
      [key]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
  const toggleService = (serviceId) =>
    setServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  return (
    <section className="creation-panel wizard-panel">
      <div className="panel-copy">
        <small>
          Paso {step + 1} de {steps.length}
        </small>
        <h2>Radicar solicitud de investigación</h2>
        <p>
          Al radicar, el sistema intenta el reparto de cada servicio por
          separado.
        </p>
      </div>
      <WizardProgress steps={steps} current={step} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step < steps.length - 1) return setStep(step + 1);
          run(
            "create-inv",
            () =>
              apiCreateInvestigation(token, {
                identifierType: form.identifierType,
                spoa: form.spoa,
                processReference: form.processReference,
                delito: form.delito,
                proceduralStage: form.proceduralStage,
                hearingApplies: form.hearingApplies,
                hearingDate: form.hearingDate,
                facts: form.facts,
                hypothesis: form.hypothesis,
                requiredWork: form.requiredWork,
                differentialApproach: {
                  applies: form.differentialApplies,
                  detail: form.differentialDetail,
                },
                priority: {
                  type: form.priorityType,
                  reason: form.priorityReason,
                  support: form.prioritySupport,
                },
                persons,
                documents,
                items: services.map((service) => ({
                  service,
                  region: form.region,
                })),
              }),
            "Solicitud radicada; el reparto automático fue procesado por ítem",
          );
        }}
      >
        {step === 0 && (
          <>
            <ReadonlyRequester
              profile={profile}
              label="Defensor/a solicitante"
            />
            <PersonsEditor
              persons={persons}
              setPersons={setPersons}
              mode="investigation"
            />
          </>
        )}
        {step === 1 && (
          <div className="wizard-fields">
            <label>
              Tipo de identificador
              <select
                value={form.identifierType}
                onChange={update("identifierType")}
              >
                <option value="SPOA">SPOA</option>
                <option value="OTRO">Otro identificador</option>
              </select>
            </label>
            <label>
              SPOA u otro identificador
              <input
                aria-label="SPOA u otro identificador"
                value={form.spoa}
                onChange={update("spoa")}
              />
            </label>
            <label>
              Proceso o caso
              <input
                value={form.processReference}
                onChange={update("processReference")}
              />
            </label>
            <label>
              Delito o conducta
              <input value={form.delito} onChange={update("delito")} />
            </label>
            <label>
              Etapa procesal
              <select
                value={form.proceduralStage}
                onChange={update("proceduralStage")}
              >
                {catalogs.proceduralStages.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={form.hearingApplies}
                onChange={update("hearingApplies")}
              />
              Tiene audiencia programada
            </label>
            {form.hearingApplies && (
              <label>
                Fecha de audiencia
                <input
                  type="date"
                  value={form.hearingDate}
                  onChange={update("hearingDate")}
                />
              </label>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="wizard-fields full-width">
            <label>
              Hechos
              <textarea value={form.facts} onChange={update("facts")} />
            </label>
            <label>
              Hipótesis
              <textarea
                value={form.hypothesis}
                onChange={update("hypothesis")}
              />
            </label>
            <label>
              Labores requeridas
              <textarea
                value={form.requiredWork}
                onChange={update("requiredWork")}
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={form.differentialApplies}
                onChange={update("differentialApplies")}
              />
              Aplica enfoque diferencial
            </label>
            {form.differentialApplies && (
              <label>
                Enfoque diferencial
                <textarea
                  value={form.differentialDetail}
                  onChange={update("differentialDetail")}
                />
              </label>
            )}
            <label>
              Prioridad
              <select
                value={form.priorityType}
                onChange={update("priorityType")}
              >
                {catalogs.priorityTypes.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            {form.priorityType !== "ORDINARIA" && (
              <>
                <label>
                  Causal de prioridad
                  <input
                    value={form.priorityReason}
                    onChange={update("priorityReason")}
                  />
                </label>
                <label>
                  Soporte de prioridad
                  <input
                    value={form.prioritySupport}
                    onChange={update("prioritySupport")}
                  />
                </label>
              </>
            )}
          </div>
        )}
        {step === 3 && (
          <>
            <ServiceSelector
              title="Servicios requeridos"
              hint="Cada servicio genera un ítem con estado y reparto independientes."
              catalog={catalogs.investigationServices}
              selected={services}
              toggle={toggleService}
            />
            <label>
              Cobertura
              <select value={form.region} onChange={update("region")}>
                {catalogs.regions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <DocumentsEditor
              documents={documents}
              setDocuments={setDocuments}
              catalog={catalogs.investigationDocumentTypes}
            />
          </>
        )}
        {step === 4 && (
          <ReviewSummary
            form={form}
            profile={profile}
            persons={persons}
            documents={documents}
            serviceCount={services.length}
            area="INVESTIGACION"
          >
            <label className="check-field">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Confirmo que la información está completa para radicar
            </label>
          </ReviewSummary>
        )}
        <WizardNavigation
          step={step}
          last={steps.length - 1}
          setStep={setStep}
          busy={busy}
          disabled={
            !services.length || (step === steps.length - 1 && !confirmed)
          }
          finalLabel="Radicar solicitud"
        />
      </form>
    </section>
  );
}

function VictimsForm({ catalogs, profile, token, run, busy }) {
  const steps = ["RJV", "Proceso", "Personas", "Servicios", "Confirmación"];
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [form, setForm] = useState({
    externalId: "RAD-2026-0004",
    law: "LEY_1448",
    processReference: "Proceso de reparación 2026-0004",
    hearingApplies: true,
    hearingDate: "2026-10-20",
    facts: "Hechos relevantes para la valoración pericial solicitada.",
    region: "BOGOTA",
  });
  const [persons, setPersons] = useState([
    {
      alias: "Persona vinculada A",
      type: "DIRECTA",
      relationship: "Víctima directa",
      familyGroup: "Núcleo A",
      phone: "3000000001",
      email: "persona.a@example.invalid",
      preferredChannel: "Correo",
    },
    {
      alias: "Persona vinculada B",
      type: "INDIRECTA",
      relationship: "Familiar",
      familyGroup: "Núcleo A",
      phone: "3000000002",
      email: "persona.b@example.invalid",
      preferredChannel: "Teléfono",
    },
  ]);
  const [documents, setDocuments] = useState([
    { type: "FORMATO_SOLICITUD", reference: "REF-FORM-2026-0004" },
  ]);
  const [services, setServices] = useState(["SVC_VIC_EVALUACION_PSICOLOGICA"]);
  const update = (key) => (event) =>
    setForm((current) => ({
      ...current,
      [key]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
  const toggleService = (serviceId) =>
    setServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  return (
    <section className="creation-panel victims wizard-panel">
      <div className="panel-copy">
        <small>
          Paso {step + 1} de {steps.length}
        </small>
        <h2>Crear solicitud de servicio pericial</h2>
        <p>
          El envío conserva el aval previo; al aprobar, el sistema ejecuta el
          reparto.
        </p>
      </div>
      <WizardProgress steps={steps} current={step} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step < steps.length - 1) return setStep(step + 1);
          run(
            "create-vic",
            () =>
              apiCreateVictims(token, {
                externalId: form.externalId,
                law: form.law,
                caseData: {
                  processReference: form.processReference,
                  hearingApplies: form.hearingApplies,
                  hearingDate: form.hearingDate,
                  facts: form.facts,
                },
                persons: persons.map((person) => ({
                  alias: person.alias,
                  type: person.type,
                  relationship: person.relationship,
                  familyGroup: person.familyGroup,
                  contact: {
                    phone: person.phone,
                    email: person.email,
                    preferredChannel: person.preferredChannel,
                  },
                })),
                documents,
                items: services.map((service) => ({
                  service,
                  region: form.region,
                  law: form.law,
                })),
              }),
            "Solicitud de Víctimas enviada a aprobación previa",
          );
        }}
      >
        {step === 0 && (
          <ReadonlyRequester
            profile={profile}
            label="Representante judicial de víctimas"
          />
        )}
        {step === 1 && (
          <div className="wizard-fields full-width">
            <label>
              Identificador o radicado
              <input value={form.externalId} onChange={update("externalId")} />
            </label>
            <label>
              Ley o programa
              <select value={form.law} onChange={update("law")}>
                {catalogs.laws.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Proceso
              <input
                value={form.processReference}
                onChange={update("processReference")}
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={form.hearingApplies}
                onChange={update("hearingApplies")}
              />
              Tiene audiencia programada
            </label>
            {form.hearingApplies && (
              <label>
                Fecha de audiencia
                <input
                  type="date"
                  value={form.hearingDate}
                  onChange={update("hearingDate")}
                />
              </label>
            )}
            <label>
              Hechos
              <textarea value={form.facts} onChange={update("facts")} />
            </label>
          </div>
        )}
        {step === 2 && (
          <PersonsEditor
            persons={persons}
            setPersons={setPersons}
            mode="victims"
          />
        )}
        {step === 3 && (
          <>
            <ServiceSelector
              title="Servicios periciales requeridos"
              hint="Cada servicio conserva aprobación, reparto, estado y producto por ítem."
              catalog={catalogs.victimServices}
              selected={services}
              toggle={toggleService}
            />
            <label>
              Cobertura
              <select value={form.region} onChange={update("region")}>
                {catalogs.regions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <DocumentsEditor
              documents={documents}
              setDocuments={setDocuments}
              catalog={catalogs.victimDocumentTypes}
            />
          </>
        )}
        {step === 4 && (
          <ReviewSummary
            form={form}
            profile={profile}
            persons={persons}
            documents={documents}
            serviceCount={services.length}
            area="VICTIMAS"
          >
            <label className="check-field">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Confirmo el envío a aprobación previa
            </label>
          </ReviewSummary>
        )}
        <WizardNavigation
          step={step}
          last={steps.length - 1}
          setStep={setStep}
          busy={busy}
          disabled={
            !services.length || (step === steps.length - 1 && !confirmed)
          }
          finalLabel="Enviar a aprobación previa"
        />
      </form>
    </section>
  );
}

function WizardProgress({ steps, current }) {
  return (
    <ol className="wizard-progress" aria-label="Progreso de la radicación">
      {steps.map((label, index) => (
        <li
          key={label}
          className={
            index === current ? "active" : index < current ? "complete" : ""
          }
        >
          <span>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function WizardNavigation({ step, last, setStep, busy, disabled, finalLabel }) {
  return (
    <div className="wizard-navigation">
      {step > 0 && (
        <button type="button" onClick={() => setStep(step - 1)}>
          Anterior
        </button>
      )}
      <button className="primary-demo" disabled={busy || disabled}>
        {busy ? "Procesando..." : step === last ? finalLabel : "Siguiente"}
      </button>
    </div>
  );
}

function ReadonlyRequester({ profile, label }) {
  return (
    <fieldset className="readonly-requester">
      <legend>{label} identificado automáticamente</legend>
      <label>
        Nombre
        <input value={profile?.fullName || ""} readOnly />
      </label>
      <label>
        Rol
        <input value={profile?.roleLabel || profile?.role || ""} readOnly />
      </label>
      <label>
        Correo
        <input value={profile?.email || ""} readOnly />
      </label>
    </fieldset>
  );
}

function PersonsEditor({ persons, setPersons, mode }) {
  const updatePerson = (index, field, value) =>
    setPersons((current) =>
      current.map((person, position) =>
        position === index ? { ...person, [field]: value } : person,
      ),
    );
  const add = () =>
    setPersons((current) => [
      ...current,
      mode === "victims"
        ? {
            alias: "",
            type: "INDIRECTA",
            relationship: "",
            familyGroup: "",
            phone: "",
            email: "",
            preferredChannel: "Teléfono",
          }
        : { alias: "", relationship: "", notes: "" },
    ]);
  return (
    <fieldset className="persons-editor">
      <legend>
        {mode === "victims" ? "Personas vinculadas" : "Personas relacionadas"}
      </legend>
      {persons.map((person, index) => (
        <div className="person-row" key={`person-${index}`}>
          <label>
            Identificación de presentación
            <input
              aria-label={`Identificación persona ${index + 1}`}
              value={person.alias}
              onChange={(event) =>
                updatePerson(index, "alias", event.target.value)
              }
            />
          </label>
          {mode === "victims" && (
            <label>
              Tipo
              <select
                aria-label={`Tipo persona ${index + 1}`}
                value={person.type}
                onChange={(event) =>
                  updatePerson(index, "type", event.target.value)
                }
              >
                <option value="DIRECTA">Víctima directa</option>
                <option value="INDIRECTA">Víctima indirecta</option>
              </select>
            </label>
          )}
          <label>
            {mode === "victims"
              ? "Parentesco o relación"
              : "Relación con el caso"}
            <input
              value={person.relationship}
              onChange={(event) =>
                updatePerson(index, "relationship", event.target.value)
              }
            />
          </label>
          {mode === "victims" ? (
            <>
              <label>
                Núcleo familiar
                <input
                  value={person.familyGroup}
                  onChange={(event) =>
                    updatePerson(index, "familyGroup", event.target.value)
                  }
                />
              </label>
              <label>
                Teléfono
                <input
                  value={person.phone}
                  onChange={(event) =>
                    updatePerson(index, "phone", event.target.value)
                  }
                />
              </label>
              <label>
                Correo
                <input
                  type="email"
                  value={person.email}
                  onChange={(event) =>
                    updatePerson(index, "email", event.target.value)
                  }
                />
              </label>
              <label>
                Canal preferido
                <select
                  value={person.preferredChannel}
                  onChange={(event) =>
                    updatePerson(index, "preferredChannel", event.target.value)
                  }
                >
                  <option>Correo</option>
                  <option>Teléfono</option>
                </select>
              </label>
            </>
          ) : (
            <label>
              Observaciones
              <input
                value={person.notes}
                onChange={(event) =>
                  updatePerson(index, "notes", event.target.value)
                }
              />
            </label>
          )}
          {persons.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setPersons((current) =>
                  current.filter((_, position) => position !== index),
                )
              }
            >
              Quitar persona
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={add}>
        Agregar persona
      </button>
    </fieldset>
  );
}

function DocumentsEditor({ documents, setDocuments, catalog }) {
  const updateDocument = (index, field, value) =>
    setDocuments((current) =>
      current.map((document, position) =>
        position === index ? { ...document, [field]: value } : document,
      ),
    );
  return (
    <fieldset className="documents-editor">
      <legend>Documentos y formatos aplicables</legend>
      {documents.map((document, index) => (
        <div className="document-row" key={`document-${index}`}>
          <label>
            Tipo
            <select
              value={document.type}
              onChange={(event) =>
                updateDocument(index, "type", event.target.value)
              }
            >
              {catalog.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Referencia
            <input
              aria-label={`Referencia documental ${index + 1}`}
              value={document.reference}
              onChange={(event) =>
                updateDocument(index, "reference", event.target.value)
              }
            />
          </label>
          {documents.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setDocuments((current) =>
                  current.filter((_, position) => position !== index),
                )
              }
            >
              Quitar documento
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setDocuments((current) => [
            ...current,
            { type: catalog[0]?.id || "", reference: "" },
          ])
        }
      >
        Agregar documento
      </button>
    </fieldset>
  );
}

function ServiceSelector({ title, hint, catalog, selected, toggle }) {
  return (
    <fieldset className="service-selector">
      <legend>{title}</legend>
      <small>{hint}</small>
      <div>
        {catalog.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
            />
            {item.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReviewSummary({
  form,
  profile,
  persons,
  documents,
  serviceCount,
  area,
  children,
}) {
  return (
    <section className="review-summary">
      <h3>
        Resumen antes de {area === "INVESTIGACION" ? "radicar" : "enviar"}
      </h3>
      <dl>
        <div>
          <dt>Solicitante</dt>
          <dd>{profile?.fullName}</dd>
        </div>
        <div>
          <dt>Proceso</dt>
          <dd>{form.processReference}</dd>
        </div>
        <div>
          <dt>Personas</dt>
          <dd>{persons.length}</dd>
        </div>
        <div>
          <dt>Servicios</dt>
          <dd>{serviceCount}</dd>
        </div>
        <div>
          <dt>Documentos</dt>
          <dd>{documents.length}</dd>
        </div>
        <div>
          <dt>Cobertura</dt>
          <dd>{form.region}</dd>
        </div>
      </dl>
      {children}
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
        <div className="related-persons">
          <strong>{request.persons.length} persona(s) vinculada(s)</strong>
          {request.persons.map((person) => (
            <span key={person.alias}>
              {person.alias} ·{" "}
              {person.type
                ? person.type === "DIRECTA"
                  ? "Directa"
                  : "Indirecta"
                : person.relationship}
              {person.type && person.relationship
                ? ` · ${person.relationship}`
                : ""}
              {person.familyGroup ? ` · ${person.familyGroup}` : ""}
              {person.contact?.preferredChannel
                ? ` · Contacto por ${person.contact.preferredChannel.toLowerCase()}`
                : ""}
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
        {item.tracking?.configured && (
          <>
            <span>
              <small>Días restantes</small>
              <strong>{item.tracking.daysRemaining}</strong>
            </span>
            <span>
              <small>Semáforo</small>
              <strong>{item.tracking.semaphore}</strong>
            </span>
            <span>
              <small>Oportunidad</small>
              <strong>{item.tracking.opportunity}</strong>
            </span>
          </>
        )}
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
        {profileHas(profile, CAPABILITIES.REPORT_PROBLEM, area) &&
          ["ASIGNADA", "EN_EJECUCION"].includes(item.status) && (
            <ProblemReportAction
              item={item}
              area={area}
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
      {(item.operations || []).some(
        (operation) => operation.type === "PROBLEMA",
      ) && (
        <details className="reported-problems">
          <summary>
            Problemas reportados ·{" "}
            {
              item.operations.filter(
                (operation) => operation.type === "PROBLEMA",
              ).length
            }
          </summary>
          <ul>
            {item.operations
              .filter((operation) => operation.type === "PROBLEMA")
              .map((operation) => (
                <li key={operation.id}>
                  <strong>{operation.reason}</strong>
                  <span>{operation.description}</span>
                  <small>Soporte: {operation.supportReference}</small>
                </li>
              ))}
          </ul>
        </details>
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
              "Aprobación registrada; el reparto automático fue procesado",
            )
          }
        >
          Aprobar solicitud
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
    : "El reparto automático se ejecutará al cumplirse el hito aplicable.";
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
          {item.tracking?.configured && (
            <>
              <div>
                <dt>Días restantes</dt>
                <dd>{item.tracking.daysRemaining}</dd>
              </div>
              <div>
                <dt>Semáforo</dt>
                <dd>{item.tracking.semaphore}</dd>
              </div>
              <div>
                <dt>Oportunidad</dt>
                <dd>{item.tracking.opportunity}</dd>
              </div>
            </>
          )}
          <div>
            <dt>Especialidad o disciplina elegible</dt>
            <dd>{item.specialtyLabels?.join(", ") || "Sin dato"}</dd>
          </div>
          {request.area === "VICTIMAS" && item.submissionVersion && (
            <div>
              <dt>Versión sometida por este ítem</dt>
              <dd>{item.submissionVersion}</dd>
            </div>
          )}
          {request.area === "VICTIMAS" && item.approvedSubmissionVersion && (
            <div>
              <dt>Versión aprobada y usada</dt>
              <dd>{item.approvedSubmissionVersion}</dd>
            </div>
          )}
        </dl>

        {item.tracking?.configured && (
          <p className="validation-pending">{item.tracking.label}</p>
        )}

        <section className="detail-section">
          <h3>Explicación resumida de asignación</h3>
          <p>{assignmentSummary}</p>
        </section>

        <section className="detail-section">
          <h3>Productos y versiones</h3>
          {item.documents?.length ? (
            <ul className="document-list">
              {item.documents.map((document) => (
                <li key={document.id}>
                  <strong>{document.type}</strong>
                  <span>
                    {document.reference} · Versión {document.version} ·{" "}
                    {document.status}
                  </span>
                  <small>
                    Autor: {document.author || "No disponible"}
                    {document.createdAt
                      ? ` · ${new Date(document.createdAt).toLocaleString("es-CO")}`
                      : ""}
                  </small>
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
                      {(version.reviews || [])
                        .map(
                          (review) =>
                            ` · Ítem ${review.itemId}: ${review.decision}${review.observation ? ` (${review.observation})` : ""}`,
                        )
                        .join("")}
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

function ProblemReportAction({ item, token, busy, run, area }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [supportReference, setSupportReference] = useState("");
  const complete =
    reason.trim() && description.trim() && supportReference.trim();
  return (
    <details className="problem-report">
      <summary>Reportar problema</summary>
      <div className="review-actions">
        <label>
          Causal
          <input
            aria-label="Causal del problema"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <label>
          Descripción
          <textarea
            aria-label="Descripción del problema"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          Soporte o referencia
          <input
            aria-label="Soporte o referencia del problema"
            value={supportReference}
            onChange={(event) => setSupportReference(event.target.value)}
          />
        </label>
        <button
          className="primary-demo"
          disabled={busy || !complete}
          onClick={() =>
            run(
              item.id,
              () =>
                apiRegisterOperation(token, area, item.id, "PROBLEMA", {
                  reason,
                  description,
                  supportReference,
                }),
              "Problema registrado sin alterar el estado del ítem",
            )
          }
        >
          Enviar reporte
        </button>
      </div>
    </details>
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
          PENDIENTE_EXCEPCION: 1,
          PENDIENTE_REASIGNACION: 1,
          ASIGNADA: 2,
          EN_EJECUCION: 2,
          INFORME_ENTREGADO: 4,
        }
      : {
          DEVUELTA: 0,
          PENDIENTE_APROBACION_PAG: 1,
          APROBADA_REPARTO: 2,
          PENDIENTE_EXCEPCION: 2,
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
        action: "Procesar reparto automático",
        role: "Sistema",
      },
      PENDIENTE_EXCEPCION: {
        action: "Consultar la excepción registrada",
        role: "Gestión central de excepciones",
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
      action: "Aprobar solicitud; el sistema repartirá automáticamente",
      role: "PAG / Supervisor Víctimas",
    },
    APROBADA_REPARTO: {
      action: "Ejecutar reparto automático",
      role: "Sistema",
    },
    PENDIENTE_EXCEPCION: {
      action: "Consultar la excepción por falta de candidato",
      role: "Autoridad operativa pendiente de RACI",
    },
    PENDIENTE_REASIGNACION: {
      action: "Consultar la reasignación pendiente",
      role: "Autoridad operativa pendiente de RACI",
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
