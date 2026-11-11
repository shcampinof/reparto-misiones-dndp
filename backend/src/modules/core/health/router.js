import { Router } from "express";
import { asyncHandler } from "../../../shared/errors.js";

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

  router.get(
    "/ready",
    asyncHandler(async (req, res) => {
      res.json(await readinessPayload(req));
    }),
  );

  return router;
}

export async function readinessPayload(req) {
  await req.app.locals.demoRepository?.check?.();
  return {
    ok: true,
    status: "ready",
    checks: {
      configuration: "ok",
      persistence:
        req.app.locals.config.storage.driver === "oracle"
          ? "oracle-transactional"
          : req.app.locals.config.storage.driver === "sqlite"
            ? "sqlite-transactional"
            : "demo-memory-resettable",
    },
    requestId: req.requestId,
  };
}
