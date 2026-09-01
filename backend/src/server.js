import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  PROCESS_STAGES,
  PRIORITIES,
  STATUS_FLOW,
  STATUS_LABELS,
  addCalendarDays,
  buildDashboardData,
  buildMissionView,
  calculateDaysByRule,
  investigators,
  nextMissionNumber,
  radicados,
  roleSections,
  solicitudesMadre,
  specialties,
  users as seedUsers
} from "./data.js";

loadEnvFile(path.resolve(process.cwd(), "../.env"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "mesa-atencion-secret-dev";
const DEMO_ACCOUNTS_ENABLED = envFlag("ENABLE_DEMO_ACCOUNTS", true);
const ROLE_FLAGS = {
  administrador: "ENABLE_ROLE_ADMINISTRADOR",
  coordinador: "ENABLE_ROLE_COORDINADOR",
  pag: "ENABLE_ROLE_PAG",
  administrativo_delegado: "ENABLE_ROLE_ADMINISTRATIVO_DELEGADO",
  defensor: "ENABLE_ROLE_DEFENSOR",
  investigador: "ENABLE_ROLE_INVESTIGADOR",
  defensor_regional: "ENABLE_ROLE_DEFENSOR_REGIONAL",
  pag_unidad_operativa: "ENABLE_ROLE_PAG_UNIDAD_OPERATIVA"
};
const enabledRoles = new Set(
  Object.entries(ROLE_FLAGS)
    .filter(([, flag]) => envFlag(flag, true))
    .map(([role]) => role)
);
const users = buildRuntimeUsers();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origen no permitido por CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "5mb" }));

const preAuthSessions = new Map();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function envFlag(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return ["1", "true", "yes", "on", "si"].includes(String(value).toLowerCase());
}

function roleLabel(role) {
  const labels = {
    administrador: "Administrador del sistema",
    coordinador: "Coordinador GID",
    pag: "Profesional Administrativo y de Gestion",
    administrativo_delegado: "Administrativo delegado",
    defensor: "Defensor Publico",
    investigador: "Investigador",
    defensor_regional: "Defensor Regional",
    pag_unidad_operativa: "PAG unidad operativa"
  };
  return labels[role] || role;
}

function initialsFromName(name) {
  return String(name || "Usuario")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function buildRuntimeUsers() {
  if (!DEMO_ACCOUNTS_ENABLED) return [];

  const cloned = seedUsers.map((user) => ({
    ...user,
    accounts: user.accounts.map((account) => ({ ...account }))
  }));

  const admin = cloned.find((user) => user.document === "admin");
  if (admin) {
    admin.document = process.env.DEMO_ADMIN_USER || "admin";
    admin.password = process.env.DEMO_ADMIN_PASSWORD || "admin";
    admin.fullName = process.env.DEMO_ADMIN_NAME || admin.fullName;
  }

  const genericRole = process.env.DEMO_USER_ROLE || "defensor";
  if (enabledRoles.has(genericRole)) {
    const genericName = process.env.DEMO_USER_NAME || "Usuario Demo";
    cloned.push({
      id: "u-env-generic",
      document: process.env.DEMO_USER_USERNAME || "user",
      password: process.env.DEMO_USER_PASSWORD || "user",
      fullName: genericName,
      accounts: [
        {
          id: "acc-env-generic",
          email: process.env.DEMO_USER_EMAIL || "usuario.demo@defensoria.gov.co",
          role: genericRole,
          roleLabel: roleLabel(genericRole),
          initials: initialsFromName(genericName)
        }
      ]
    });
  }

  return cloned
    .map((user) => ({
      ...user,
      accounts: user.accounts.filter((account) => enabledRoles.has(account.role))
    }))
    .filter((user) => user.accounts.length > 0);
}

function signAccessToken(payload, remember) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: remember ? "30d" : "8h"
  });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token requerido" });
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token invalido o expirado" });
  }
}

function ensureRoles(allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.auth.role)) {
      return res.status(403).json({ message: "No tiene permisos para esta accion" });
    }
    next();
  };
}

