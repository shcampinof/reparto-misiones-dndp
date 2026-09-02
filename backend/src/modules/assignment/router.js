import { Router } from "express";
import { addCalendarDays, investigators, radicados } from "../../data.js";
import { ensureRoles } from "../core/auth/middleware.js";
import {
  appendHistory,
  missionResponse,
  sanitizeText,
  todayIso,
} from "../investigacion/prototype-helpers.js";

export function createAssignmentRouter({ authMiddleware }) {
  const router = Router();

  router.post(
    "/radicados/:numero/asignar",
    authMiddleware,
    ensureRoles(["coordinador", "administrador", "pag"]),
    (req, res) => {
      const row = radicados.find(
        (item) => item.numero_radicado === req.params.numero,
      );
      if (!row)
        return res.status(404).json({ message: "Radicado no encontrado" });

      const investigatorId = sanitizeText(req.body?.investigador_id);
      const type =
        req.body?.tipo_asignacion === "manual" ? "manual" : "automatica";
      const manualJustification = sanitizeText(req.body?.justificacion_manual);
      const exceptional = Boolean(req.body?.asignacion_excepcional);
      const investigator = investigators.find(
        (item) => item.id === investigatorId && item.activo,
      );

      if (!investigator)
        return res
          .status(400)
          .json({ message: "Investigador no valido o inactivo" });
      if (type === "manual" && !manualJustification) {
        return res
          .status(400)
          .json({ message: "Asignacion manual requiere justificacion" });
      }
      if (!exceptional && row.estado !== "aprobada_para_reparto") {
        return res.status(400).json({
          message: "Solo se puede asignar tras aprobacion para reparto",
        });
      }
      if (exceptional && !manualJustification) {
        return res
          .status(400)
          .json({ message: "Asignacion excepcional requiere justificacion" });
      }

      const assignmentDate = todayIso();
      row.investigador_id = investigator.id;
      row.tipo_asignacion = type;
      row.fecha_asignacion = assignmentDate;
      row.fecha_limite = addCalendarDays(assignmentDate, row.dias_respuesta);
      row.estado = "asignada";
      appendHistory(
        row,
        "asignada",
        type === "manual"
          ? `Manual: ${manualJustification}`
          : "Automatica por turno",
      );

      return res.json(missionResponse(row, "Radicado asignado"));
    },
  );

  return router;
}

export const assignmentModule = Object.freeze({
  name: "assignment",
  status: "prototype-compatible",
  warning:
    "La ruta conserva el reparto simulado; el motor real corresponde a PROMPT 5.",
});
