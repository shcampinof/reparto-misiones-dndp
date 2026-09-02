import crypto from "node:crypto";
import { Router } from "express";
import {
  addCalendarDays,
  buildMissionView,
  calculateDaysByRule,
  nextMissionNumber,
  radicados,
  solicitudesMadre,
} from "../../data.js";
import { ensureRoles } from "../core/auth/middleware.js";
import {
  PROCESS_STAGES,
  appendHistory,
  canInvestigatorOperate,
  findSpecialtiesByIds,
  isInstitutionalEmail,
  isNumeric,
  isSpoaValid,
  missionResponse,
  normalizePriority,
  nowIso,
  sanitizeText,
  todayIso,
} from "./prototype-helpers.js";

export function createInvestigationRouter({ authMiddleware }) {
  const router = Router();

  router.post(
    "/solicitudes",
    authMiddleware,
    ensureRoles(["defensor", "coordinador", "administrador"]),
    createRequest,
  );
  router.post(
    "/radicados/:numero/aprobar-reparto",
    authMiddleware,
    ensureRoles(["coordinador", "administrador", "pag"]),
    approveForAssignment,
  );
  router.post(
    "/radicados/:numero/devolver",
    authMiddleware,
    ensureRoles(["coordinador", "administrador", "pag"]),
    returnRequest,
  );
  router.post(
    "/radicados/:numero/ampliacion",
    authMiddleware,
    ensureRoles(["investigador", "coordinador", "administrador"]),
    requestExtension,
  );
  router.post(
    "/radicados/:numero/iniciar",
    authMiddleware,
    ensureRoles(["investigador", "coordinador", "administrador"]),
    startMission,
  );
  router.post(
    "/radicados/:numero/avance",
    authMiddleware,
    ensureRoles(["investigador", "coordinador", "administrador"]),
    updateProgress,
  );
  router.post(
    "/radicados/:numero/informe",
    authMiddleware,
    ensureRoles(["investigador", "coordinador", "administrador"]),
    deliverReport,
  );
  router.post(
    "/radicados/:numero/ampliacion/:ampliacionId/decidir",
    authMiddleware,
    ensureRoles(["coordinador", "administrador", "pag"]),
    decideExtension,
  );
  router.get("/radicados", authMiddleware, (_req, res) =>
    res.json({ missions: buildMissionView() }),
  );

  return router;
}