function findSpecialtiesByIds(ids) {
  return ids
    .map((id) => specialties.find((item) => item.id === Number(id) && item.activo))
    .filter(Boolean);
}

function isInstitutionalEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@defensoria\.gov\.co$/.test(value);
}

function isNumeric(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function isSpoaValid(value) {
  return /^\d{21}$/.test(String(value || "").trim());
}

function normalizePriority(value, isUrgent) {
  if (isUrgent) return "urgente";
  if (PRIORITIES.includes(value)) return value;
  return "normal";
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function appendHistory(radicado, event, detail) {
  radicado.historial.push({ evento: event, fecha: nowIso(), detalle: detail });
}

function canInvestigatorOperate(req, radicado) {
  if (req.auth.role !== "investigador") return true;
  return Boolean(req.auth.investigatorId && radicado.investigador_id === req.auth.investigatorId);
}

function missionResponse(row, message) {
  return {
    message,
    mission: buildMissionView().find((m) => m.id === row.numero_radicado)
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "mesa-atencion-api" });
});

app.post("/api/auth/login", (req, res) => {
  const { document, password, remember = false } = req.body || {};

  if (!document || !password) {
    return res.status(400).json({ message: "Documento y contrasena son obligatorios" });
  }

  const user = users.find((item) => item.document === String(document).trim());
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Credenciales invalidas" });
  }

  const preAuthToken = crypto.randomUUID();
  preAuthSessions.set(preAuthToken, {
    userId: user.id,
    remember,
    createdAt: Date.now()
  });

  const accounts = user.accounts.map((acc) => ({
    id: acc.id,
    email: acc.email,
    role: acc.role,
    roleLabel: acc.roleLabel
  }));

  return res.json({
    preAuthToken,
    accounts,
    user: {
      id: user.id,
      fullName: user.fullName,
      document: user.document
    }
  });
});

app.post("/api/auth/select-account", (req, res) => {
  const { preAuthToken, accountId } = req.body || {};

  const session = preAuthSessions.get(preAuthToken);
  if (!session) {
    return res.status(401).json({ message: "Sesion de preautenticacion vencida" });
  }

  const user = users.find((item) => item.id === session.userId);
  const account = user?.accounts.find((acc) => acc.id === accountId);

  if (!user || !account) {
    return res.status(404).json({ message: "Cuenta no encontrada" });
  }

  const accessToken = signAccessToken(
    {
      sub: user.id,
      accountId: account.id,
      role: account.role,
      email: account.email,
      fullName: user.fullName,
      initials: account.initials,
      investigatorId: account.investigatorId || null
    },
    session.remember
  );

  preAuthSessions.delete(preAuthToken);

  return res.json({
    accessToken,
    profile: {
      fullName: user.fullName,
      document: user.document,
      role: account.role,
      roleLabel: account.roleLabel,
      email: account.email,
      initials: account.initials,
      investigatorId: account.investigatorId || null
    }
  });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((item) => item.id === req.auth.sub);
  const account = user?.accounts.find((acc) => acc.id === req.auth.accountId);

  if (!user || !account) {
    return res.status(404).json({ message: "Sesion no valida" });
  }

  res.json({
    profile: {
      fullName: user.fullName,
      document: user.document,
      role: account.role,
      roleLabel: account.roleLabel,
      email: account.email,
      initials: account.initials,
      investigatorId: account.investigatorId || null
    }
  });
});

app.get("/api/bootstrap", authMiddleware, (req, res) => {
  const role = req.auth.role;
  const missionView = buildMissionView();
  const dashboard = buildDashboardData(missionView);

  res.json({
    role,
    enabledRoles: [...enabledRoles],
    sections: roleSections[role] ?? [],
    dashboard,
    specialties,
    investigators,
    missions: missionView,
    statusFlow: STATUS_FLOW,
    statusLabels: STATUS_LABELS,
    priorities: PRIORITIES,
    processStages: PROCESS_STAGES,
    rules: {
      semaforo: {
        verde: "Mas de 7 dias",
        amarillo: "4 a 7 dias",
        naranja: "1 a 3 dias",
        rojo: "Termino vencido"
      },
      tiempos: {
        investigacion_campo: 25,
        pericial: 45,
        utilidad_publica_investigacion_campo: 15
      },
      integraciones: "SIMULADAS - pendiente SGDEA/IRIS y correo"
    }
  });
});

