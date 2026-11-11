import { MaintenancePanel } from "../components/MaintenancePanel.jsx";
import { DraftPanel } from "../components/DraftPanel.jsx";
import { useServerDraft } from "../components/use-server-draft.js";
import { WorkspaceDocuments } from "../components/WorkspaceDocuments.jsx";
import {
  FilePolicyContext,
  useFilePolicy,
  megabytes,
} from "../components/file-policy.js";
import { RequestFilters } from "../components/RequestFilters.jsx";
import { matchesRequestFilters } from "../components/request-filters.js";
import { VictimsFollowUp } from "../components/VictimsFollowUp.jsx";
import { IntakeDocumentLink } from "../components/IntakeDocumentLink.jsx";
import {
  InvestigationOperations,
  InvestigationControl,
  ExportInvestigation,
  NotificationTray,
} from "../components/InvestigationAdjustments.jsx";
import {
  VictimsCaseFields,
  VictimsPersonFields,
  F171Guidance,
  VictimsFormatSummary,
} from "../components/VictimsFormatFields.jsx";
import {
  victimsCaseForm,
  victimsPersonForm,
} from "../components/victims-form-values.js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiCreateInvestigation,
  apiCreateVictims,
  apiDemoBootstrap,
  apiInvestigationAction,
  apiDownloadProduct,
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
  APROBADO_PENDIENTE_ENVIO: "Aprobado · pendiente envío al defensor",
  PENDIENTE_ENRUTAMIENTO: "Pendiente de recepción y reparto",
  CERRADA: "Cerrada",
  IMPROCEDENTE: "Improcedente",
  FINALIZADA_CON_IMPROCEDENCIA: "Finalizada con improcedencia",
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
  DECLARE_IMPROCEDENCE: "DECLARAR_IMPROCEDENCIA_VICTIMAS",
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
  const [filters, setFilters] = useState({});
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
    setFilters({});
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

  async function run(key, action, successMessage, onCommitted) {
    if (busy) return;
    setBusy(key);
    setMessage("");
    setError("");
    try {
      const result = await action();
      onCommitted?.(result);
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
        (item) =>
          trayForStatus(item.status) === activeTray &&
          matchesRequestFilters(request, item, filters),
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
    <FilePolicyContext.Provider value={data.filePolicy}>
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
            <NotificationTray
              notifications={data.notifications || []}
              token={token}
              onChanged={reload}
            />
          </div>
        </header>

        <main className="demo-content">
          <section className="area-heading">
            <div>
              <small>Área activa</small>
              <h1>{AREA_META[area].label}</h1>
              <p>{AREA_META[area].subtitle}</p>
            </div>
            {data.storage?.resettable !== false &&
              profileHas(profile, CAPABILITIES.RESET, area) && (
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

          {area === "INVESTIGACION" && data.supervision && (
            <InvestigationSupervision
              supervision={data.supervision}
              token={token}
            />
          )}

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

          {profileHas(profile, "ADMINISTRAR_PLATAFORMA", area) && (
            <MaintenancePanel token={token} />
          )}
          <ServiceCatalog
            area={area}
            services={data.serviceCatalog?.services || []}
            specialties={data.serviceCatalog?.specialties || []}
          />

          {area === "INVESTIGACION" &&
            profileHas(profile, "EXPORTAR_INVESTIGACION", area) && (
              <InvestigationControl
                requests={requests}
                token={token}
                catalogs={data.catalogs}
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
            <RequestFilters
              statusLabels={STATUS_LABELS}
              requests={requests}
              filters={filters}
              setFilters={setFilters}
            />
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
                    catalogs={data.catalogs}
                    onOpenDetail={(itemId, opener) =>
                      openDetail(request.id, itemId, opener)
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <footer className="demo-disclaimer">
            SIGIP-DP. Gestión investigativa y pericial de la Defensoría del
            Pueblo
          </footer>
        </main>
        {detailRecord && (
          <CaseDetail
            token={token}
            request={detailRecord.request}
            item={detailRecord.item}
            profile={profile}
            catalogs={data.catalogs}
            onClose={closeDetail}
          />
        )}
      </div>
    </FilePolicyContext.Provider>
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
    const exceptions = items.filter((item) =>
      ["PENDIENTE_EXCEPCION", "PENDIENTE_ENRUTAMIENTO"].includes(item.status),
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
            {item.referral && (
              <small>
                Derivada de {item.originItemId}:{" "}
                {item.referral.pendingActivities}. Consulte la acción en su
                tarjeta de la bandeja.
              </small>
            )}
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
            <strong>Solicitudes de ampliación de términos</strong>
            <span>
              {
                items
                  .flatMap((item) => item.termExtensions || [])
                  .filter((entry) => entry.status === "SOLICITADA").length
              }
            </span>
            <small>
              Revise las tarjetas de En ejecución. Decidir requiere política
              aprobada.
            </small>
          </article>
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
  if (
    profileHas(profile, CAPABILITIES.VIEW_INDICATORS, "INVESTIGACION") &&
    !profileHas(profile, CAPABILITIES.APPROVE_INVESTIGATION, "INVESTIGACION")
  ) {
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

function InvestigationSupervision({ supervision, token }) {
  const [region, setRegion] = useState("");
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("");
  const [personnelRegion, setPersonnelRegion] = useState("");
  const overview =
    supervision.regions.find((entry) => entry.id === region)?.overview ||
    supervision.overview;
  const normalize = (value) =>
    value
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const personnel = supervision.personnel.filter(
    (person) =>
      normalize(
        `${person.name} ${person.jobTitle} ${person.specialties.join(" ")}`,
      ).includes(normalize(search)) &&
      (!availability || String(person.available) === availability) &&
      (!personnelRegion ||
        person.coverages.some((coverage) => coverage.id === personnelRegion)),
  );
  const territories = [
    ...new Map(
      supervision.personnel
        .flatMap((person) => person.coverages)
        .map((entry) => [entry.id, entry]),
    ).values(),
  ];
  const max = Math.max(1, ...overview.bySpecialty.map((entry) => entry.count));
  return (
    <section
      className="supervision-panel"
      aria-label="Supervisión de Investigación"
    >
      <div className="section-title">
        <div>
          <small>{supervision.scope} · consulta</small>
          <h2>Tablero de supervisión de Investigación</h2>
        </div>
        <label>
          Territorio del tablero
          <select
            value={region}
            onChange={(event) => setRegion(event.target.value)}
          >
            <option value="">Todo mi alcance</option>
            {supervision.regions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ExportInvestigation token={token} filters={{ region }} />
      <div className="supervision-metrics">
        <Kpi
          label="Pendientes de envío al defensor"
          value={overview.awaitingDispatch || 0}
          tone="purple"
        />
        <Kpi
          label="Vencidas con plazo configurado"
          value={overview.overdue || 0}
          tone="amber"
        />
        {[
          ["Solicitudes", overview.requests],
          ["Misiones en curso", overview.active],
          ["Informes por revisar", overview.awaitingReview],
          ["Sin candidato", overview.exceptions],
          ["Misiones cerradas", overview.closed],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="supervision-columns">
        <article>
          <h3>Misiones por especialidad</h3>
          {overview.bySpecialty.map((entry) => (
            <div className="supervision-bar" key={entry.id}>
              <span>{entry.label}</span>
              <div>
                <i style={{ width: `${(100 * entry.count) / max}%` }} />
              </div>
              <strong>{entry.count}</strong>
            </div>
          ))}
          <small>
            Un ítem puede estar relacionado con varias especialidades.
          </small>
        </article>
        <article>
          <h3>Distribución por estado</h3>
          {overview.byStatus.map((entry) => (
            <p key={entry.status}>
              {STATUS_LABELS[entry.status] || entry.status}
              <strong>{entry.count}</strong>
            </p>
          ))}
          {!overview.items && <p>No hay misiones en este alcance.</p>}
        </article>
      </div>
      <details className="supervision-recent">
        <summary>Actividad reciente · {overview.recent.length} eventos</summary>
        {overview.recent.map((entry, index) => (
          <article key={`${entry.itemId}-${index}`}>
            <strong>
              {entry.requestId} · {entry.service}
            </strong>
            <span>
              {STATUS_LABELS[entry.status] || entry.status} · {entry.region}
            </span>
            <small>
              {new Date(entry.at).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
              })}
            </small>
          </article>
        ))}
      </details>
      <details className="supervision-personnel" open>
        <summary>
          Investigadores y especialistas · {supervision.personnel.length}{" "}
          personas
        </summary>
        <ExportInvestigation
          token={token}
          filters={{
            region,
            personnelSearch: search,
            availability,
            personnelRegion,
          }}
          label="Descargar Excel de investigadores"
        />
        <div className="supervision-filters">
          <label>
            Buscar investigador
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, cargo o especialidad"
            />
          </label>
          <label>
            Disponibilidad
            <select
              aria-label="Disponibilidad"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="true">Disponible</option>
              <option value="false">No disponible</option>
            </select>
          </label>
          <label>
            Cobertura del investigador
            <select
              value={personnelRegion}
              onChange={(event) => setPersonnelRegion(event.target.value)}
            >
              <option value="">Todos los territorios autorizados</option>
              {territories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="supervision-table-scroll">
          <table>
            <caption>
              Personal y misiones dentro del alcance de consulta
            </caption>
            <thead>
              <tr>
                <th>Nombre y cargo</th>
                <th>Sede territorial</th>
                <th>Especialidades</th>
                <th>Cobertura</th>
                <th>Disponibilidad</th>
                <th>En gestión</th>
                <th>Cerradas</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.name}</strong>
                    <small>{person.jobTitle}</small>
                  </td>
                  <td>{person.baseRegionLabel}</td>
                  <td>{person.specialties.join(", ")}</td>
                  <td>
                    {person.coverages
                      .map((coverage) => coverage.label)
                      .join(", ")}
                  </td>
                  <td>
                    <span
                      className={
                        person.available
                          ? "person-available"
                          : "person-unavailable"
                      }
                    >
                      {person.availabilityLabel}
                    </span>
                  </td>
                  <td>{person.activeAssignments}</td>
                  <td>{person.closedAssignments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!personnel.length && (
          <p>No hay investigadores que coincidan con estos filtros.</p>
        )}
      </details>
    </section>
  );
}

function ServiceCatalog({ area, services, specialties }) {
  const [search, setSearch] = useState("");
  const normalize = (value) =>
    value
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const names = new Map(
    specialties.map((specialty) => [specialty.id, specialty.name]),
  );
  const areaServices = services.filter((service) => service.area === area);
  const filtered = areaServices.filter((service) =>
    normalize(
      `${service.name} ${service.specialtyIds.map((id) => names.get(id)).join(" ")}`,
    ).includes(normalize(search)),
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
        <label className="catalog-search">
          Buscar en el catálogo
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Servicio o especialidad"
          />
        </label>
        <div className="service-catalog-grid">
          {filtered.map((service) => (
            <article key={service.id}>
              <details className="catalog-service-detail">
                <summary>
                  <strong>{service.name}</strong>
                  <small>
                    {service.specialtyIds
                      .map((id) => names.get(id) || id)
                      .join(" · ")}
                  </small>
                </summary>
                <p>{service.description}</p>
                <dl>
                  <div>
                    <dt>Especialidad o disciplina</dt>
                    <dd>
                      {service.specialtyIds
                        .map((id) => names.get(id) || id)
                        .join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Servicios o actividades incluidas</dt>
                    <dd>
                      <ul>
                        {service.activities.map((activity) => (
                          <li key={activity}>{activity}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>Requisitos</dt>
                    <dd>
                      <ul>
                        {service.requirements.map((requirement) => (
                          <li key={requirement}>{requirement}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>Exclusiones</dt>
                    <dd>
                      <ul>
                        {service.exclusions.map((exclusion) => (
                          <li key={exclusion}>{exclusion}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>Producto esperado</dt>
                    <dd>{service.product}</dd>
                  </div>
                  <div>
                    <dt>Cobertura y plazo</dt>
                    <dd>
                      {service.coverage.label}. Plazo parametrizable por
                      servicio
                    </dd>
                  </div>
                </dl>
                <small>
                  Versión {service.version} · vigente desde {service.validFrom}
                </small>
              </details>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <p className="catalog-search">
            No hay servicios que coincidan con la búsqueda.
          </p>
        )}
      </details>
    </section>
  );
}

function InvestigationForm({ catalogs, profile, token, run, busy }) {
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const steps = [
    "Solicitante",
    "Proceso",
    "Necesidad",
    "Servicios",
    "Confirmación",
  ];
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({
    identifierType: "SPOA",
    spoa: "110016000049202600099",
    processReference: "Juzgado penal municipal · Caso 2026-0099",
    delito: "Hurto",
    proceduralStage: "INVESTIGACION",
    hearingApplies: true,
    hearingDate: "2026-10-15",
    facts:
      "Se investiga la sustracción de una bicicleta en un establecimiento de Bogotá. Hay dos personas que presenciaron los hechos y una cámara en el acceso.",
    hypothesis:
      "La ubicación de la persona defendida y la secuencia del registro audiovisual podrían diferir de lo narrado en la denuncia.",
    requiredWork:
      "Ubicar y entrevistar a los testigos, verificar el lugar e identificar los registros disponibles para contrastar la secuencia de los hechos.",
    region: "BOGOTA",
    differentialApplies: false,
    differentialDetail: "",
    priorityType: "ORDINARIA",
    priorityReason: "",
    prioritySupport: "",
  });
  const [persons, setPersons] = useState([
    {
      alias: "Daniel Álvarez",
      relationship: "Procesado/a",
      notes: "Verificar ubicación al momento de los hechos.",
    },
  ]);
  const [documents, setDocuments] = useState([
    { type: "SOLICITUD_DEFENSA", reference: "REF-SOL-2026-0099" },
  ]);
  const [services, setServices] = useState(["SVC_INV_VERIFICACION_TERRENO"]);
  const [serviceRegions, setServiceRegions] = useState({});
  const draft = useServerDraft(
    token,
    "INVESTIGACION",
    { form, persons, documents, services, serviceRegions, step, submissionId },
    (data) => {
      if (data.form) setForm(data.form);
      if (data.persons) setPersons(data.persons);
      if (data.documents) setDocuments(data.documents);
      if (data.services) setServices(data.services);
      setServiceRegions(data.serviceRegions || {});
      setStep(Math.min(4, Math.max(0, Number(data.step) || 0)));
      setSubmissionId(data.submissionId || crypto.randomUUID());
      setConfirmed(false);
    },
  );
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
  const startAnother = () => {
    draft.reset();
    setSubmissionId(crypto.randomUUID());
    setServiceRegions({});
    setReceipt(null);
    setStep(0);
    setConfirmed(false);
    setForm((current) => ({
      ...current,
      spoa: "",
      processReference: "",
      delito: "",
      facts: "",
      hypothesis: "",
      requiredWork: "",
      hearingApplies: false,
      hearingDate: "",
      differentialApplies: false,
      differentialDetail: "",
      priorityType: "ORDINARIA",
      priorityReason: "",
      prioritySupport: "",
    }));
    setPersons([{ alias: "", relationship: "Procesado/a", notes: "" }]);
    setDocuments([{ type: "SOLICITUD_DEFENSA", reference: "" }]);
    setServices(["SVC_INV_VERIFICACION_TERRENO"]);
  };
  if (receipt)
    return (
      <section
        className="creation-panel wizard-panel"
        aria-label="Confirmación de radicación"
      >
        <div className="panel-copy">
          <small>Radicación confirmada</small>
          <h2>Solicitud {receipt.id} radicada</h2>
          <p>
            Identificador del proceso: {receipt.externalId}. Consulte el
            resultado del reparto de cada servicio en la bandeja de solicitudes.
          </p>
        </div>
        <button
          type="button"
          className="primary-demo"
          disabled={busy}
          onClick={startAnother}
        >
          Radicar una nueva solicitud
        </button>
      </section>
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
      <DraftPanel draft={draft} />
      <WizardProgress steps={steps} current={step} />
      <form
        onChangeCapture={() => setSubmissionId(crypto.randomUUID())}
        onSubmit={(event) => {
          event.preventDefault();
          if (step < steps.length - 1) return setStep(step + 1);
          run(
            "create-inv",
            () =>
              apiCreateInvestigation(token, {
                submissionId,
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
                  region: serviceRegions[service] || form.region,
                })),
              }),
            "Solicitud radicada; el reparto automático fue procesado por ítem",
            (result) => {
              setReceipt(result.request);
              draft.complete();
            },
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
                type="text"
                inputMode={form.identifierType === "SPOA" ? "numeric" : "text"}
                pattern={
                  form.identifierType === "SPOA" ? "[0-9]{21}" : undefined
                }
                minLength={form.identifierType === "SPOA" ? 21 : undefined}
                maxLength={form.identifierType === "SPOA" ? 21 : 200}
                required
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
              <textarea
                aria-label="Hechos"
                value={form.facts}
                maxLength={catalogs.investigationTextLimit}
                onChange={update("facts")}
              />
              <small>
                {form.facts.length.toLocaleString("es-CO", {
                  timeZone: "America/Bogota",
                })}{" "}
                /{" "}
                {catalogs.investigationTextLimit?.toLocaleString("es-CO", {
                  timeZone: "America/Bogota",
                })}{" "}
                caracteres · resuma los hechos relevantes
              </small>
            </label>
            <label>
              Hipótesis
              <textarea
                value={form.hypothesis}
                maxLength={catalogs.investigationTextLimit}
                onChange={update("hypothesis")}
              />
            </label>
            <label>
              Labores requeridas
              <textarea
                value={form.requiredWork}
                maxLength={catalogs.investigationTextLimit}
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
              <select
                aria-label="Cobertura"
                value={form.region}
                onChange={update("region")}
              >
                {catalogs.regions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
              <small>
                Lugar requerido para la labor. El reparto verifica la cobertura
                de cada especialidad.
              </small>
            </label>
            {form.hearingApplies && (
              <p className="notice" role="note">
                Tenga en cuenta los términos de cada actividad y la fecha de
                audiencia. Sin una política de plazo aprobada no es posible
                garantizar la entrega antes de la audiencia; la fecha informada
                no reduce automáticamente el término.
              </p>
            )}
            {services.map((serviceId) => (
              <div className="execution-panel" key={serviceId}>
                <label>
                  Cobertura de{" "}
                  {
                    catalogs.investigationServices.find(
                      (entry) => entry.id === serviceId,
                    )?.label
                  }
                  <select
                    value={serviceRegions[serviceId] || form.region}
                    onChange={(event) =>
                      setServiceRegions((current) => ({
                        ...current,
                        [serviceId]: event.target.value,
                      }))
                    }
                  >
                    {catalogs.regions.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <details>
                  <summary>Consultar alcance del servicio</summary>
                  <p>
                    {
                      catalogs.investigationServices.find(
                        (entry) => entry.id === serviceId,
                      )?.description
                    }
                  </p>
                  <ul>
                    {(
                      catalogs.investigationServices.find(
                        (entry) => entry.id === serviceId,
                      )?.activities || []
                    ).map((activity) => (
                      <li key={activity}>{activity}</li>
                    ))}
                  </ul>
                  <p>
                    Exclusiones:{" "}
                    {(
                      catalogs.investigationServices.find(
                        (entry) => entry.id === serviceId,
                      )?.exclusions || []
                    ).join("; ")}
                  </p>
                </details>
              </div>
            ))}
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
            <ul>
              {services.map((service) => (
                <li key={service}>
                  {
                    catalogs.investigationServices.find(
                      (entry) => entry.id === service,
                    )?.label
                  }{" "}
                  ·{" "}
                  {
                    catalogs.regions.find(
                      (entry) =>
                        entry.id === (serviceRegions[service] || form.region),
                    )?.label
                  }
                </li>
              ))}
            </ul>
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
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const steps = ["RJV", "Proceso", "Personas", "Servicios", "Confirmación"];
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [documentError, setDocumentError] = useState("");
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
    { type: "F163", reference: "REF-FORM-2026-0004" },
  ]);
  const [services, setServices] = useState(["SVC_VIC_EVALUACION_PSICOLOGICA"]);
  const draft = useServerDraft(
    token,
    "VICTIMAS",
    { form, persons, documents, services, step, submissionId },
    (data) => {
      if (data.form) setForm(data.form);
      if (data.persons) setPersons(data.persons);
      if (data.documents) setDocuments(data.documents);
      if (data.services) setServices(data.services);
      setStep(Math.min(4, Math.max(0, Number(data.step) || 0)));
      setSubmissionId(data.submissionId || crypto.randomUUID());
      setConfirmed(false);
    },
  );
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
  function startAnother() {
    draft.reset();
    setSubmissionId(crypto.randomUUID());
    setForm({
      externalId: "",
      law: "LEY_1448",
      processReference: "",
      hearingApplies: false,
      hearingDate: "",
      facts: "",
      region: "BOGOTA",
    });
    setPersons([
      {
        alias: "",
        type: "DIRECTA",
        relationship: "",
        familyGroup: "",
        phone: "",
        email: "",
        preferredChannel: "Correo",
      },
    ]);
    setDocuments([{ type: "F163", reference: "" }]);
    setServices(["SVC_VIC_EVALUACION_PSICOLOGICA"]);
    setConfirmed(false);
    setDocumentError("");
    setStep(0);
    setReceipt(null);
  }
  if (receipt)
    return (
      <section
        className="creation-panel victims"
        aria-label="Confirmación de solicitud de Víctimas"
      >
        <div className="panel-copy">
          <small>Envío confirmado</small>
          <h2>Solicitud {receipt.id} registrada</h2>
          <p>
            Radicado: {receipt.externalId}. La solicitud está pendiente de
            aprobación previa del PAG; el reparto se ejecutará después del aval.
          </p>
          <button
            type="button"
            className="primary-demo"
            onClick={startAnother}
            disabled={busy}
          >
            Crear una nueva solicitud
          </button>
        </div>
      </section>
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
      <DraftPanel draft={draft} />
      <WizardProgress steps={steps} current={step} />
      <form
        onChangeCapture={() => setSubmissionId(crypto.randomUUID())}
        onSubmit={(event) => {
          event.preventDefault();
          if (
            step >= 3 &&
            !documents.some(
              (document) =>
                ["F163", "FORMATO_SOLICITUD"].includes(document.type) &&
                document.reference?.trim(),
            )
          ) {
            setDocumentError(
              "Falta el F163: seleccione un archivo o registre su URL o referencia en el campo Formato de solicitud F163.",
            );
            setStep(3);
            return;
          }
          setDocumentError("");
          if (step < steps.length - 1) return setStep(step + 1);
          run(
            "create-vic",
            () =>
              apiCreateVictims(token, {
                submissionId,
                externalId: form.externalId,
                law: form.law,
                caseData: {
                  ...victimsCaseForm(form),
                  processReference: form.processReference,
                  hearingApplies: form.hearingApplies,
                  hearingDate: form.hearingDate,
                  facts: form.facts,
                },
                persons: persons.map((person) => ({
                  ...victimsPersonForm(person),
                  alias: person.alias,
                  type: person.type,
                  relationship: person.relationship,
                  familyGroup: person.familyGroup,
                  contact: {
                    phone: person.phone,
                    email: person.email,
                    preferredChannel: person.preferredChannel,
                    address: person.address,
                    municipality: person.municipality,
                    department: person.department,
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
            (result) => {
              setReceipt(result.request);
              draft.complete();
            },
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
              Referencia del proceso judicial
              <input
                aria-label="Proceso"
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
            <VictimsCaseFields form={form} update={update} />
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
              <select
                aria-label="Cobertura"
                value={form.region}
                onChange={update("region")}
              >
                {catalogs.regions.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            {documentError && <p role="alert">{documentError}</p>}
            <VictimsDocumentsEditor
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
            Nombre o identificación
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
              <VictimsPersonFields
                person={person}
                update={(field, value) => updatePerson(index, field, value)}
              />
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

function VictimsDocumentsEditor({ documents, setDocuments, catalog }) {
  useEffect(() => {
    const index = documents.findIndex((document) =>
      ["F163", "FORMATO_SOLICITUD"].includes(document.type),
    );
    if (index === 0) return;
    setDocuments((current) => {
      const required = current.find((document) =>
        ["F163", "FORMATO_SOLICITUD"].includes(document.type),
      );
      const annexes = current.filter(
        (document) => !["F163", "FORMATO_SOLICITUD"].includes(document.type),
      );
      return [required || { type: "F163", reference: "" }, ...annexes];
    });
  }, [documents, setDocuments]);
  return (
    <DocumentsEditor
      documents={documents}
      setDocuments={setDocuments}
      catalog={catalog}
      allowFiles
      lockRequestFormat
    />
  );
}

function DocumentsEditor({
  documents,
  setDocuments,
  catalog,
  allowFiles = true,
  lockRequestFormat = false,
}) {
  const filePolicy = useFilePolicy();
  const [fileError, setFileError] = useState("");
  const updateDocument = (index, field, value) =>
    setDocuments((current) =>
      current.map((document, position) =>
        position === index
          ? {
              ...document,
              [field]: value,
              ...(field === "reference"
                ? {
                    file: undefined,
                    attachment: undefined,
                    selectedFileName: undefined,
                  }
                : {}),
            }
          : document,
      ),
    );
  return (
    <fieldset className="documents-editor">
      <legend>Documentos y formatos aplicables</legend>
      {fileError && <p role="alert">{fileError}</p>}
      {documents.map((document, index) => (
        <div className="document-row" key={`document-${index}`}>
          <label>
            {lockRequestFormat && index === 0
              ? "Formato de solicitud F163 (obligatorio)"
              : "Tipo"}
            <select
              aria-label={`Tipo documental ${index + 1}`}
              disabled={lockRequestFormat && index === 0}
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
          {allowFiles && (
            <>
              <label>
                Cargar archivo
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  aria-label={`Cargar archivo documental ${index + 1}`}
                  onChange={async (event) => {
                    const selected = event.target.files?.[0];
                    if (!selected) return;
                    setFileError("");
                    if (
                      selected.size > filePolicy.maxFileBytes ||
                      !/\.pdf$/i.test(selected.name)
                    ) {
                      setFileError(
                        `Seleccione un PDF de hasta ${megabytes(filePolicy.maxFileBytes)}.`,
                      );
                      return;
                    }
                    try {
                      const contentBase64 = await new Promise(
                        (resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () =>
                            resolve(String(reader.result).split(",")[1]);
                          reader.onerror = () =>
                            reject(new Error("No fue posible leer el archivo"));
                          reader.readAsDataURL(selected);
                        },
                      );
                      setDocuments((current) =>
                        current.map((entry, position) =>
                          position === index
                            ? {
                                ...entry,
                                reference: selected.name,
                                selectedFileName: selected.name,
                                attachment: undefined,
                                file: {
                                  name: selected.name,
                                  mimeType: selected.type || "application/pdf",
                                  contentBase64,
                                },
                              }
                            : entry,
                        ),
                      );
                    } catch (error) {
                      setFileError(error.message);
                    }
                  }}
                />
              </label>
              {document.selectedFileName && (
                <p role="status">
                  Archivo seleccionado: {document.selectedFileName}
                </p>
              )}
              <label>
                URL de SharePoint
                <input
                  type="url"
                  aria-label={`URL de SharePoint documental ${index + 1}`}
                  placeholder="https://entidad.sharepoint.com/..."
                  value={
                    document.reference.startsWith("https://")
                      ? document.reference
                      : ""
                  }
                  onChange={(event) =>
                    updateDocument(index, "reference", event.target.value)
                  }
                />
              </label>
            </>
          )}
          {documents.length > 1 && !(lockRequestFormat && index === 0) && (
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
  const [query, setQuery] = useState("");
  const filtered = catalog.filter((item) =>
    item.label
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes(
        query
          .toLocaleLowerCase("es")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
      ),
  );
  return (
    <fieldset className="service-selector">
      <legend>{title}</legend>
      <small>{hint}</small>
      {catalog.length > 10 && (
        <label>
          Buscar servicio
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Por ejemplo: medicina, fotografía, financiera"
          />
        </label>
      )}
      <small>{selected.length} servicio(s) seleccionado(s)</small>
      <div>
        {filtered.map((item) => (
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
      {!filtered.length && (
        <p>No hay servicios que coincidan con la búsqueda.</p>
      )}
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

function RequestCard({
  request,
  profile,
  token,
  busy,
  run,
  catalogs,
  onOpenDetail,
}) {
  const showCurrentRequestInformation =
    request.area !== "VICTIMAS" ||
    canViewCurrentVictimsInformation(profile, request.area);
  return (
    <article className="request-card">
      <header>
        <div>
          <small>
            {request.area === "INVESTIGACION"
              ? "Misión de trabajo"
              : "Solicitud pericial"}
          </small>
          <h3>{request.displayNumber || request.id}</h3>
          {request.displayNumber && (
            <small>Referencia interna: {request.id}</small>
          )}
        </div>
        <span className="external-id">
          {showCurrentRequestInformation
            ? request.externalId
            : "Información aprobada por ítem"}
        </span>
      </header>
      {showCurrentRequestInformation && (
        <p className="request-summary">
          {request.summary || "Caso registrado"}
        </p>
      )}
      <p className="request-aggregate-status">
        <strong>Estado agregado de la solicitud:</strong>{" "}
        {STATUS_LABELS[request.aggregateStatus] || request.aggregateStatus}
        {` · ${request.aggregateCounts.closedItems}/${request.aggregateCounts.totalItems} ítems cerrados`}
      </p>
      {showCurrentRequestInformation && request.persons?.length > 0 && (
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
          request={request}
          area={request.area}
          profile={profile}
          token={token}
          busy={busy}
          run={run}
          catalogs={catalogs}
          onOpenDetail={(opener) => onOpenDetail(item.id, opener)}
        />
      ))}
    </article>
  );
}

function ItemCard({
  item,
  request,
  area,
  profile,
  token,
  busy,
  run,
  catalogs,
  onOpenDetail,
}) {
  const isBusy = busy === item.id;
  const actionAvailable = canActOnItem(area, profile, item.status);
  const nextAction = nextActionFor(area, item.status);
  const selectedCandidate = item.assignment?.evaluated?.find(
    (candidate) => candidate.candidateId === item.assigneeId,
  );
  const isVictimsExecutor =
    area === "VICTIMAS" &&
    profileHas(profile, CAPABILITIES.EXECUTE_VICTIMS, area);
  const applicableData = item.applicableRequestData;
  const applicableItem = applicableData?.items?.find(
    (candidate) => candidate.id === item.id,
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
      <ActivityHistory item={item} />
      <ProductFiles item={item} token={token} area={area} />
      {isVictimsExecutor && applicableData && (
        <div className="item-applicable-context">
          <strong>Datos aprobados aplicables a este encargo</strong>
          <span>
            Versión {item.approvedSubmissionVersion} ·{" "}
            {applicableData.externalId}
          </span>
          <small>
            {applicableItem?.serviceLabel || item.serviceLabel} ·{" "}
            {applicableItem?.regionLabel || item.regionLabel}
          </small>
          <small>
            {applicableData.caseData?.processReference ||
              "Proceso sin referencia"}
          </small>
        </div>
      )}
      <div className="next-action">
        <span>Siguiente acción</span>
        <strong>{nextAction.action}</strong>
        <small>{nextAction.role}</small>
      </div>
      <div className="item-facts">
        {item.originItemId && (
          <span className="continuation-reference">
            <small>
              {item.followUpKind === "ACTUALIZACION_F171"
                ? "Actualización del F171"
                : "Encargo vinculado"}
            </small>
            <strong>{item.originItemId}</strong>
            {item.continuationReason && (
              <small>{item.continuationReason}</small>
            )}
          </span>
        )}
        {area === "INVESTIGACION" && (
          <>
            <span>
              <small>Fecha de ingreso</small>
              <strong>
                {new Date(request.createdAt).toLocaleDateString("es-CO", {
                  timeZone: "America/Bogota",
                })}
              </strong>
            </span>
            <span>
              <small>Vencimiento</small>
              <strong>
                {item.dueDate || "Pendiente de política aprobada"}
              </strong>
            </span>
          </>
        )}
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
        {area === "VICTIMAS" &&
          (item.termSnapshot?.operationalEnabled ||
            item.termExtensions?.length > 0) && (
            <InvestigationOperations
              item={item}
              area="VICTIMAS"
              profile={profile}
              catalogs={catalogs}
              token={token}
              busy={isBusy}
              run={run}
            />
          )}
        {area === "VICTIMAS" &&
          item.followUpAvailable &&
          profileHas(profile, "SOLICITAR_AMPLIACION", area) && (
            <VictimsFollowUp
              item={item}
              token={token}
              busy={isBusy}
              run={run}
            />
          )}
        {area === "INVESTIGACION" && (
          <InvestigationOperations
            item={item}
            profile={profile}
            catalogs={catalogs}
            token={token}
            busy={isBusy}
            run={run}
          />
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
          profileHas(profile, CAPABILITIES.DECLARE_IMPROCEDENCE, area) &&
          ["ASIGNADA", "EN_EJECUCION"].includes(item.status) && (
            <ImprocedenceAction
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
              request={request}
              catalogs={catalogs}
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
          {item.status === "CERRADA" && !item.followUpAvailable
            ? "El servicio está cerrado; solo se permite consultar su trazabilidad."
            : `Esta cuenta puede consultar. La acción corresponde a ${nextAction.role.toLowerCase()}.`}
        </p>
      )}

      {item.assignment && (
        <AssignmentExplanation assignment={item.assignment} />
      )}
      {area === "VICTIMAS" && item.status === "IMPROCEDENTE" && (
        <div className="local-confirmation" role="status">
          <strong>Improcedencia declarada por el perito</strong>
          <p>
            Constancia y soporte disponibles para el RJV en esta solicitud. El
            envío por correo requiere configurar el servicio institucional.
          </p>
          {item.operations
            ?.filter((operation) => operation.type === "IMPROCEDENCIA")
            .map((operation) => (
              <p key={operation.id}>
                {operation.reason} · {operation.description} · Soporte:{" "}
                {operation.supportReference}
              </p>
            ))}
        </div>
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
                  <small>
                    {new Date(event.at).toLocaleString("es-CO", {
                      timeZone: "America/Bogota",
                    })}
                  </small>
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

function VictimsCorrectionAction({
  item,
  request,
  catalogs,
  token,
  busy,
  run,
}) {
  const original = item.submittedRequestData;
  const [open, setOpen] = useState(false);
  const correctionSubmission = useRef(crypto.randomUUID());
  const [step, setStep] = useState(0);
  const [correctionSummary, setCorrectionSummary] = useState("");
  const [form, setForm] = useState(() => correctionFormFrom(original));
  const [persons, setPersons] = useState(() =>
    correctionPersonsFrom(original?.persons),
  );
  const [documents, setDocuments] = useState(() =>
    structuredClone(original?.documents || []),
  );
  if (!original) return null;

  const update = (key) => (event) =>
    setForm((current) => ({
      ...current,
      [key]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
  const payload = correctionPayload(form, persons, documents);
  const changes = correctionChangesForPresentation(original, payload, catalogs);
  const lastObservation = item.pagObservations?.at(-1);
  const steps = ["Solicitud", "Personas y soportes", "Confirmación"];

  function attemptClose() {
    if (
      (changes.length || correctionSummary.trim()) &&
      !window.confirm(
        "Hay cambios sin guardar. ¿Desea cerrar el asistente y perderlos?",
      )
    ) {
      return;
    }
    setOpen(false);
  }

  function submit() {
    run(
      item.id,
      () =>
        apiVictimsAction(token, item.id, "corregir-reenviar", {
          submissionId: correctionSubmission.current,
          ...payload,
          correctionSummary,
        }),
      "Solicitud corregida y reenviada al PAG",
    );
  }

  return (
    <div className="correction-launcher">
      <button type="button" onClick={() => setOpen(true)}>
        Abrir asistente de corrección
      </button>
      {open && (
        <div className="correction-overlay" onMouseDown={attemptClose}>
          <section
            className="correction-dialog"
            onChangeCapture={() => {
              correctionSubmission.current = crypto.randomUUID();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`correction-title-${item.id}`}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") attemptClose();
            }}
          >
            <header>
              <div>
                <small>
                  Ítem {item.id} · versión devuelta {item.submissionVersion}
                </small>
                <h2 id={`correction-title-${item.id}`}>
                  Corregir solicitud de Víctimas
                </h2>
              </div>
              <button type="button" onClick={attemptClose}>
                Cerrar
              </button>
            </header>

            <div className="pag-return-observation">
              <strong>Observación de devolución del PAG</strong>
              <p>
                {lastObservation?.observation || "Sin observación registrada"}
              </p>
              {lastObservation && (
                <small>
                  Versión {lastObservation.version} ·{" "}
                  {new Date(lastObservation.at).toLocaleString("es-CO", {
                    timeZone: "America/Bogota",
                  })}
                </small>
              )}
            </div>

            <WizardProgress steps={steps} current={step} />

            {step === 0 && (
              <div className="wizard-fields full-width">
                <label>
                  Identificador externo
                  <input
                    aria-label="Identificador externo corregido"
                    value={form.externalId}
                    onChange={update("externalId")}
                  />
                </label>
                <label>
                  Ley o programa
                  <select
                    aria-label="Ley o programa corregido"
                    value={form.law}
                    onChange={update("law")}
                  >
                    {catalogs.laws.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Referencia del proceso judicial
                  <input
                    aria-label="Proceso corregido"
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
                      aria-label="Fecha de audiencia corregida"
                      type="date"
                      value={form.hearingDate}
                      onChange={update("hearingDate")}
                    />
                  </label>
                )}
                <label>
                  Hechos
                  <textarea
                    aria-label="Hechos corregidos"
                    value={form.facts}
                    onChange={update("facts")}
                  />
                </label>
                <VictimsCaseFields form={form} update={update} />
              </div>
            )}

            {step === 1 && (
              <div className="correction-editors">
                <PersonsEditor
                  persons={persons}
                  setPersons={setPersons}
                  mode="victims"
                />
                <div className="wizard-fields">
                  <label>
                    Servicio del ítem devuelto
                    <select
                      aria-label="Servicio corregido"
                      value={form.service}
                      onChange={update("service")}
                    >
                      {catalogs.victimServices.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cobertura
                    <select
                      aria-label="Cobertura corregida"
                      value={form.region}
                      onChange={update("region")}
                    >
                      {catalogs.regions.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <VictimsDocumentsEditor
                  documents={documents}
                  setDocuments={setDocuments}
                  catalog={catalogs.victimDocumentTypes}
                />
              </div>
            )}

            {step === 2 && (
              <section className="correction-review">
                <h3>Resumen de cambios antes de reenviar</h3>
                <dl>
                  <div>
                    <dt>Ítem afectado</dt>
                    <dd>{item.id}</dd>
                  </div>
                  <div>
                    <dt>Versión devuelta</dt>
                    <dd>{item.submissionVersion}</dd>
                  </div>
                  <div>
                    <dt>Versión que será creada</dt>
                    <dd>{item.nextSubmissionVersion}</dd>
                  </div>
                  <div>
                    <dt>Solicitud</dt>
                    <dd>{request.id}</dd>
                  </div>
                </dl>
                {changes.length ? (
                  <div className="correction-differences">
                    {changes.map((change) => (
                      <article key={change.field}>
                        <strong>{change.label}</strong>
                        <div>
                          <span>
                            <small>Valor anterior</small>
                            {displayCorrectionValue(change.previous)}
                          </span>
                          <span>
                            <small>Valor nuevo</small>
                            {displayCorrectionValue(change.next)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="no-correction-changes">
                    No hay cambios reales para reenviar.
                  </p>
                )}
                <label>
                  Descripción obligatoria de la corrección
                  <textarea
                    aria-label="Descripción obligatoria de la corrección"
                    value={correctionSummary}
                    onChange={(event) =>
                      setCorrectionSummary(event.target.value)
                    }
                    placeholder="Explique qué se corrigió"
                  />
                </label>
              </section>
            )}

            <div className="wizard-navigation correction-navigation">
              {step > 0 && (
                <button type="button" onClick={() => setStep(step - 1)}>
                  Anterior
                </button>
              )}
              {step < steps.length - 1 ? (
                <button
                  className="primary-demo"
                  type="button"
                  onClick={() => setStep(step + 1)}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  className="primary-demo"
                  type="button"
                  disabled={
                    busy || !changes.length || !correctionSummary.trim()
                  }
                  onClick={submit}
                >
                  Reenviar corrección al PAG
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function correctionFormFrom(original = {}) {
  return {
    ...victimsCaseForm(original.caseData || {}),
    externalId: original.externalId || "",
    law: original.law || "",
    processReference: original.caseData?.processReference || "",
    hearingApplies: Boolean(original.caseData?.hearingApplies),
    hearingDate: original.caseData?.hearingDate || "",
    facts: original.caseData?.facts || "",
    service: original.service || "",
    region: original.region || "",
  };
}

function correctionPersonsFrom(persons = []) {
  return persons.map((person) => ({
    ...victimsPersonForm(person),
    alias: person.alias || "",
    type: person.type || "DIRECTA",
    relationship: person.relationship || "",
    familyGroup: person.familyGroup || "",
    phone: person.contact?.phone || "",
    email: person.contact?.email || "",
    preferredChannel: person.contact?.preferredChannel || "Correo",
    address: person.contact?.address || "",
    municipality: person.contact?.municipality || "",
    department: person.contact?.department || "",
  }));
}

function correctionPayload(form, persons, documents) {
  return {
    externalId: correctionText(form.externalId),
    law: correctionText(form.law),
    caseData: {
      ...victimsCaseForm(form),
      processReference: correctionText(form.processReference),
      hearingApplies: form.hearingApplies,
      hearingDate: form.hearingApplies
        ? correctionText(form.hearingDate) || null
        : null,
      facts: correctionText(form.facts),
    },
    persons: persons.map((person) => ({
      ...victimsPersonForm(person),
      alias: correctionText(person.alias),
      type: correctionText(person.type).toUpperCase(),
      relationship: correctionText(person.relationship) || null,
      familyGroup: correctionText(person.familyGroup),
      contact: {
        phone: correctionText(person.phone) || null,
        email: correctionText(person.email) || null,
        preferredChannel: correctionText(person.preferredChannel) || null,
        ...Object.fromEntries(
          ["address", "municipality", "department"]
            .filter((field) => correctionText(person[field]))
            .map((field) => [field, correctionText(person[field])]),
        ),
      },
    })),
    service: correctionText(form.service),
    region: correctionText(form.region),
    documents: documents.map((document) => ({
      type: correctionText(document.type).toUpperCase(),
      reference: correctionText(document.reference),
      ...(document.file
        ? { file: document.file }
        : document.attachment
          ? { attachment: document.attachment }
          : {}),
    })),
  };
}

function correctionText(value) {
  return String(value || "").trim();
}

function correctionChangesForPresentation(original, next, catalogs) {
  const labels = {
    laws: new Map(catalogs.laws.map((entry) => [entry.id, entry.label])),
    services: new Map(
      catalogs.victimServices.map((entry) => [entry.id, entry.label]),
    ),
    regions: new Map(catalogs.regions.map((entry) => [entry.id, entry.label])),
  };
  const entries = [
    [
      "externalId",
      "Identificador externo",
      original.externalId,
      next.externalId,
    ],
    [
      "law",
      "Ley o programa",
      labels.laws.get(original.law) || original.law,
      labels.laws.get(next.law) || next.law,
    ],
    [
      "caseData.processReference",
      "Proceso",
      original.caseData?.processReference,
      next.caseData.processReference,
    ],
    [
      "caseData.hearingApplies",
      "Aplica audiencia",
      Boolean(original.caseData?.hearingApplies),
      Boolean(next.caseData.hearingApplies),
    ],
    [
      "caseData.hearingDate",
      "Fecha de audiencia",
      original.caseData?.hearingDate || null,
      next.caseData.hearingDate || null,
    ],
    ["caseData.facts", "Hechos", original.caseData?.facts, next.caseData.facts],
    ...[
      ["offenses", "Delito(s)"],
      ["judicialAuthority", "Autoridad judicial"],
      ["defendantName", "Procesado o postulado"],
      ["requestedMeasures", "Pretensiones"],
      ["hearingPlace", "Lugar de audiencia"],
      ["sentenceDate", "Fecha de sentencia"],
    ].map(([field, label]) => [
      `caseData.${field}`,
      label,
      original.caseData?.[field],
      next.caseData?.[field],
    ]),
    ["persons", "Personas vinculadas", original.persons, next.persons],
    [
      "service",
      "Servicio",
      labels.services.get(original.service) || original.service,
      labels.services.get(next.service) || next.service,
    ],
    [
      "region",
      "Cobertura",
      labels.regions.get(original.region) || original.region,
      labels.regions.get(next.region) || next.region,
    ],
    ["documents", "Documentos", original.documents, next.documents],
  ];
  return entries
    .filter(([, , previous, current]) =>
      correctionValuesDiffer(previous, current),
    )
    .map(([field, label, previous, current]) => ({
      field,
      label,
      previous,
      next: current,
    }));
}

function correctionValuesDiffer(previous, next) {
  return JSON.stringify(previous ?? null) !== JSON.stringify(next ?? null);
}

function displayCorrectionValue(value) {
  if (Array.isArray(value)) {
    return value.length
      ? value
          .map((entry) =>
            entry.reference
              ? `${entry.type}: ${entry.reference}`
              : `${entry.alias} (${entry.type === "DIRECTA" ? "Directa" : "Indirecta"})`,
          )
          .join("; ")
      : "Sin registros";
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return value || "Sin dato";
}

function ReviewActions({ item, token, busy, run }) {
  const [verificationReference, setVerificationReference] = useState("");
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [observation, setObservation] = useState(
    "Aclarar la conclusión técnica del informe",
  );
  return (
    <div className="review-actions">
      <fieldset>
        <legend>Verificación antes de aprobar</legend>
        <p>
          Registre la referencia del formulario de verificación firmado o su
          constancia institucional. La homologación del checklist oficial sigue
          pendiente.
        </p>
        <label>
          Constancia del formulario de verificación
          <input
            value={verificationReference}
            onChange={(event) => setVerificationReference(event.target.value)}
          />
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={confirmReviewed}
            onChange={(event) => setConfirmReviewed(event.target.checked)}
          />
          Confirmo que revisé el informe y registré su constancia de
          verificación
        </label>
      </fieldset>
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
          disabled={busy || !confirmReviewed || !verificationReference.trim()}
          onClick={() =>
            run(
              item.id,
              () =>
                apiInvestigationAction(token, item.id, "aprobar-entrega", {
                  verificationReference,
                  confirmReviewed,
                }),
              "Entrega aprobada; pendiente acreditar el envío al defensor",
            )
          }
        >
          Aprobar informe verificado
        </button>
      </div>
    </div>
  );
}

function ProcessStepper({ area, status }) {
  const process = processFor(area, status);
  return (
    <ol
      className="process-stepper"
      aria-label="Estado del proceso"
      style={{ "--process-steps": process.steps.length }}
    >
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

function CaseDetail({ request, item, profile, catalogs, onClose, token }) {
  const [detailTab, setDetailTab] = useState("resumen");
  const closeButtonRef = useRef(null);
  const approvedData = item.applicableRequestData || item.approvedRequestData;
  const approvedItem = approvedData?.items?.find(
    (candidate) => candidate.id === item.id,
  );
  const isVictimsExecutor =
    request.area === "VICTIMAS" &&
    profileHas(profile, CAPABILITIES.EXECUTE_VICTIMS, request.area);
  const showCurrentVictimsInformation = canViewCurrentVictimsInformation(
    profile,
    request.area,
  );
  const primaryExternalId =
    isVictimsExecutor && approvedData
      ? approvedData.externalId
      : request.externalId;
  const primaryServiceLabel =
    isVictimsExecutor && approvedItem
      ? approvedItem.serviceLabel
      : item.serviceLabel;
  const primarySpecialtyLabels =
    isVictimsExecutor && approvedItem
      ? approvedItem.specialtyLabels
      : item.specialtyLabels;
  const assignmentSummary = item.assignment
    ? `${item.assignment.selectedName || "Sin candidato"}. ${item.assignment.selectedReason}`
    : "El reparto automático se ejecutará al cumplirse el hito aplicable.";
  useEffect(() => {
    closeButtonRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function keepFocusInside(event) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary",
      ),
    ).filter((element) => element.getClientRects().length > 0);
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
      <section
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
            <h2 id="case-detail-title">
              {request.displayNumber || request.id}
            </h2>
            {request.displayNumber && (
              <small>Referencia interna: {request.id}</small>
            )}
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

        <nav className="detail-tabs" aria-label="Secciones del encargo">
          <button
            type="button"
            aria-pressed={detailTab === "resumen"}
            onClick={() => setDetailTab("resumen")}
          >
            Resumen
          </button>
          <button
            type="button"
            aria-pressed={detailTab === "documentos"}
            onClick={() => setDetailTab("documentos")}
          >
            Documentos
          </button>
        </nav>
        {detailTab === "documentos" && (
          <WorkspaceDocuments
            token={token}
            area={request.area}
            itemId={item.id}
            intake={
              (isVictimsExecutor
                ? approvedData?.documents
                : request.documents) || []
            }
            version={
              isVictimsExecutor
                ? item.approvedSubmissionVersion
                : request.versions?.at(-1)?.version
            }
          >
            <ProductFiles item={item} token={token} area={request.area} />
          </WorkspaceDocuments>
        )}
        <div hidden={detailTab !== "resumen"}>
          <dl className="detail-facts">
            {request.area === "INVESTIGACION" && (
              <>
                <div>
                  <dt>Fecha de ingreso</dt>
                  <dd>
                    {new Date(request.createdAt).toLocaleString("es-CO", {
                      timeZone: "America/Bogota",
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Vencimiento</dt>
                  <dd>{item.dueDate || "Pendiente de política aprobada"}</dd>
                </div>
                <div>
                  <dt>Constancia de verificación PAG</dt>
                  <dd>{item.verification?.reference || "Sin registrar"}</dd>
                </div>
                <div>
                  <dt>Envío al defensor</dt>
                  <dd>
                    {item.dispatch?.evidence || "Sin constancia de envío"}
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt>Identificador externo</dt>
              <dd>{primaryExternalId}</dd>
            </div>
            <div>
              <dt>Área y servicio</dt>
              <dd>
                {AREA_META[request.area].label} · {primaryServiceLabel}
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
              <dd>{primarySpecialtyLabels?.join(", ") || "Sin dato"}</dd>
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

          {request.area === "VICTIMAS" && showCurrentVictimsInformation && (
            <section className="detail-section">
              <h3>Información vigente de la solicitud</h3>
              <dl className="detail-facts compact-detail-facts">
                <div>
                  <dt>Proceso</dt>
                  <dd>{request.caseData?.processReference || "Sin dato"}</dd>
                </div>
                <div>
                  <dt>Audiencia</dt>
                  <dd>
                    {request.caseData?.hearingApplies
                      ? request.caseData.hearingDate || "Fecha pendiente"
                      : "No aplica"}
                  </dd>
                </div>
                <div>
                  <dt>Hechos</dt>
                  <dd>{request.caseData?.facts || "Sin dato"}</dd>
                </div>
                <div>
                  <dt>Personas</dt>
                  <dd>{request.persons?.length || 0}</dd>
                </div>
              </dl>
              <ul className="document-list">
                {(request.persons || []).map((person, index) => (
                  <li key={`${person.alias}-${index}`}>
                    <strong>{person.alias}</strong>
                    <span>
                      {person.type === "DIRECTA" ? "Directa" : "Indirecta"} ·{" "}
                      {person.relationship || "Sin parentesco"} ·{" "}
                      {person.familyGroup}
                    </span>
                    <small>
                      Contacto: {person.contact?.phone || person.contact?.email}
                    </small>
                  </li>
                ))}
                {(request.documents || []).map((document, index) => (
                  <li key={`${document.type}-${document.reference}-${index}`}>
                    <strong>
                      {catalogEntryLabel(
                        catalogs.victimDocumentTypes,
                        document.type,
                      )}
                    </strong>
                    <span>{document.reference}</span>
                    <IntakeDocumentLink
                      document={document}
                      token={token}
                      area={request.area}
                      itemId={item.id}
                      index={index}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {request.area === "VICTIMAS" &&
            showCurrentVictimsInformation &&
            item.pagObservations?.length > 0 && (
              <section className="detail-section">
                <h3>Observaciones del PAG</h3>
                <ol className="detail-timeline">
                  {item.pagObservations
                    .slice()
                    .reverse()
                    .map((observation, index) => (
                      <li
                        key={`${observation.version}-${observation.at}-${index}`}
                      >
                        <strong>Versión {observation.version} devuelta</strong>
                        <small>
                          {new Date(observation.at).toLocaleString("es-CO", {
                            timeZone: "America/Bogota",
                          })}
                        </small>
                        <p>{observation.observation}</p>
                      </li>
                    ))}
                </ol>
              </section>
            )}

          {request.area === "VICTIMAS" &&
            showCurrentVictimsInformation &&
            item.correctionHistory?.length > 0 && (
              <section className="detail-section">
                <h3>Historial de correcciones y diferencias</h3>
                {item.correctionHistory
                  .slice()
                  .reverse()
                  .map((correction) => (
                    <article
                      className="correction-history-entry"
                      key={correction.version}
                    >
                      <strong>
                        Versión {correction.version} desde versión{" "}
                        {correction.baseVersion}
                      </strong>
                      <small>
                        {new Date(correction.submittedAt).toLocaleString(
                          "es-CO",
                          { timeZone: "America/Bogota" },
                        )}
                      </small>
                      <p>{correction.correctionSummary}</p>
                      <div className="correction-differences">
                        {correction.changes.map((change) => (
                          <article key={change.field}>
                            <strong>{change.label}</strong>
                            <div>
                              <span>
                                <small>Valor anterior</small>
                                {displayCorrectionValue(change.previous)}
                              </span>
                              <span>
                                <small>Valor nuevo</small>
                                {displayCorrectionValue(change.next)}
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </article>
                  ))}
              </section>
            )}

          {request.area === "VICTIMAS" && approvedData && (
            <section className="detail-section approved-data">
              <h3>Datos aprobados aplicables a este encargo</h3>
              <dl className="detail-facts compact-detail-facts">
                <div>
                  <dt>Versión aprobada</dt>
                  <dd>{item.approvedSubmissionVersion}</dd>
                </div>
                <div>
                  <dt>Identificador</dt>
                  <dd>{approvedData.externalId}</dd>
                </div>
                <div>
                  <dt>Proceso</dt>
                  <dd>
                    {approvedData.caseData?.processReference || "Sin dato"}
                  </dd>
                </div>
                <div>
                  <dt>Audiencia</dt>
                  <dd>
                    {approvedData.caseData?.hearingApplies
                      ? approvedData.caseData.hearingDate || "Fecha pendiente"
                      : "No aplica"}
                  </dd>
                </div>
                <div>
                  <dt>Hechos</dt>
                  <dd>{approvedData.caseData?.facts || "Sin dato"}</dd>
                </div>
                <div>
                  <dt>Personas</dt>
                  <dd>{approvedData.persons?.length || 0}</dd>
                </div>
                <div>
                  <dt>Servicio</dt>
                  <dd>{approvedItem?.serviceLabel || "Sin dato"}</dd>
                </div>
                <div>
                  <dt>Especialidad o disciplina</dt>
                  <dd>
                    {approvedItem?.specialtyLabels?.join(", ") || "Sin dato"}
                  </dd>
                </div>
                <div>
                  <dt>Cobertura</dt>
                  <dd>{approvedItem?.regionLabel || "Sin dato"}</dd>
                </div>
                <div>
                  <dt>Ley o programa</dt>
                  <dd>{approvedItem?.lawLabel || "Sin dato"}</dd>
                </div>
                <div>
                  <dt>Documentos</dt>
                  <dd>{approvedData.documents?.length || 0}</dd>
                </div>
              </dl>
              <ul className="document-list">
                {(approvedData.persons || []).map((person, index) => (
                  <li key={`approved-person-${person.alias}-${index}`}>
                    <strong>{person.alias}</strong>
                    <span>
                      {person.type === "DIRECTA" ? "Directa" : "Indirecta"} ·{" "}
                      {person.relationship || "Sin parentesco"} ·{" "}
                      {person.familyGroup}
                    </span>
                    <small>
                      Contacto: {person.contact?.phone || person.contact?.email}
                    </small>
                  </li>
                ))}
                {(approvedData.documents || []).map((document, index) => (
                  <li
                    key={`approved-document-${document.type}-${document.reference}-${index}`}
                  >
                    <strong>{document.typeLabel || document.type}</strong>
                    <span>{document.reference}</span>
                    <IntakeDocumentLink
                      document={document}
                      token={token}
                      area={request.area}
                      itemId={item.id}
                      index={index}
                      version={item.approvedSubmissionVersion}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="detail-section">
            <h3>Explicación resumida de asignación</h3>
            <p>{assignmentSummary}</p>
          </section>

          <section className="detail-section">
            <h3>Productos y versiones</h3>
            <ProductFiles item={item} token={token} area={request.area} />
            {item.documents?.length ? (
              <ul className="document-list">
                {item.documents.map((document) => (
                  <li key={document.id}>
                    <strong>{document.type}</strong>
                    <span>
                      {document.reserved
                        ? "Contenido reservado"
                        : document.reference}{" "}
                      · Versión {document.version} · {document.status}
                    </span>
                    <small>
                      Autor: {document.author || "No disponible"}
                      {document.createdAt
                        ? ` · ${new Date(document.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}`
                        : ""}
                    </small>
                    {document.formatMetadata && (
                      <small>
                        SD-P06-F171 · Informe{" "}
                        {document.formatMetadata.reportNumber} · Entrega{" "}
                        {document.formatMetadata.deliveryDate}
                        {document.formatMetadata.assessmentDate
                          ? ` · Valoración ${document.formatMetadata.assessmentDate}`
                          : ""}
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin referencias documentales registradas en esta etapa.</p>
            )}
          </section>

          {request.area === "VICTIMAS" && (
            <VictimsFormatSummary
              data={isVictimsExecutor ? approvedData : request}
            />
          )}

          {request.area === "INVESTIGACION" &&
            (request.documents || []).length > 0 && (
              <section className="detail-section">
                <h3>Documentos de la solicitud</h3>
                <ul className="detail-timeline">
                  {request.documents.map((document, index) => (
                    <li key={`${document.type}-${index}`}>
                      <strong>{document.type}</strong>
                      <span>{document.reference}</span>
                      <IntakeDocumentLink
                        document={document}
                        token={token}
                        area={request.area}
                        itemId={item.id}
                        index={index}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          {request.versions?.length > 0 &&
            (request.area !== "VICTIMAS" || showCurrentVictimsInformation) && (
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
                          {new Date(version.submittedAt).toLocaleString(
                            "es-CO",
                            {
                              timeZone: "America/Bogota",
                            },
                          )}
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
                    <small>
                      {new Date(event.at).toLocaleString("es-CO", {
                        timeZone: "America/Bogota",
                      })}
                    </small>
                    <p>{event.message}</p>
                  </li>
                ))}
            </ol>
          </section>
        </div>
      </section>
    </div>
  );
}

function ActivityHistory({ item }) {
  if (!item.activities?.length) return null;
  return (
    <details className="activity-history" open>
      <summary>Actuaciones registradas · {item.activities.length}</summary>
      <ol>
        {item.activities
          .slice()
          .reverse()
          .map((activity, index) => (
            <li key={activity.at + "-" + index}>
              <small>
                {new Date(activity.at).toLocaleString("es-CO", {
                  timeZone: "America/Bogota",
                })}
              </small>
              <p>{activity.observation}</p>
            </li>
          ))}
      </ol>
    </details>
  );
}

function ProductFiles({ item, token, area }) {
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const files = (item.products || []).filter((product) => product.attachment);
  if (area === "VICTIMAS" && item.products?.some((product) => product.reserved))
    return (
      <p>
        F171 reservado. Puede consultar su estado, fecha, autor y versión. El
        archivo está disponible para el RJV titular y el perito asignado.
      </p>
    );
  if (!files.length) return null;
  async function download(product) {
    setError("");
    setDownloading(true);
    try {
      const blob = await apiDownloadProduct(token, area, item.id, product.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = product.attachment.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div className="product-files">
      {files
        .slice()
        .reverse()
        .map((product) => (
          <div key={product.id}>
            <strong>
              Versión {product.version} · {product.status}
            </strong>
            {product.attachment.kind === "IRIS" ? (
              <p>
                Radicado IRIS: {product.attachment.reference} · Referencia sin
                verificar; integración pendiente de TICs.
              </p>
            ) : product.attachment.kind === "SHAREPOINT" ? (
              <a
                href={product.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir informe en SharePoint
              </a>
            ) : (
              <button
                type="button"
                disabled={downloading}
                onClick={() => download(product)}
              >
                Descargar PDF · {product.attachment.name}
              </button>
            )}
          </div>
        ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

function ExecutorActions({ item, token, busy, run, area }) {
  const filePolicy = useFilePolicy();
  const [f171, setF171] = useState({
    reportNumber: `F171-${item.id}`,
    assessmentDate: "",
  });
  const [observation, setObservation] = useState("");
  const [reference, setReference] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("REFERENCE");
  const [sharepointUrl, setSharepointUrl] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [activitySubmission, setActivitySubmission] = useState(() =>
    crypto.randomUUID(),
  );
  const [deliverySubmission, setDeliverySubmission] = useState(() =>
    crypto.randomUUID(),
  );
  const action =
    area === "VICTIMAS" ? apiVictimsAction : apiInvestigationAction;
  const complete =
    deliveryMode === "PDF"
      ? !!file
      : deliveryMode === "SHAREPOINT"
        ? !!sharepointUrl.trim()
        : !!reference.trim();
  async function chooseFile(selected) {
    setFile(null);
    setFileError("");
    setDeliverySubmission(crypto.randomUUID());
    if (!selected) return;
    if (
      !/\.pdf$/i.test(selected.name) ||
      selected.size > filePolicy.maxFileBytes ||
      !selected.size
    ) {
      setFileError(
        `Seleccione un PDF con contenido de hasta ${megabytes(filePolicy.maxFileBytes)}`,
      );
      return;
    }
    setReading(true);
    try {
      const contentBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("No fue posible leer el PDF"));
        reader.readAsDataURL(selected);
      });
      setFile({
        name: selected.name,
        mimeType: "application/pdf",
        contentBase64,
      });
    } catch (failure) {
      setFileError(failure.message);
    } finally {
      setReading(false);
    }
  }
  return (
    <div className="executor-actions">
      {feedback && (
        <p className="local-confirmation" role="status">
          {feedback}
        </p>
      )}
      {item.status === "ASIGNADA" && (
        <button
          disabled={busy}
          onClick={() =>
            run(
              item.id,
              () => action(token, item.id, "iniciar"),
              "Encargo iniciado",
              () =>
                setFeedback(
                  "Encargo iniciado. Registre las actuaciones y el producto de su trabajo.",
                ),
            )
          }
        >
          Iniciar
        </button>
      )}
      {item.status === "EN_EJECUCION" && (
        <>
          <div className="execution-panel">
            <label>
              Descripción de la actuación
              <textarea
                aria-label="Descripción de la actuación"
                rows={5}
                maxLength={10000}
                placeholder="Describa la actividad realizada, sus hallazgos y las tareas pendientes."
                value={observation}
                onChange={(event) => {
                  setObservation(event.target.value);
                  setActivitySubmission(crypto.randomUUID());
                }}
              />
            </label>
            <small>
              {observation.length.toLocaleString("es-CO")} / 10.000 caracteres
            </small>
            <button
              disabled={busy || !observation.trim()}
              onClick={() =>
                run(
                  item.id,
                  () =>
                    action(token, item.id, "avance", {
                      observation,
                      submissionId: activitySubmission,
                    }),
                  "Actuación registrada correctamente",
                  () => {
                    setObservation("");
                    setActivitySubmission(crypto.randomUUID());
                    setFeedback(
                      "Actuación registrada. Puede verla en el historial de esta misión.",
                    );
                  },
                )
              }
            >
              Registrar actuación
            </button>
          </div>
          <div className="execution-panel">
            {area === "VICTIMAS" && (
              <div className="wizard-navigation">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMode("PDF");
                    setDeliverySubmission(crypto.randomUUID());
                  }}
                >
                  Cargar archivo F171
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMode("SHAREPOINT");
                    setDeliverySubmission(crypto.randomUUID());
                  }}
                >
                  Ingresar URL de SharePoint
                </button>
              </div>
            )}
            <label>
              Forma de entrega
              <select
                aria-label="Forma de entrega"
                value={deliveryMode}
                onChange={(event) => {
                  setDeliveryMode(event.target.value);
                  setDeliverySubmission(crypto.randomUUID());
                }}
              >
                <option value="REFERENCE">Referencia del documento</option>
                {area === "INVESTIGACION" && (
                  <option value="IRIS">
                    Radicado o expediente IRIS · referencia
                  </option>
                )}
                <option value="SHAREPOINT">Enlace de SharePoint</option>
                <option value="PDF">Cargar PDF</option>
              </select>
            </label>
            {area === "VICTIMAS" && (
              <F171Guidance
                item={item}
                metadata={f171}
                setMetadata={(updater) => {
                  setF171(updater);
                  setDeliverySubmission(crypto.randomUUID());
                }}
              />
            )}
            {deliveryMode === "IRIS" && (
              <label>
                Radicado o expediente IRIS
                <input
                  aria-label="Radicado o expediente IRIS"
                  value={reference}
                  onChange={(event) => {
                    setReference(event.target.value);
                    setDeliverySubmission(crypto.randomUUID());
                  }}
                />
                <small>
                  Se conserva una referencia sin conexión ni validación ante
                  IRIS. No reemplaza el expediente institucional.
                </small>
              </label>
            )}
            {deliveryMode === "REFERENCE" && (
              <label>
                {area === "VICTIMAS"
                  ? "Referencia del F-171"
                  : "Referencia del informe"}
                <input
                  aria-label={
                    area === "VICTIMAS"
                      ? "Referencia del F-171"
                      : "Referencia del informe"
                  }
                  value={reference}
                  placeholder={
                    area === "VICTIMAS" ? "F171-2026-0106" : "INF-2026-0106"
                  }
                  onChange={(event) => {
                    setReference(event.target.value);
                    setDeliverySubmission(crypto.randomUUID());
                  }}
                />
              </label>
            )}
            {deliveryMode === "SHAREPOINT" && (
              <label>
                URL de SharePoint
                <input
                  type="url"
                  aria-label="URL de SharePoint"
                  value={sharepointUrl}
                  placeholder="https://su-organizacion.sharepoint.com/..."
                  onChange={(event) => {
                    setSharepointUrl(event.target.value);
                    setDeliverySubmission(crypto.randomUUID());
                  }}
                />
                <small>
                  Se guarda el enlace. El acceso al archivo depende de sus
                  permisos en SharePoint.
                </small>
              </label>
            )}
            {deliveryMode === "PDF" && (
              <>
                <label>
                  Documento PDF · máximo {megabytes(filePolicy.maxFileBytes)}
                  <input
                    aria-label="Documento PDF"
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={busy || reading}
                    onChange={(event) => chooseFile(event.target.files?.[0])}
                  />
                </label>
                {file && <small>Listo para entregar: {file.name}</small>}
                {fileError && <p role="alert">{fileError}</p>}
              </>
            )}
            <button
              className="primary-demo"
              disabled={busy || reading || !complete}
              onClick={() =>
                run(
                  item.id,
                  () =>
                    action(
                      token,
                      item.id,
                      area === "VICTIMAS" ? "finalizar" : "entregar",
                      {
                        ...(area === "VICTIMAS" ? { f171 } : {}),
                        deliveryMode,
                        reference,
                        f171Reference: reference,
                        sharepointUrl,
                        file,
                        submissionId: deliverySubmission,
                      },
                    ),
                  area === "VICTIMAS"
                    ? "F-171 registrado; servicio pericial cerrado"
                    : "Informe entregado; pendiente aprobación PAG",
                  () =>
                    setFeedback(
                      area === "VICTIMAS"
                        ? "F-171 registrado. El servicio quedó cerrado."
                        : "Informe entregado. Está pendiente de revisión del PAG.",
                    ),
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

function ImprocedenceAction({ item, token, busy, run }) {
  const [form, setForm] = useState({
    reason: "",
    description: "",
    supportReference: "",
    submissionId: crypto.randomUUID(),
  });
  const update = (field) => (event) =>
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
      submissionId: crypto.randomUUID(),
    }));
  return (
    <details className="problem-report">
      <summary>Declarar improcedencia</summary>
      <div className="review-actions">
        <p>
          El perito deja una constancia motivada. El ítem finaliza como
          improcedente y el RJV puede consultar el soporte en su bandeja.
        </p>
        <label>
          Causal de improcedencia
          <input value={form.reason} onChange={update("reason")} />
        </label>
        <label>
          Constancia motivada
          <textarea
            maxLength={10000}
            value={form.description}
            onChange={update("description")}
          />
        </label>
        <label>
          Referencia del soporte de improcedencia
          <input
            value={form.supportReference}
            onChange={update("supportReference")}
          />
        </label>
        <button
          disabled={
            busy ||
            !form.reason.trim() ||
            !form.description.trim() ||
            !form.supportReference.trim()
          }
          onClick={() =>
            run(
              item.id,
              () =>
                apiRegisterOperation(
                  token,
                  "VICTIMAS",
                  item.id,
                  "IMPROCEDENCIA",
                  form,
                ),
              "Improcedencia registrada y disponible para el RJV",
            )
          }
        >
          Registrar improcedencia
        </button>
      </div>
    </details>
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
  if (status === "APROBADO_PENDIENTE_ENVIO") return "EN_EJECUCION";
  if (status === "EN_EJECUCION") return "EN_EJECUCION";
  if (status === "INFORME_ENTREGADO") return "POR_REVISAR";
  if (status === "CERRADA") return "CERRADOS";
  if (status === "IMPROCEDENTE") return "CERRADOS";
  return "PENDIENTES";
}

function processFor(area, status) {
  if (area === "VICTIMAS" && status === "IMPROCEDENTE")
    return {
      steps: [
        "Solicitud",
        "Aprobación previa",
        "Reparto",
        "Constancia de improcedencia",
      ],
      current: 4,
      complete: true,
    };
  const steps =
    area === "INVESTIGACION"
      ? [
          "Solicitud",
          "Reparto",
          "Ejecución",
          "Entrega",
          "Revisión PAG",
          "Envío al defensor",
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
          APROBADO_PENDIENTE_ENVIO: 5,
          PENDIENTE_ENRUTAMIENTO: 1,
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
  if (area === "VICTIMAS" && status === "IMPROCEDENTE")
    return {
      action: "Consultar constancia de improcedencia",
      role: "RJV y perito asignado",
    };
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
        action: "Verificar y aprobar o devolver el informe",
        role: "PAG Investigación",
      },
      APROBADO_PENDIENTE_ENVIO: {
        action: "Acreditar envío del informe al defensor",
        role: "Investigador/a asignado/a",
      },
      PENDIENTE_ENRUTAMIENTO: {
        action: "Enrutar la actividad derivada",
        role: "Gestor central con política vigente",
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
        ["ASIGNADA", "EN_EJECUCION", "APROBADO_PENDIENTE_ENVIO"].includes(
          status,
        )) ||
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

function canViewCurrentVictimsInformation(profile, area) {
  return (
    profileHas(profile, CAPABILITIES.CREATE_VICTIMS, area) ||
    profileHas(profile, CAPABILITIES.APPROVE_VICTIMS, area)
  );
}

function catalogEntryLabel(catalog = [], value) {
  return catalog.find((entry) => entry.id === value)?.label || value;
}
