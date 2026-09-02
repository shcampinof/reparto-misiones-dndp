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
    res.json({
      ok: true,
      status: "ready",
      checks: {
        configuration: "ok",
        persistence: "demo-memory-resettable",
      },
      requestId: req.requestId,
    });
  });

  return router;
}