app.post("/api/solicitudes", authMiddleware, ensureRoles(["defensor", "coordinador", "administrador"]), (req, res) => {
  const payload = req.body || {};
  const defensor = payload.defensor || {};
  const procesado = payload.procesado || {};
  const caso = payload.caso || {};
  const solicitud = payload.solicitud || {};

  const selectedSpecialties = findSpecialtiesByIds(payload.especialidades || []);

  if (!sanitizeText(defensor.nombre)) return res.status(400).json({ message: "Nombre del defensor es obligatorio" });
  if (!isNumeric(defensor.telefono)) return res.status(400).json({ message: "Telefono del defensor debe ser numerico" });
  if (!isInstitutionalEmail(defensor.correo_institucional)) {
    return res.status(400).json({ message: "Correo institucional del defensor invalido" });
  }
  if (!sanitizeText(defensor.regional_origen)) return res.status(400).json({ message: "Regional de origen es obligatoria" });
  if (!sanitizeText(defensor.pag_supervisor)) {
    return res.status(400).json({ message: "Profesional Administrativo y de Gestion es obligatorio" });
  }

  if (!sanitizeText(procesado.nombres_apellidos)) {
    return res.status(400).json({ message: "Nombres y apellidos del usuario son obligatorios" });
  }

  if (!isSpoaValid(caso.spoa)) {
    return res.status(400).json({ message: "SPOA debe contener 21 digitos numericos" });
  }
  if (!sanitizeText(caso.delito)) return res.status(400).json({ message: "Delito es obligatorio" });
  if (!PROCESS_STAGES.includes(caso.etapa_procesal)) {
    return res.status(400).json({ message: "Etapa procesal invalida" });
  }

  if (!sanitizeText(solicitud.regional_servicio)) {
    return res.status(400).json({ message: "Regional donde se asigna el servicio es obligatoria" });
  }
  if (!sanitizeText(solicitud.breve_relacion_hechos)) {
    return res.status(400).json({ message: "Breve relacion de hechos es obligatoria" });
  }
  if (!sanitizeText(solicitud.hipotesis)) {
    return res.status(400).json({ message: "Hipotesis es obligatoria" });
  }
  if (selectedSpecialties.length === 0) {
    return res.status(400).json({ message: "Debe seleccionar al menos una especialidad" });
  }

  if (!payload.firma_osndp) {
    return res.status(400).json({ message: "Firma/certificacion OSNDP es obligatoria" });
  }

  const isUrgent = Boolean(solicitud.es_urgente);
  if (isUrgent && !sanitizeText(solicitud.causal_urgencia)) {
    return res.status(400).json({ message: "Las solicitudes urgentes requieren causal de urgencia" });
  }

  const tipoTramite = solicitud.tipo_tramite === "utilidad_publica" ? "utilidad_publica" : "asignacion_normal";
  if (tipoTramite === "utilidad_publica") {
    const hasFieldWork = selectedSpecialties.some((item) => item.tipo_servicio === "investigacion_campo");
    if (!hasFieldWork) {
      return res.status(400).json({
        message: "Utilidad publica solo aplica si incluye investigacion de campo"
      });
    }
  }

  const numeroMision = nextMissionNumber();
  const solicitudId = `sol-${crypto.randomUUID()}`;

  const parent = {
    id: solicitudId,
    numero_mision: numeroMision,
    fecha_radicacion: nowIso(),
    estado: "radicada",
    defensor_nombre: sanitizeText(defensor.nombre),
    regional_origen: sanitizeText(defensor.regional_origen),
    regional_servicio: sanitizeText(solicitud.regional_servicio),
    spoa: sanitizeText(caso.spoa),
    delito: sanitizeText(caso.delito),
    etapa_procesal: sanitizeText(caso.etapa_procesal),
    fecha_proxima_audiencia: sanitizeText(caso.fecha_proxima_audiencia) || null,
    usuario_procesado: procesado,
    breve_relacion_hechos: sanitizeText(solicitud.breve_relacion_hechos),
    hipotesis: sanitizeText(solicitud.hipotesis),
    observaciones: sanitizeText(solicitud.observaciones),
    prioridad: normalizePriority(solicitud.prioridad, isUrgent),
    es_urgente: isUrgent,
    causal_urgencia: sanitizeText(solicitud.causal_urgencia) || null,
    tipo_tramite: tipoTramite,
    created_at: nowIso(),
    updated_at: nowIso()
  };

  solicitudesMadre.unshift(parent);

  const createdRadicados = selectedSpecialties.map((specialty, index) => {
    const suffix = String(index + 1).padStart(2, "0");
    const numeroRadicado = `${numeroMision}-${suffix}`;
    const diasRespuesta = calculateDaysByRule(specialty, tipoTramite);

    const row = {
      id: `rad-${crypto.randomUUID()}`,
      solicitud_id: solicitudId,
      numero_radicado: numeroRadicado,
      especialidad_id: specialty.id,
      estado: "recibida",
      investigador_id: null,
      tipo_asignacion: null,
      fecha_asignacion: null,
      fecha_limite: null,
      dias_respuesta: diasRespuesta,
      prioridad: parent.prioridad,
      historial: [
        { evento: "radicado_generado", fecha: nowIso(), detalle: `Generado por especialidad: ${specialty.nombre}` },
        { evento: "recibida", fecha: nowIso(), detalle: "Recibida por Grupo de Investigacion" }
      ],
      ampliaciones: []
    };

    radicados.unshift(row);
    return row;
  });

  const view = buildMissionView().filter((item) => item.parentMission === numeroMision);

  res.status(201).json({
    message: `Solicitud ${numeroMision} radicada. Se generaron ${createdRadicados.length} radicado(s).`,
    solicitud: parent,
    radicados: createdRadicados,
    missions: view,
    notifications: [
      "SIMULADA: notificacion de solicitud radicada al defensor",
      "SIMULADA: notificacion de solicitud recibida al PAG"
    ]
  });
});

