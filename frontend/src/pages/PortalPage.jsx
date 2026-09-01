import { useEffect, useMemo, useState } from "react";
import {
  apiActualizarAvance,
  apiAprobarReparto,
  apiAsignarRadicado,
  apiBootstrap,
  apiCreateSolicitud,
  apiDevolverRadicado,
  apiEntregarInforme,
  apiIniciarMision,
  apiSolicitarAmpliacion
} from "../api";
import { useAuth } from "../context/AuthContext";

const sectionTitles = {
  dashboard: "Dashboard",
  solicitudes: "Bandeja de Solicitudes",
  misiones: "Misiones Activas",
  reportes: "Reportes",
  catalogo: "Catalogo de Servicios",
  "nueva-solicitud": "Nueva Solicitud de Mision",
  "mis-solicitudes": "Mis Solicitudes",
  "mis-misiones": "Mis Misiones"
};

const navByRole = {
  coordinador: ["dashboard", "solicitudes", "misiones", "reportes", "catalogo"],
  defensor: ["nueva-solicitud", "mis-solicitudes", "catalogo"],
  investigador: ["mis-misiones", "catalogo"],
  administrador: ["dashboard", "solicitudes", "misiones", "reportes", "catalogo"],
  pag: ["solicitudes", "misiones", "reportes", "catalogo"],
  administrativo_delegado: ["solicitudes", "catalogo"],
  defensor_regional: ["solicitudes", "reportes", "catalogo"],
  pag_unidad_operativa: ["solicitudes", "misiones", "catalogo"]
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function Badge({ type, text }) {
  return <span className={`badge badge-${type}`}>{text}</span>;
}

function SemaphoreBadge({ semaphore }) {
  if (!semaphore) return <span className="semaphore semaphore-gris">Sin fecha limite</span>;
  return <span className={`semaphore semaphore-${semaphore.color}`}>{semaphore.label}</span>;
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item) || "Sin dato";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildChartRows(source, labelMap = {}, limit = 6) {
  return Object.entries(source)
    .map(([key, value]) => ({ key, label: labelMap[key] || key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function BarChartPanel({ title, rows, emptyText = "Sin datos para graficar" }) {
  const max = Math.max(...rows.map((row) => row.value), 0);

  return (
    <div className="panel chart-panel">
      <div className="panel-header">{title}</div>
      <div className="bar-chart">
        {rows.length === 0 && <div className="chart-empty">{emptyText}</div>}
        {rows.map((row) => (
          <div className="bar-row" key={row.key}>
            <div className="bar-label">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${max ? Math.max((row.value / max) * 100, 8) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutPanel({ title, items, total }) {
  const palette = {
    verde: "#196b2f",
    amarillo: "#f5b301",
    naranja: "#d8612f",
    rojo: "#b42318",
    gris: "#8a94a6"
  };
  let current = 0;
  const gradient = items.length
    ? items.map((item) => {
        const start = current;
        const end = current + (item.value / Math.max(total, 1)) * 100;
        current = end;
        return `${palette[item.key] || "#2f64ad"} ${start}% ${end}%`;
      }).join(", ")
    : "#edf2f7 0% 100%";

  return (
    <div className="panel chart-panel">
      <div className="panel-header">{title}</div>
      <div className="donut-wrap">
        <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}>
          <span>{total}</span>
        </div>
        <div className="donut-legend">
          {items.map((item) => (
            <span key={item.key}>
              <i style={{ background: palette[item.key] || "#2f64ad" }} />
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusSummaryPanel({ missions }) {
  const cards = [
    {
      key: "radicadas",
      label: "Radicadas",
      value: missions.filter((mission) => ["recibida", "radicada", "en_revision"].includes(mission.status)).length,
      tone: "blue"
    },
    {
      key: "asignadas",
      label: "Asignadas",
      value: missions.filter((mission) => mission.status === "asignada").length,
      tone: "navy"
    },
    {
      key: "en-proceso",
      label: "En Proceso",
      value: missions.filter((mission) => ["en_ejecucion", "solicitud_ampliacion", "ampliacion_aprobada"].includes(mission.status)).length,
      tone: "purple"
    },
    {
      key: "pendientes",
      label: "Pend. Aprob.",
      value: missions.filter((mission) => mission.status === "aprobada_para_reparto").length,
      tone: "gold"
    },
    {
      key: "completadas",
      label: "Completadas",
      value: missions.filter((mission) => ["informe_entregado", "finalizada"].includes(mission.status)).length,
      tone: "green"
    },
    {
      key: "devueltas",
      label: "Devueltas",
      value: missions.filter((mission) => mission.status === "devuelta").length,
      tone: "red"
    }
  ];

  return (
    <div className="panel chart-panel status-panel">
      <div className="panel-header">Radicados por estado</div>
      <div className="status-card-grid">
        {cards.map((card) => (
          <article className={`status-card status-card-${card.tone}`} key={card.key}>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function DashboardCharts({ missions }) {
  const bySemaphore = buildChartRows(
    countBy(missions, (mission) => mission.semaphore?.color || "gris"),
    { verde: "Mas de 7 dias", amarillo: "4 a 7 dias", naranja: "1 a 3 dias", rojo: "Vencido", gris: "Sin fecha" },
    5
  );

  return (
    <div className="management-grid dashboard-grid">
      <StatusSummaryPanel missions={missions} />
      <DonutPanel title="Semaforo de terminos" items={bySemaphore} total={missions.length} />
    </div>
  );
}

function ReportCharts({ missions }) {
  const bySpecialty = buildChartRows(countBy(missions, (mission) => mission.specialty), {}, 6);
  const byRegion = buildChartRows(countBy(missions, (mission) => mission.defenderRegion), {}, 6);
  const byInvestigator = buildChartRows(
    countBy(missions.filter((mission) => mission.investigator !== "Sin asignar"), (mission) => mission.investigator),
    {},
    6
  );

  return (
    <div className="management-grid report-grid">
      <BarChartPanel title="Carga por especialidad" rows={bySpecialty} />
      <BarChartPanel title="Radicados por regional" rows={byRegion} />
      <BarChartPanel title="Carga por investigador" rows={byInvestigator} emptyText="No hay radicados asignados a investigadores" />
    </div>
  );
}

function BrandMark({ className = "" }) {
  return (
    <img
      className={`brand-mark ${className}`.trim()}
      src="https://raw.githubusercontent.com/shcampinof/AuroraV1/main/frontend/public/logo-defensoria.png"
      alt="Logo Defensoria del Pueblo"
      loading="eager"
    />
  );
}

function SummaryCards({ dashboard }) {
  const kpi = dashboard?.kpis;
  if (!kpi) return null;

  return (
    <div className="kpi-grid">
      <article className="kpi-card info">
        <span>Total recibidas</span>
        <strong>{kpi.totalReceived}</strong>
      </article>
      <article className="kpi-card warning">
        <span>Pendientes reparto</span>
        <strong>{kpi.pendingAssignment}</strong>
      </article>
      <article className="kpi-card success">
        <span>Activas</span>
        <strong>{kpi.activeMissions}</strong>
      </article>
      <article className="kpi-card danger">
        <span>Proximas/vencidas</span>
        <strong>{kpi.nearDue}</strong>
      </article>
    </div>
  );
}

function DashboardSection({ missions, dashboard, statusLabels }) {
  const pending = missions.filter((m) => ["recibida", "en_revision", "aprobada_para_reparto"].includes(m.status));

  return (
    <section className="section-stack">
      <SummaryCards dashboard={dashboard} />
      <DashboardCharts missions={missions} />
      <div className="panel">
        <div className="panel-header">Pendientes de reparto</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Radicado</th>
                <th>Mision madre</th>
                <th>Defensor</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th>Semaforo</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((mission) => (
                <tr key={mission.id}>
                  <td>{mission.id}</td>
                  <td>{mission.parentMission}</td>
                  <td>{mission.defender}</td>
                  <td>{mission.specialty}</td>
                  <td>
                    <Badge type={mission.status} text={statusLabels[mission.status]} />
                  </td>
                  <td>
                    <SemaphoreBadge semaphore={mission.semaphore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SolicitudesSection({ missions, statusLabels, statusFlow, token, profile, investigators, onMissionUpdated }) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canOperate = ["coordinador", "administrador", "pag"].includes(profile?.role);

  async function runAction(mission, action) {
    setBusyId(mission.id);
    setMessage("");
    setError("");

    try {
      let response;
      if (action === "aprobar") {
        response = await apiAprobarReparto(token, mission.id);
      }

      if (action === "devolver") {
        const motivo = window.prompt("Motivo de devolucion");
        if (!motivo) return;
        const observacion = window.prompt("Observacion para el defensor");
        if (!observacion) return;
        response = await apiDevolverRadicado(token, mission.id, { motivo, observacion });
      }

      if (action === "asignar-auto") {
        const candidate = investigators.find((item) => item.especialidades.includes(mission.specialtyId));
        if (!candidate) throw new Error("No hay investigador activo para esta especialidad");
        response = await apiAsignarRadicado(token, mission.id, {
          investigador_id: candidate.id,
          tipo_asignacion: "automatica"
        });
      }

      if (action === "asignar-manual") {
        const investigatorId = window.prompt(
          `ID investigador (${investigators.map((item) => `${item.id}: ${item.nombre}`).join(" | ")})`
        );
        if (!investigatorId) return;
        const justificacion = window.prompt("Justificacion de asignacion manual");
        if (!justificacion) return;
        response = await apiAsignarRadicado(token, mission.id, {
          investigador_id: investigatorId,
          tipo_asignacion: "manual",
          justificacion_manual: justificacion,
          asignacion_excepcional: mission.status !== "aprobada_para_reparto"
        });
      }

      if (response?.mission) onMissionUpdated(response.mission);
      if (response?.message) setMessage(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  const filtered = useMemo(() => {
    const text = search.toLowerCase();
    return missions.filter((m) => {
      const byStatus = status ? m.status === status : true;
      const bySearch =
        !text ||
        m.id.toLowerCase().includes(text) ||
        m.parentMission.toLowerCase().includes(text) ||
        m.defender.toLowerCase().includes(text) ||
        m.spoa.includes(text);
      return byStatus && bySearch;
    });
  }, [missions, search, status]);

  return (
    <section className="section-stack">
      <div className="panel">
        <div className="panel-header">Bandeja de solicitudes/radicados</div>
        <div className="filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {statusFlow.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item] || item}
              </option>
            ))}
          </select>
          <input
            placeholder="Buscar por radicado, mision, defensor o SPOA"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {message && <p className="inline-message ok-text">{message}</p>}
        {error && <p className="inline-message error-text">{error}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Radicado</th>
                <th>Mision</th>
                <th>Fecha</th>
                <th>Defensor</th>
                <th>SPOA</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Semaforo</th>
                {canOperate && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((mission) => (
                <tr key={mission.id}>
                  <td>{mission.id}</td>
                  <td>{mission.parentMission}</td>
                  <td>{formatDate(mission.date)}</td>
                  <td>{mission.defender}</td>
                  <td>{mission.spoa}</td>
                  <td>{mission.specialty}</td>
                  <td>
                    <Badge type={mission.status} text={statusLabels[mission.status]} />
                  </td>
                  <td>
                    <Badge type={mission.priority} text={mission.priority} />
                  </td>
                  <td>
                    <SemaphoreBadge semaphore={mission.semaphore} />
                  </td>
                  {canOperate && (
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={() => runAction(mission, "aprobar")} disabled={busyId === mission.id || mission.status === "aprobada_para_reparto"}>
                          Aprobar
                        </button>
                        <button type="button" onClick={() => runAction(mission, "asignar-auto")} disabled={busyId === mission.id}>
                          Auto
                        </button>
                        <button type="button" onClick={() => runAction(mission, "asignar-manual")} disabled={busyId === mission.id}>
                          Manual
                        </button>
                        <button type="button" onClick={() => runAction(mission, "devolver")} disabled={busyId === mission.id}>
                          Devolver
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function MisionesSection({ missions, statusLabels }) {
  const active = missions.filter((m) => ["asignada", "en_ejecucion", "solicitud_ampliacion", "ampliacion_aprobada"].includes(m.status));

  return (
    <section className="section-stack">
      <div className="panel">
        <div className="panel-header">Misiones activas por radicado</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Radicado</th>
                <th>Especialidad</th>
                <th>Investigador</th>
                <th>Fecha limite</th>
                <th>Estado</th>
                <th>Semaforo</th>
                <th>Progreso</th>
              </tr>
            </thead>
            <tbody>
              {active.map((mission) => (
                <tr key={mission.id}>
                  <td>{mission.id}</td>
                  <td>{mission.specialty}</td>
                  <td>{mission.investigator}</td>
                  <td>{mission.dueDate ? formatDate(mission.dueDate) : "Pendiente"}</td>
                  <td>
                    <Badge type={mission.status} text={statusLabels[mission.status]} />
                  </td>
                  <td>
                    <SemaphoreBadge semaphore={mission.semaphore} />
                  </td>
                  <td>
                    <div className="progress-row">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${mission.progress}%` }} />
                      </div>
                      <span>{mission.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ReportesSection({ missions }) {
  const totals = {
    total: missions.length,
    urgentes: missions.filter((m) => m.priority === "urgente").length,
    vencidas: missions.filter((m) => m.semaphore?.color === "rojo").length,
    enEjecucion: missions.filter((m) => m.status === "en_ejecucion").length
  };

  return (
    <section className="section-stack">
      <div className="kpi-grid">
        <article className="kpi-card info">
          <span>Total radicados</span>
          <strong>{totals.total}</strong>
        </article>
        <article className="kpi-card warning">
          <span>Urgentes</span>
          <strong>{totals.urgentes}</strong>
        </article>
        <article className="kpi-card danger">
          <span>Vencidas</span>
          <strong>{totals.vencidas}</strong>
        </article>
        <article className="kpi-card success">
          <span>En ejecucion</span>
          <strong>{totals.enEjecucion}</strong>
        </article>
      </div>
      <ReportCharts missions={missions} />
    </section>
  );
}

function CatalogSection({ specialties }) {
  const [search, setSearch] = useState("");

  const filtered = specialties.filter((item) =>
    item.nombre.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <section className="section-stack">
      <div className="panel">
        <div className="panel-header">Catalogo de servicios configurable</div>
        <div className="filters">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar especialidad"
          />
        </div>
        <div className="catalog-grid">
          {filtered.map((item) => (
            <details key={item.id} className="catalog-item">
              <summary>
                <div>
                  <strong>
                    {item.id}. {item.nombre}
                  </strong>
                  <p>{item.descripcion}</p>
                </div>
                <Badge type="asignada" text={`${item.dias_respuesta} dias`} />
              </summary>
              <div className="catalog-body">
                <h4>Servicios disponibles</h4>
                <ul>{item.servicios_disponibles.map((s) => <li key={s}>{s}</li>)}</ul>
                <h4>Informacion requerida</h4>
                <ul>{item.informacion_requerida.map((s) => <li key={s}>{s}</li>)}</ul>
                <h4>No disponible</h4>
                <ul>{item.servicios_no_disponibles.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function MisSolicitudesSection({ missions, statusLabels }) {
  return (
    <section className="cards-grid">
      {missions.map((mission) => (
        <article key={mission.id} className="mission-card">
          <div className="mission-card-top">
            <strong>{mission.id}</strong>
            <Badge type={mission.status} text={statusLabels[mission.status]} />
          </div>
          <p>{mission.specialty}</p>
          <small>Mision madre: {mission.parentMission}</small>
          <small>SPOA: {mission.spoa}</small>
          <small>Semaforo: {mission.semaphore?.label || "Sin fecha"}</small>
        </article>
      ))}
    </section>
  );
}

function MisMisionesSection({ missions, statusLabels, token, profile, onMissionUpdated }) {
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const visibleStatuses = ["asignada", "en_ejecucion", "solicitud_ampliacion", "ampliacion_aprobada", "informe_entregado"];
  const mine = missions.filter((mission) =>
    visibleStatuses.includes(mission.status) &&
    (!profile?.investigatorId || mission.investigatorId === profile.investigatorId)
  );
  const totals = {
    active: mine.filter((mission) => ["asignada", "en_ejecucion", "ampliacion_aprobada"].includes(mission.status)).length,
    nearDue: mine.filter((mission) => ["amarillo", "naranja", "rojo"].includes(mission.semaphore?.color)).length,
    delivered: mine.filter((mission) => mission.status === "informe_entregado").length
  };

  async function runMissionAction(mission, action) {
    setBusyId(mission.id);
    setMessage("");
    setError("");

    try {
      let response;

      if (action === "iniciar") {
        response = await apiIniciarMision(token, mission.id);
      }

      if (action === "avance") {
        const porcentaje = Number(window.prompt("Porcentaje de avance (0 a 100)", String(mission.progress || 0)));
        if (!Number.isFinite(porcentaje)) return;
        const observacion = window.prompt("Observacion de avance");
        if (!observacion) return;
        response = await apiActualizarAvance(token, mission.id, { porcentaje, observacion });
      }

      if (action === "informe") {
        const titulo = window.prompt("Titulo del informe");
        if (!titulo) return;
        const referencia = window.prompt("Referencia SGDEA/IRIS del informe");
        if (!referencia) return;
        const conclusiones = window.prompt("Conclusiones o resumen de entrega");
        if (!conclusiones) return;
        response = await apiEntregarInforme(token, mission.id, { titulo, referencia, conclusiones });
      }

      if (response?.mission) onMissionUpdated(response.mission);
      if (response?.message) setMessage(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function requestExtension(mission) {
    setBusyId(mission.id);
    setMessage("");
    setError("");

    try {
      const argumentacion = window.prompt("Argumentacion de la ampliacion");
      if (!argumentacion) return;
      const days = Number(window.prompt("Dias adicionales solicitados"));
      if (!Number.isFinite(days) || days <= 0) throw new Error("Ingrese dias adicionales validos");

      const response = await apiSolicitarAmpliacion(token, mission.id, {
        argumentacion,
        dias_adicionales: days
      });
      if (response?.mission) onMissionUpdated(response.mission);
      if (response?.message) setMessage(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="section-stack">
      <div className="kpi-grid investigator-kpis">
        <article className="kpi-card info">
          <span>Misiones activas</span>
          <strong>{totals.active}</strong>
        </article>
        <article className="kpi-card warning">
          <span>Proximas/vencidas</span>
          <strong>{totals.nearDue}</strong>
        </article>
        <article className="kpi-card success">
          <span>Informes entregados</span>
          <strong>{totals.delivered}</strong>
        </article>
      </div>
      {message && <p className="inline-message ok-text">{message}</p>}
      {error && <p className="inline-message error-text">{error}</p>}

      <div className="investigator-grid">
        {mine.map((mission) => (
          <article key={mission.id} className="mission-card investigator-card">
            <div className="mission-card-top">
              <div>
                <strong>{mission.id}</strong>
                <p>{mission.specialty}</p>
              </div>
              <div className="badge-stack">
                <Badge type={mission.status} text={statusLabels[mission.status]} />
                <SemaphoreBadge semaphore={mission.semaphore} />
              </div>
            </div>

            <div className="mission-meta-grid">
              <span><strong>Defensor</strong>{mission.defender}</span>
              <span><strong>Regional</strong>{mission.defenderRegion}</span>
              <span><strong>SPOA</strong>{mission.spoa}</span>
              <span><strong>Limite</strong>{mission.dueDate ? formatDate(mission.dueDate) : "Pendiente"}</span>
              <span><strong>Termino</strong>{mission.daysResponse || "-"} dias</span>
              <span><strong>Asignacion</strong>{mission.assignmentType || "-"}</span>
            </div>

            <div className="progress-row">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${mission.progress}%` }} />
              </div>
              <span>{mission.progress}%</span>
            </div>

            <details className="mission-detail">
              <summary>Documentacion y caso</summary>
              <div className="detail-block">
                <strong>Hechos</strong>
                <p>{mission.caseInfo?.hechos || "Sin resumen registrado"}</p>
                <strong>Hipotesis</strong>
                <p>{mission.caseInfo?.hipotesis || "Sin hipotesis registrada"}</p>
                <strong>Documentos asociados</strong>
                <ul>
                  {(mission.documents || []).map((doc) => (
                    <li key={`${mission.id}-${doc.referencia}-${doc.nombre}`}>
                      {doc.nombre} - {doc.tipo} - {doc.referencia}
                    </li>
                  ))}
                </ul>
              </div>
            </details>

            <details className="mission-detail">
              <summary>Historial</summary>
              <ol className="history-list">
                {(mission.history || []).slice().reverse().map((item) => (
                  <li key={`${mission.id}-${item.fecha}-${item.evento}`}>
                    <strong>{statusLabels[item.evento] || item.evento}</strong>
                    <span>{new Date(item.fecha).toLocaleString("es-CO")}</span>
                    <p>{item.detalle}</p>
                  </li>
                ))}
              </ol>
            </details>

            {mission.report && (
              <div className="report-box">
                <strong>Informe entregado</strong>
                <span>{mission.report.titulo} - {mission.report.referencia}</span>
              </div>
            )}

            <div className="mission-actions">
              <button type="button" className="secondary-outline compact-btn" onClick={() => runMissionAction(mission, "iniciar")} disabled={busyId === mission.id || mission.status !== "asignada"}>
                Iniciar
              </button>
              <button type="button" className="secondary-outline compact-btn" onClick={() => runMissionAction(mission, "avance")} disabled={busyId === mission.id || ["informe_entregado", "finalizada"].includes(mission.status)}>
                Actualizar avance
              </button>
              <button type="button" className="secondary-outline compact-btn" onClick={() => requestExtension(mission)} disabled={busyId === mission.id || ["solicitud_ampliacion", "informe_entregado", "finalizada"].includes(mission.status)}>
                Solicitar ampliacion
              </button>
              <button type="button" className="primary-btn compact-btn" onClick={() => runMissionAction(mission, "informe")} disabled={busyId === mission.id || !["asignada", "en_ejecucion", "ampliacion_aprobada"].includes(mission.status)}>
                Entregar informe
              </button>
            </div>
          </article>
        ))}
      </div>
      {mine.length === 0 && <div className="panel empty-state">No hay misiones asignadas a este investigador.</div>}
    </section>
  );
}

function NuevaSolicitudSection({ specialties, processStages, token, onCreated }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMessage, setOkMessage] = useState("");
  const [selected, setSelected] = useState([]);
  const stepLabels = [
    "Informacion defensor",
    "Usuario procesado",
    "Informacion proceso",
    "Servicios solicitados",
    "Tramite y documentos",
    "Confirmacion"
  ];

  const [form, setForm] = useState({
    defensorNombre: "",
    defensorTelefono: "",
    defensorCorreoInstitucional: "",
    defensorRegionalOrigen: "",
    defensorPagSupervisor: "",
    procesadoNombresApellidos: "",
    procesadoDocumento: "",
    procesadoDireccion: "",
    procesadoTelefono: "",
    casoSpoa: "",
    casoDelito: "",
    casoEtapa: "",
    casoFechaProximaAudiencia: "",
    solicitudRegionalServicio: "",
    solicitudBreveRelacionHechos: "",
    solicitudHipotesis: "",
    solicitudObservaciones: "",
    solicitudPrioridad: "normal",
    solicitudEsUrgente: false,
    solicitudCausalUrgencia: "",
    solicitudTipoTramite: "asignacion_normal",
    firmaOsndp: false
  });

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleSpec(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function next() {
    setError("");
    if (step === 4 && selected.length === 0) {
      setError("Debe seleccionar al menos una especialidad");
      return;
    }
    if (step < 6) setStep((prev) => prev + 1);
  }

  function prev() {
    setError("");
    if (step > 1) setStep((prev) => prev - 1);
  }

  async function submit() {
    setSaving(true);
    setError("");
    setOkMessage("");

    try {
      const payload = {
        defensor: {
          nombre: form.defensorNombre,
          telefono: form.defensorTelefono,
          correo_institucional: form.defensorCorreoInstitucional,
          regional_origen: form.defensorRegionalOrigen,
          pag_supervisor: form.defensorPagSupervisor
        },
        procesado: {
          nombres_apellidos: form.procesadoNombresApellidos,
          documento: form.procesadoDocumento,
          direccion_residencia: form.procesadoDireccion,
          telefono_movil: form.procesadoTelefono
        },
        caso: {
          spoa: form.casoSpoa,
          delito: form.casoDelito,
          etapa_procesal: form.casoEtapa,
          fecha_proxima_audiencia: form.casoFechaProximaAudiencia
        },
        solicitud: {
          regional_servicio: form.solicitudRegionalServicio,
          breve_relacion_hechos: form.solicitudBreveRelacionHechos,
          hipotesis: form.solicitudHipotesis,
          observaciones: form.solicitudObservaciones,
          prioridad: form.solicitudPrioridad,
          es_urgente: form.solicitudEsUrgente,
          causal_urgencia: form.solicitudCausalUrgencia,
          tipo_tramite: form.solicitudTipoTramite
        },
        especialidades: selected,
        firma_osndp: form.firmaOsndp
      };

      const response = await apiCreateSolicitud(token, payload);
      setOkMessage(response.message);
      onCreated(response.missions || []);
      setStep(1);
      setSelected([]);
      setForm({
        defensorNombre: "",
        defensorTelefono: "",
        defensorCorreoInstitucional: "",
        defensorRegionalOrigen: "",
        defensorPagSupervisor: "",
        procesadoNombresApellidos: "",
        procesadoDocumento: "",
        procesadoDireccion: "",
        procesadoTelefono: "",
        casoSpoa: "",
        casoDelito: "",
        casoEtapa: "",
        casoFechaProximaAudiencia: "",
        solicitudRegionalServicio: "",
        solicitudBreveRelacionHechos: "",
        solicitudHipotesis: "",
        solicitudObservaciones: "",
        solicitudPrioridad: "normal",
        solicitudEsUrgente: false,
        solicitudCausalUrgencia: "",
        solicitudTipoTramite: "asignacion_normal",
        firmaOsndp: false
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const selectedNames = specialties
    .filter((item) => selected.includes(item.id))
    .map((item) => item.nombre);

  return (
    <section className="section-stack">
      <div className="panel">
        <div className="panel-header">Nueva solicitud alineada con SD-P03-F04</div>

        <div className="wizard-steps">
          {stepLabels.map((label, index) => {
            const item = index + 1;
            return (
              <span key={label} className={item === step ? "active" : item < step ? "done" : ""}>
                {label}
              </span>
            );
          })}
        </div>

        {step === 1 && (
          <div className="wizard-grid">
            <input placeholder="Defensor publico (obligatorio)" value={form.defensorNombre} onChange={(e) => update("defensorNombre", e.target.value)} />
            <input placeholder="Telefono defensor (numerico)" value={form.defensorTelefono} onChange={(e) => update("defensorTelefono", e.target.value)} />
            <input placeholder="Correo institucional @defensoria.gov.co" value={form.defensorCorreoInstitucional} onChange={(e) => update("defensorCorreoInstitucional", e.target.value)} />
            <input placeholder="Regional de origen" value={form.defensorRegionalOrigen} onChange={(e) => update("defensorRegionalOrigen", e.target.value)} />
            <input placeholder="PAG supervisor del operador" value={form.defensorPagSupervisor} onChange={(e) => update("defensorPagSupervisor", e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div className="wizard-grid">
            <input placeholder="Nombres y apellidos usuario/procesado" value={form.procesadoNombresApellidos} onChange={(e) => update("procesadoNombresApellidos", e.target.value)} />
            <input placeholder="Documento usuario (opcional)" value={form.procesadoDocumento} onChange={(e) => update("procesadoDocumento", e.target.value)} />
            <input placeholder="Direccion residencia (opcional)" value={form.procesadoDireccion} onChange={(e) => update("procesadoDireccion", e.target.value)} />
            <input placeholder="Telefono usuario (opcional)" value={form.procesadoTelefono} onChange={(e) => update("procesadoTelefono", e.target.value)} />
          </div>
        )}

        {step === 3 && (
          <div className="wizard-grid">
            <input placeholder="SPOA 21 digitos" value={form.casoSpoa} onChange={(e) => update("casoSpoa", e.target.value)} />
            <input placeholder="Delito" value={form.casoDelito} onChange={(e) => update("casoDelito", e.target.value)} />
            <select value={form.casoEtapa} onChange={(e) => update("casoEtapa", e.target.value)}>
              <option value="">Seleccione etapa procesal</option>
              {processStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <input type="date" value={form.casoFechaProximaAudiencia} onChange={(e) => update("casoFechaProximaAudiencia", e.target.value)} />
            <input placeholder="Regional donde se asigna el servicio" value={form.solicitudRegionalServicio} onChange={(e) => update("solicitudRegionalServicio", e.target.value)} />
            <textarea
              placeholder="Breve relacion de los hechos"
              value={form.solicitudBreveRelacionHechos}
              onChange={(e) => update("solicitudBreveRelacionHechos", e.target.value)}
            />
            <textarea
              placeholder="Hipotesis de la defensa"
              value={form.solicitudHipotesis}
              onChange={(e) => update("solicitudHipotesis", e.target.value)}
            />
          </div>
        )}

        {step === 4 && (
          <div className="spec-grid">
            {specialties.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => toggleSpec(item.id)}
                className={selected.includes(item.id) ? "spec-item selected" : "spec-item"}
              >
                <strong>{item.nombre}</strong>
                <small>{item.tipo_servicio} - {item.dias_respuesta} dias</small>
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="wizard-grid">
            <select value={form.solicitudTipoTramite} onChange={(e) => update("solicitudTipoTramite", e.target.value)}>
              <option value="asignacion_normal">Asignacion normal</option>
              <option value="utilidad_publica">Utilidad publica / Ley 2292</option>
            </select>
            <select value={form.solicitudPrioridad} onChange={(e) => update("solicitudPrioridad", e.target.value)}>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.solicitudEsUrgente}
                onChange={(e) => update("solicitudEsUrgente", e.target.checked)}
              />
              Marcar como urgente/prioritaria
            </label>
            {form.solicitudEsUrgente && (
              <input
                placeholder="Causal de urgencia (obligatoria)"
                value={form.solicitudCausalUrgencia}
                onChange={(e) => update("solicitudCausalUrgencia", e.target.value)}
              />
            )}
            <textarea
              placeholder="Observaciones adicionales"
              value={form.solicitudObservaciones}
              onChange={(e) => update("solicitudObservaciones", e.target.value)}
            />
          </div>
        )}

        {step === 6 && (
          <div className="summary-block">
            <p><strong>Defensor:</strong> {form.defensorNombre || "-"}</p>
            <p><strong>SPOA:</strong> {form.casoSpoa || "-"}</p>
            <p><strong>Etapa:</strong> {form.casoEtapa || "-"}</p>
            <p><strong>Especialidades:</strong> {selectedNames.join(", ") || "-"}</p>
            <p><strong>Tramite:</strong> {form.solicitudTipoTramite}</p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.firmaOsndp}
                onChange={(e) => update("firmaOsndp", e.target.checked)}
              />
              Firma/certificacion OSNDP
            </label>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}
        {okMessage && <p className="ok-text">{okMessage}</p>}

        <div className="wizard-actions">
          <button type="button" className="secondary-outline" onClick={prev} disabled={step === 1 || saving}>
            Anterior
          </button>
          {step < 6 ? (
            <button type="button" className="primary-btn" onClick={next} disabled={saving}>
              Siguiente
            </button>
          ) : (
            <button type="button" className="primary-btn" onClick={submit} disabled={saving}>
              {saving ? "Enviando..." : "Enviar solicitud"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function PortalPage() {
  const { profile, token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = profile?.role;
  const menu = data?.sections?.length ? data.sections : navByRole[role] || [];
  const menuKey = menu.join("|");
  const [activeSection, setActiveSection] = useState(menu[0] || "dashboard");

  useEffect(() => {
    setActiveSection(menu[0] || "dashboard");
  }, [role, menuKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiBootstrap(token)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return <div className="screen-loader">Cargando portal...</div>;
  if (error) return <div className="screen-loader">{error}</div>;

  const missions = data?.missions || [];
  const specialties = data?.specialties || [];
  const statusLabels = data?.statusLabels || {};
  const statusFlow = data?.statusFlow || [];
  const processStages = data?.processStages || [];

  function handleCreatedMissions(newMissions) {
    if (!Array.isArray(newMissions) || newMissions.length === 0) return;
    setData((prev) => {
      if (!prev) return prev;
      const nextMissions = [...newMissions, ...prev.missions];
      return {
        ...prev,
        missions: nextMissions
      };
    });
  }

  function handleMissionUpdated(updatedMission) {
    setData((prev) => {
      if (!prev) return prev;
      const exists = prev.missions.some((mission) => mission.id === updatedMission.id);
      const missions = exists
        ? prev.missions.map((mission) => (mission.id === updatedMission.id ? updatedMission : mission))
        : [updatedMission, ...prev.missions];
      return { ...prev, missions };
    });
  }

  return (
    <div className="portal-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <BrandMark className="sidebar-logo" />
          <small>Republica de Colombia</small>
          <strong>Defensoria del Pueblo</strong>
          <span>{profile?.roleLabel}</span>
        </div>

        <nav>
          {menu.map((item) => (
            <button
              key={item}
              className={activeSection === item ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveSection(item)}
            >
              {sectionTitles[item]}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div>{profile?.initials}</div>
          <article>
            <strong>{profile?.fullName}</strong>
            <span>{profile?.email}</span>
          </article>
        </div>
      </aside>

      <main className="portal-main">
        <header className="portal-header">
          <div className="portal-title">
            <BrandMark className="header-logo" />
            <div>
              <h1>{sectionTitles[activeSection] || "Portal"}</h1>
              <p>Inicio / {sectionTitles[activeSection] || "Portal"}</p>
            </div>
          </div>
          <button className="secondary-outline" onClick={logout}>
            Cerrar sesion
          </button>
        </header>

        <div className="portal-content">
          {activeSection === "dashboard" && (
            <DashboardSection
              missions={missions}
              statusLabels={statusLabels}
              dashboard={data.dashboard}
            />
          )}
          {activeSection === "solicitudes" && (
            <SolicitudesSection
              missions={missions}
              statusLabels={statusLabels}
              statusFlow={statusFlow}
              token={token}
              profile={profile}
              investigators={data.investigators || []}
              onMissionUpdated={handleMissionUpdated}
            />
          )}
          {activeSection === "misiones" && (
            <MisionesSection missions={missions} statusLabels={statusLabels} />
          )}
          {activeSection === "reportes" && <ReportesSection missions={missions} />}
          {activeSection === "catalogo" && <CatalogSection specialties={specialties} />}
          {activeSection === "mis-solicitudes" && (
            <MisSolicitudesSection missions={missions} statusLabels={statusLabels} />
          )}
          {activeSection === "mis-misiones" && (
            <MisMisionesSection
              missions={missions}
              statusLabels={statusLabels}
              token={token}
              profile={profile}
              onMissionUpdated={handleMissionUpdated}
            />
          )}
          {activeSection === "nueva-solicitud" && (
            <NuevaSolicitudSection
              specialties={specialties}
              processStages={processStages}
              token={token}
              onCreated={handleCreatedMissions}
            />
          )}
        </div>
      </main>
    </div>
  );
}
