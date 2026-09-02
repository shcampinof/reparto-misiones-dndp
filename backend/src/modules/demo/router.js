import { Router } from "express";
import { asyncHandler } from "../../shared/errors.js";

export function createDemoRouter({ authMiddleware, demoService }) {
  const router = Router();
  router.use(authMiddleware);

  router.get("/bootstrap", (_req, res) =>
    res.json(demoService.bootstrap(_req.auth)),
  );
  router.post("/reset", (req, res) => res.json(demoService.reset(req.auth)));

  router.post(
    "/investigacion/solicitudes",
    asyncHandler(async (req, res) => {
      res.status(201).json({
        request: demoService.createInvestigation(req.auth, req.body || {}),
      });
    }),
  );
  router.post("/investigacion/items/:id/repartir", (req, res) =>
    res.json({
      request: demoService.assignInvestigationItem(req.auth, req.params.id),
    }),
  );
  router.post("/investigacion/items/:id/iniciar", (req, res) =>
    res.json({
      request: demoService.startInvestigation(req.auth, req.params.id),
    }),
  );
  router.post("/investigacion/items/:id/avance", (req, res) =>
    res.json({
      request: demoService.progressInvestigation(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  router.post("/investigacion/items/:id/entregar", (req, res) =>
    res.json({
      request: demoService.deliverInvestigation(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  router.post("/investigacion/items/:id/aprobar-entrega", (req, res) =>
    res.json({
      request: demoService.approveInvestigationDelivery(
        req.auth,
        req.params.id,
      ),
    }),
  );

  router.post(
    "/victimas/solicitudes",
    asyncHandler(async (req, res) => {
      res
        .status(201)
        .json({ request: demoService.createVictims(req.auth, req.body || {}) });
    }),
  );
  router.post("/victimas/items/:id/aprobar-y-repartir", (req, res) =>
    res.json({
      request: demoService.approveVictimsAndAssign(req.auth, req.params.id),
    }),
  );
  router.post("/victimas/items/:id/iniciar", (req, res) =>
    res.json({ request: demoService.startVictims(req.auth, req.params.id) }),
  );
  router.post("/victimas/items/:id/avance", (req, res) =>
    res.json({
      request: demoService.progressVictims(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  router.post("/victimas/items/:id/finalizar", (req, res) =>
    res.json({
      request: demoService.finishVictims(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );

  return router;
}