app.post("/api/radicados/:numero/aprobar-reparto", authMiddleware, ensureRoles(["coordinador", "administrador", "pag"]), (req, res) => {
  const row = radicados.find((item) => item.numero_radicado === req.params.numero);
  if (!row) return res.status(404).json({ message: "Radicado no encontrado" });

  row.estado = "aprobada_para_reparto";
  appendHistory(row, "aprobada_para_reparto", "Cumple requisitos de conformidad");

  return res.json({ message: "Radicado aprobado para reparto", mission: buildMissionView().find((m) => m.id === row.numero_radicado) });
});

app.post("/api/radicados/:numero/devolver", authMiddleware, ensureRoles(["coordinador", "administrador", "pag"]), (req, res) => {
  const row = radicados.find((item) => item.numero_radicado === req.params.numero);
  if (!row) return res.status(404).json({ message: "Radicado no encontrado" });

  const motivo = sanitizeText(req.body?.motivo);
  const observacion = sanitizeText(req.body?.observacion);
  if (!motivo || !observacion) {
    return res.status(400).json({ message: "Motivo y observacion son obligatorios para devolucion" });
  }

  row.estado = "devuelta";
  appendHistory(row, "devuelta", `${motivo}: ${observacion}`);

  return res.json({ message: "Radicado devuelto con observacion", mission: buildMissionView().find((m) => m.id === row.numero_radicado) });
});

