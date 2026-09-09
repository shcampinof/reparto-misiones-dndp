import { Router } from "express";
import { asyncHandler } from "../../shared/errors.js";

export function createDemoRouter({
  authMiddleware,
  demoService,
  catalogService,
}) {
  const router = Router();
  router.use(authMiddleware);

  router.get("/bootstrap", (_req, res) =>
    res.json(demoService.bootstrap(_req.auth)),
  );
  router.post("/reset", (req, res) => res.json(demoService.reset(req.auth)));

  router.get("/catalogo/servicios", (req, res) =>
    res.json({
      services: catalogService.listPublished(req.auth, {
        area: req.query.area,
        at: req.query.at,
      }),
    }),
  );
  router.post("/catalogo/servicios", (req, res) =>
    res
      .status(201)
      .json({ service: catalogService.createDraft(req.auth, req.body || {}) }),
  );
  router.post("/catalogo/servicios/:id/enviar-revision", (req, res) =>
    res.json({
      service: catalogService.submit(req.auth, req.params.id, req.body || {}),
    }),
  );
  router.post("/catalogo/servicios/:id/publicar", (req, res) =>
    res.json({
      service: catalogService.publish(req.auth, req.params.id, req.body || {}),
    }),
  );
  router.post("/catalogo/servicios/:id/retirar", (req, res) =>
    res.json({
      service: catalogService.retire(req.auth, req.params.id, req.body || {}),
    }),
  );

  router.post("/:area/items/:id/operaciones/:type", (req, res) =>
    res.status(201).json({
      request: demoService.registerOperation(
        req.auth,
        req.params.area,
        req.params.id,
        req.params.type,
        req.body || {},
      ),
    }),
  );

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
  router.post("/investigacion/items/:id/devolver-entrega", (req, res) =>
    res.json({
      request: demoService.returnInvestigationDelivery(
        req.auth,
        req.params.id,
        req.body || {},
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
  router.post("/victimas/items/:id/devolver-solicitud", (req, res) =>
    res.json({
      request: demoService.returnVictimsRequest(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  router.post("/victimas/items/:id/corregir-reenviar", (req, res) =>
    res.json({
      request: demoService.correctAndResubmitVictims(
        req.auth,
        req.params.id,
        req.body || {},
      ),
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
