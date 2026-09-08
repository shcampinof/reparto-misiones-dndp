import { Router } from "express";
import { asyncHandler } from "../../../shared/errors.js";

export function createHealthRouter({ config, persistence }) {
  const router = Router();
  const startedAt = Date.now();

  router.get("/", (req, res) => {
    res.json({
      ok: true,
      service: config.serviceName,
      version: config.serviceVersion,
      environment: config.environment,
      profile: config.appProfile,
      persistenceDriver: config.persistence.driver,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      requestId: req.requestId,
    });
  });

  router.get(
    "/ready",
    asyncHandler(async (req, res) => {
      const payload = await readinessPayload(req, persistence);
      res.status(payload.ok ? 200 : 503).json(payload);
    }),
  );

  return router;
}

export async function readinessPayload(req, persistence) {
  const persistenceHealth = await persistence.health();
  return {
    ok: persistenceHealth.ok,
    status: persistenceHealth.ok ? "ready" : "not_ready",
    checks: {
      configuration: "ok",
      persistence: persistenceHealth,
    },
    requestId: req.requestId,
  };
}