app.post("/api/radicados/:numero/asignar", authMiddleware, ensureRoles(["coordinador", "administrador", "pag"]), (req, res) => {
  const row = radicados.find((item) => item.numero_radicado === req.params.numero);
  if (!row) return res.status(404).json({ message: "Radicado no encontrado" });

  const investigatorId = sanitizeText(req.body?.investigador_id);
  const tipo = req.body?.tipo_asignacion === "manual" ? "manual" : "automatica";
  const justificacionManual = sanitizeText(req.body?.justificacion_manual);
  const asignacionExcepcional = Boolean(req.body?.asignacion_excepcional);

  const investigator = investigators.find((inv) => inv.id === investigatorId && inv.activo);
  if (!investigator) return res.status(400).json({ message: "Investigador no valido o inactivo" });

  if (tipo === "manual" && !justificacionManual) {
    return res.status(400).json({ message: "Asignacion manual requiere justificacion" });
  }

  if (!asignacionExcepcional && row.estado !== "aprobada_para_reparto") {
    return res.status(400).json({ message: "Solo se puede asignar tras aprobacion para reparto" });
  }

  if (asignacionExcepcional && !justificacionManual) {
    return res.status(400).json({ message: "Asignacion excepcional requiere justificacion" });
  }

  const assignmentDate = todayIso();
  row.investigador_id = investigator.id;
  row.tipo_asignacion = tipo;
  row.fecha_asignacion = assignmentDate;
  row.fecha_limite = addCalendarDays(assignmentDate, row.dias_respuesta);
  row.estado = "asignada";

  appendHistory(
    row,
    "asignada",
    tipo === "manual" ? `Manual: ${justificacionManual}` : "Automatica por turno"
  );

  return res.json({ message: "Radicado asignado", mission: buildMissionView().find((m) => m.id === row.numero_radicado) });
});

app.post("/api/radicados/:numero/ampliacion", authMiddleware, ensureRoles(["investigador", "coordinador", "administrador"]), (req, res) => {
  const row = radicados.find((item) => item.numero_radicado === req.params.numero);
  if (!row) return res.status(404).json({ message: "Radicado no encontrado" });
  if (!canInvestigatorOperate(req, row)) return res.status(403).json({ message: "La mision no esta asignada a este investigador" });

  const argumentacion = sanitizeText(req.body?.argumentacion);
  const diasSolicitados = Number(req.body?.dias_adicionales || 0);
  if (!argumentacion || !Number.isFinite(diasSolicitados) || diasSolicitados <= 0) {
    return res.status(400).json({ message: "Argumentacion y dias adicionales validos son obligatorios" });
  }

  if (diasSolicitados > row.dias_respuesta && row.ampliaciones.length === 0) {
    return res.status(400).json({
      message: "La primera ampliacion no puede superar el termino inicialmente concedido"
    });
  }

  const solicitud = {
    id: `amp-${crypto.randomUUID()}`,
    fecha_solicitud: nowIso(),
    solicitante: req.auth.fullName,
    argumentacion,
    dias_adicionales_solicitados: diasSolicitados,
    fecha_limite_anterior: row.fecha_limite,
    nueva_fecha_limite_propuesta: row.fecha_limite
      ? addCalendarDays(row.fecha_limite, diasSolicitados)
      : addCalendarDays(todayIso(), diasSolicitados),
    estado: "pendiente",
    aprobador: null,
    observaciones: null
  };

  row.ampliaciones.push(solicitud);
  row.estado = "solicitud_ampliacion";
  appendHistory(row, "solicitud_ampliacion", `Solicitud de ${diasSolicitados} dias. ${argumentacion}`);

  return res.json({ message: "Solicitud de ampliacion registrada", ampliacion: solicitud, mission: buildMissionView().find((m) => m.id === row.numero_radicado) });
});

app.post("/api/radicados/:numero/iniciar", authMiddleware, ensureRoles(["investigador", "coordinador", "administrador"]), (req, res) => {
  const row = radicados.find((item) => item.numero_radicado === req.params.numero);
  if (!row) return res.status(404).json({ message: "Radicado no encontrado" });
  if (!canInvestigatorOperate(req, row)) return res.status(403).json({ message: "La mision no esta asignada a este investigador" });
  if (!["asignada", "ampliacion_aprobada"].includes(row.estado)) {
    return res.status(400).json({ message: "Solo se puede iniciar una mision asignada o con ampliacion aprobada" });
  }

  row.estado = "en_ejecucion";
  row.avance = Math.max(Number(row.avance || 0), 35);
  appendHistory(row, "en_ejecucion", `Inicio de tramite registrado por ${req.auth.fullName}`);

  return res.json(missionResponse(row, "Mision marcada en ejecucion"));
});

