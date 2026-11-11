import { Router } from "express";

export function createHealthRouter({ config }) {
  const router = Router();
  const startedAt = Date.now();

  router.get("/", (req, res) => {
    res.json({
      ok: true,
      service: config.serviceName,
      version: config.serviceVersion,
      environment: config.environment,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      requestId: req.requestId,
    });
  });

  router.get("/ready", (req, res) => {
    res.json(readinessPayload(req));
  });

  return router;
}

export function readinessPayload(req) {
  req.app.locals.demoRepository?.check?.();
  return {
    ok: true,
    status: "ready",
    checks: {
      configuration: "ok",
      persistence:
        req.app.locals.config.storage.driver === "sqlite"
          ? "sqlite-transactional"
          : "demo-memory-resettable",
    },
    requestId: req.requestId,
  };
}