function createRequest(req, res) {
  const payload = req.body || {};
  const defensor = payload.defensor || {};
  const procesado = payload.procesado || {};
  const caso = payload.caso || {};
  const solicitud = payload.solicitud || {};
  const selectedSpecialties = findSpecialtiesByIds(
    payload.especialidades || [],
  );

  if (!sanitizeText(defensor.nombre))
    return res
      .status(400)
      .json({ message: "Nombre del defensor es obligatorio" });
  if (!isNumeric(defensor.telefono))
    return res
      .status(400)
      .json({ message: "Telefono del defensor debe ser numerico" });
  if (!isInstitutionalEmail(defensor.correo_institucional)) {
    return res
      .status(400)
      .json({ message: "Correo institucional del defensor invalido" });
  }
  if (!sanitizeText(defensor.regional_origen))
    return res
      .status(400)
      .json({ message: "Regional de origen es obligatoria" });
  if (!sanitizeText(defensor.pag_supervisor)) {
    return res.status(400).json({
      message: "Profesional Administrativo y de Gestion es obligatorio",
    });
  }
  if (!sanitizeText(procesado.nombres_apellidos)) {
    return res
      .status(400)
      .json({ message: "Nombres y apellidos del usuario son obligatorios" });
  }
  if (!isSpoaValid(caso.spoa))
    return res
      .status(400)
      .json({ message: "SPOA debe contener 21 digitos numericos" });
  if (!sanitizeText(caso.delito))
    return res.status(400).json({ message: "Delito es obligatorio" });
  if (!PROCESS_STAGES.includes(caso.etapa_procesal)) {
    return res.status(400).json({ message: "Etapa procesal invalida" });
  }
  if (!sanitizeText(solicitud.regional_servicio)) {
    return res
      .status(400)
      .json({ message: "Regional donde se asigna el servicio es obligatoria" });
  }
  if (!sanitizeText(solicitud.breve_relacion_hechos)) {
    return res
      .status(400)
      .json({ message: "Breve relacion de hechos es obligatoria" });
  }
  if (!sanitizeText(solicitud.hipotesis))
    return res.status(400).json({ message: "Hipotesis es obligatoria" });
  if (selectedSpecialties.length === 0)
    return res
      .status(400)
      .json({ message: "Debe seleccionar al menos una especialidad" });
  if (!payload.firma_osndp)
    return res
      .status(400)
      .json({ message: "Firma/certificacion OSNDP es obligatoria" });

  const isUrgent = Boolean(solicitud.es_urgente);
  if (isUrgent && !sanitizeText(solicitud.causal_urgencia)) {
    return res.status(400).json({
      message: "Las solicitudes urgentes requieren causal de urgencia",
    });
  }

  const tipoTramite =
    solicitud.tipo_tramite === "utilidad_publica"
      ? "utilidad_publica"
      : "asignacion_normal";
  if (
    tipoTramite === "utilidad_publica" &&
    !selectedSpecialties.some(
      (item) => item.tipo_servicio === "investigacion_campo",
    )
  ) {
    return res.status(400).json({
      message: "Utilidad publica solo aplica si incluye investigacion de campo",
    });
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
    updated_at: nowIso(),
  };
  solicitudesMadre.unshift(parent);

  const createdRadicados = selectedSpecialties.map((specialty, index) => {
    const row = {
      id: `rad-${crypto.randomUUID()}`,
      solicitud_id: solicitudId,
      numero_radicado: `${numeroMision}-${String(index + 1).padStart(2, "0")}`,
      especialidad_id: specialty.id,
      estado: "recibida",
      investigador_id: null,
      tipo_asignacion: null,
      fecha_asignacion: null,
      fecha_limite: null,
      dias_respuesta: calculateDaysByRule(specialty, tipoTramite),
      prioridad: parent.prioridad,
      historial: [
        {
          evento: "radicado_generado",
          fecha: nowIso(),
          detalle: `Generado por especialidad: ${specialty.nombre}`,
        },
        {
          evento: "recibida",
          fecha: nowIso(),
          detalle: "Recibida por Grupo de Investigacion",
        },
      ],
      ampliaciones: [],
    };
    radicados.unshift(row);
    return row;
  });

  return res.status(201).json({
    message: `Solicitud ${numeroMision} radicada. Se generaron ${createdRadicados.length} radicado(s).`,
    solicitud: parent,
    radicados: createdRadicados,
    missions: buildMissionView().filter(
      (item) => item.parentMission === numeroMision,
    ),
    notifications: [
      "SIMULADA: notificacion de solicitud radicada al defensor",
      "SIMULADA: notificacion de solicitud recibida al PAG",
    ],
  });
}

function findRadicado(req, res) {
  const row = radicados.find(
    (item) => item.numero_radicado === req.params.numero,
  );
  if (!row) res.status(404).json({ message: "Radicado no encontrado" });
  return row;
}

function approveForAssignment(req, res) {
  const row = findRadicado(req, res);
  if (!row) return;
  row.estado = "aprobada_para_reparto";
  appendHistory(
    row,
    "aprobada_para_reparto",
    "Cumple requisitos de conformidad",
  );
  res.json(missionResponse(row, "Radicado aprobado para reparto"));
}

function returnRequest(req, res) {
  const row = findRadicado(req, res);
  if (!row) return;
  const motivo = sanitizeText(req.body?.motivo);
  const observacion = sanitizeText(req.body?.observacion);
  if (!motivo || !observacion) {
    return res.status(400).json({
      message: "Motivo y observacion son obligatorios para devolucion",
    });
  }
  row.estado = "devuelta";
  appendHistory(row, "devuelta", `${motivo}: ${observacion}`);
  return res.json(missionResponse(row, "Radicado devuelto con observacion"));
}

function requestExtension(req, res) {
  const row = findRadicado(req, res);
  if (!row) return;
  if (!canInvestigatorOperate(req, row))
    return res
      .status(403)
      .json({ message: "La mision no esta asignada a este investigador" });

  const argumentacion = sanitizeText(req.body?.argumentacion);
  const requestedDays = Number(req.body?.dias_adicionales || 0);
  if (!argumentacion || !Number.isFinite(requestedDays) || requestedDays <= 0) {
    return res.status(400).json({
      message: "Argumentacion y dias adicionales validos son obligatorios",
    });
  }
  if (requestedDays > row.dias_respuesta && row.ampliaciones.length === 0) {
    return res.status(400).json({
      message:
        "La primera ampliacion no puede superar el termino inicialmente concedido",
    });
  }

  const extension = {
    id: `amp-${crypto.randomUUID()}`,
    fecha_solicitud: nowIso(),
    solicitante: req.auth.fullName,
    argumentacion,
    dias_adicionales_solicitados: requestedDays,
    fecha_limite_anterior: row.fecha_limite,
    nueva_fecha_limite_propuesta: row.fecha_limite
      ? addCalendarDays(row.fecha_limite, requestedDays)
      : addCalendarDays(todayIso(), requestedDays),
    estado: "pendiente",
    aprobador: null,
    observaciones: null,
  };
  row.ampliaciones.push(extension);
  row.estado = "solicitud_ampliacion";
  appendHistory(
    row,
    "solicitud_ampliacion",
    `Solicitud de ${requestedDays} dias. ${argumentacion}`,
  );
  return res.json({
    ...missionResponse(row, "Solicitud de ampliacion registrada"),
    ampliacion: extension,
  });
}