app.post("/api/radicados/:numero/avance", authMiddleware, ensureRoles(["investigador", "coordinador", "administrador"]), (req, res) => {
  const row = radicados.find((item) => item.numero_radicado === req.params.numero);
  if (!row) return res.status(404).json({ message: "Radicado no encontrado" });
  if (!canInvestigatorOperate(req, row)) return res.status(403).json({ message: "La mision no esta asignada a este investigador" });

  const porcentaje = Number(req.body?.porcentaje);
  const observacion = sanitizeText(req.body?.observacion);
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    return res.status(400).json({ message: "El avance debe estar entre 0 y 100" });
  }
  if (!observacion) return res.status(400).json({ message: "La observacion de avance es obligatoria" });
  if (["informe_entregado", "finalizada", "anulada"].includes(row.estado)) {
    return res.status(400).json({ message: "No se puede actualizar avance de una mision cerrada" });
  }

  row.avance = porcentaje;
  if (row.estado === "asignada") row.estado = "en_ejecucion";
  appendHistory(row, "avance_actualizado", `${porcentaje}% - ${observacion}`);

  return res.json(missionResponse(row, "Avance registrado"));
});

app.post("/api/radicados/:numero/informe", authMiddleware, ensureRoles(["investigador", "coordinador", "administrador"]), (req, res) => {
  const row = radicados.find((item) => item.numero_radicado === req.params.numero);
  if (!row) return res.status(404).json({ message: "Radicado no encontrado" });
  if (!canInvestigatorOperate(req, row)) return res.status(403).json({ message: "La mision no esta asignada a este investigador" });

  const titulo = sanitizeText(req.body?.titulo);
  const conclusiones = sanitizeText(req.body?.conclusiones);
  const referencia = sanitizeText(req.body?.referencia);
  if (!titulo || !conclusiones || !referencia) {
    return res.status(400).json({ message: "Titulo, conclusiones y referencia SGDEA/IRIS son obligatorios" });
  }
  if (!["asignada", "en_ejecucion", "ampliacion_aprobada"].includes(row.estado)) {
    return res.status(400).json({ message: "El estado actual no permite entregar informe" });
  }

  row.estado = "informe_entregado";
  row.avance = 100;
  row.informe = {
    titulo,
    conclusiones,
    referencia,
    entregado_por: req.auth.fullName,
    fecha_entrega: nowIso()
  };
  appendHistory(row, "informe_entregado", `${titulo}. Referencia: ${referencia}`);

  return res.json(missionResponse(row, "Informe entregado y registrado"));
});

app.post("/api/radicados/:numero/ampliacion/:ampliacionId/decidir", authMiddleware, ensureRoles(["coordinador", "administrador", "pag"]), (req, res) => {
  const row = radicados.find((item) => item.numero_radicado === req.params.numero);
  if (!row) return res.status(404).json({ message: "Radicado no encontrado" });

  const ampliacion = row.ampliaciones.find((item) => item.id === req.params.ampliacionId);
  if (!ampliacion) return res.status(404).json({ message: "Solicitud de ampliacion no encontrada" });

  const aprobar = Boolean(req.body?.aprobar);
  const observaciones = sanitizeText(req.body?.observaciones);

  ampliacion.aprobador = req.auth.fullName;
  ampliacion.observaciones = observaciones || null;

  if (aprobar) {
    ampliacion.estado = "aprobada";
    row.estado = "ampliacion_aprobada";
    row.fecha_limite = ampliacion.nueva_fecha_limite_propuesta;
    appendHistory(row, "ampliacion_aprobada", observaciones || "Ampliacion aprobada");
  } else {
    ampliacion.estado = "rechazada";
    row.estado = "ampliacion_rechazada";
    appendHistory(row, "ampliacion_rechazada", observaciones || "Ampliacion rechazada");
  }

  return res.json({ message: "Decision de ampliacion registrada", mission: buildMissionView().find((m) => m.id === row.numero_radicado) });
});

app.get("/api/radicados", authMiddleware, (req, res) => {
  res.json({ missions: buildMissionView() });
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
