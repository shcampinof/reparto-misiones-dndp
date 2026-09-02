import { Router } from "express";
import {
  PROCESS_STAGES,
  PRIORITIES,
  STATUS_FLOW,
  STATUS_LABELS,
  buildDashboardData,
  buildMissionView,
  investigators,
  roleSections,
  specialties,
} from "../../../data.js";

export function createPortalRouter({ authMiddleware, config }) {
  const router = Router();

  router.get("/bootstrap", authMiddleware, (req, res) => {
    const role = req.auth.role;
    const missionView = buildMissionView();
    const enabledRoles = Object.entries(config.auth.roleFlags)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    res.json({
      role,
      enabledRoles,
      sections: roleSections[role] ?? [],
      dashboard: buildDashboardData(missionView),
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
          rojo: "Termino vencido",
        },
        tiempos: {
          investigacion_campo: 25,
          pericial: 45,
          utilidad_publica_investigacion_campo: 15,
        },
        integraciones: "SIMULADAS - pendiente SGDEA/IRIS y correo",
      },
    });
  });

  return router;
}