function startMission(req, res) {
  const row = findRadicado(req, res);
  if (!row) return;
  if (!canInvestigatorOperate(req, row))
    return res
      .status(403)
      .json({ message: "La mision no esta asignada a este investigador" });
  if (!["asignada", "ampliacion_aprobada"].includes(row.estado)) {
    return res.status(400).json({
      message:
        "Solo se puede iniciar una mision asignada o con ampliacion aprobada",
    });
  }
  row.estado = "en_ejecucion";
  row.avance = Math.max(Number(row.avance || 0), 35);
  appendHistory(
    row,
    "en_ejecucion",
    `Inicio de tramite registrado por ${req.auth.fullName}`,
  );
  return res.json(missionResponse(row, "Mision marcada en ejecucion"));
}

function updateProgress(req, res) {
  const row = findRadicado(req, res);
  if (!row) return;
  if (!canInvestigatorOperate(req, row))
    return res
      .status(403)
      .json({ message: "La mision no esta asignada a este investigador" });
  const percentage = Number(req.body?.porcentaje);
  const observation = sanitizeText(req.body?.observacion);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return res
      .status(400)
      .json({ message: "El avance debe estar entre 0 y 100" });
  }
  if (!observation)
    return res
      .status(400)
      .json({ message: "La observacion de avance es obligatoria" });
  if (["informe_entregado", "finalizada", "anulada"].includes(row.estado)) {
    return res
      .status(400)
      .json({ message: "No se puede actualizar avance de una mision cerrada" });
  }
  row.avance = percentage;
  if (row.estado === "asignada") row.estado = "en_ejecucion";
  appendHistory(row, "avance_actualizado", `${percentage}% - ${observation}`);
  return res.json(missionResponse(row, "Avance registrado"));
}

function deliverReport(req, res) {
  const row = findRadicado(req, res);
  if (!row) return;
  if (!canInvestigatorOperate(req, row))
    return res
      .status(403)
      .json({ message: "La mision no esta asignada a este investigador" });
  const titulo = sanitizeText(req.body?.titulo);
  const conclusiones = sanitizeText(req.body?.conclusiones);
  const referencia = sanitizeText(req.body?.referencia);
  if (!titulo || !conclusiones || !referencia) {
    return res.status(400).json({
      message: "Titulo, conclusiones y referencia SGDEA/IRIS son obligatorios",
    });
  }
  if (
    !["asignada", "en_ejecucion", "ampliacion_aprobada"].includes(row.estado)
  ) {
    return res
      .status(400)
      .json({ message: "El estado actual no permite entregar informe" });
  }
  row.estado = "informe_entregado";
  row.avance = 100;
  row.informe = {
    titulo,
    conclusiones,
    referencia,
    entregado_por: req.auth.fullName,
    fecha_entrega: nowIso(),
  };
  appendHistory(
    row,
    "informe_entregado",
    `${titulo}. Referencia: ${referencia}`,
  );
  return res.json(missionResponse(row, "Informe entregado y registrado"));
}

function decideExtension(req, res) {
  const row = findRadicado(req, res);
  if (!row) return;
  const extension = row.ampliaciones.find(
    (item) => item.id === req.params.ampliacionId,
  );
  if (!extension)
    return res
      .status(404)
      .json({ message: "Solicitud de ampliacion no encontrada" });
  const approve = Boolean(req.body?.aprobar);
  const observations = sanitizeText(req.body?.observaciones);
  extension.aprobador = req.auth.fullName;
  extension.observaciones = observations || null;
  if (approve) {
    extension.estado = "aprobada";
    row.estado = "ampliacion_aprobada";
    row.fecha_limite = extension.nueva_fecha_limite_propuesta;
    appendHistory(
      row,
      "ampliacion_aprobada",
      observations || "Ampliacion aprobada",
    );
  } else {
    extension.estado = "rechazada";
    row.estado = "ampliacion_rechazada";
    appendHistory(
      row,
      "ampliacion_rechazada",
      observations || "Ampliacion rechazada",
    );
  }
  return res.json(missionResponse(row, "Decision de ampliacion registrada"));
}
