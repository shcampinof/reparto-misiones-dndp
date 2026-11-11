import { Router } from "express";
import { asyncHandler } from "../../../shared/errors.js";
import { scanPayload } from "../../../infrastructure/documents/antimalware.js";
import { CAPABILITIES, assertCapability } from "../auth/capabilities.js";

export function createWorkspaceRouter({
  authMiddleware,
  service,
  config,
  repository,
}) {
  const router = Router();
  router.use(authMiddleware);
  router.get("/maintenance", (req, res) => {
    assertCapability(req.auth, CAPABILITIES.ADMINISTRAR_PLATAFORMA, {
      area: "AMBAS",
    });
    const state = repository.snapshot(),
      counts = {};
    for (const n of state.outbox || [])
      counts[n.status] = (counts[n.status] || 0) + 1;
    res.json({
      backups: req.app.locals.backups.status,
      notifications: counts,
      storage: config.storage.driver,
      scanner: config.files.antimalwareCommand
        ? "CONFIGURADO"
        : "NO_CONFIGURADO",
      rules: state.provisionalRules ? "PROVISIONALES" : "SEGUN_POLITICA",
    });
  });
  router.post(
    "/maintenance/backup",
    asyncHandler(async (req, res) => {
      assertCapability(req.auth, CAPABILITIES.ADMINISTRAR_PLATAFORMA, {
        area: "AMBAS",
      });
      if (!config.backups.directory)
        return res.status(409).json({
          error: { message: "Configure un destino de copias en el hosting" },
        });
      res.json(await req.app.locals.backups.run());
    }),
  );
  router.get("/policy", (_req, res) => res.json(service.policy()));
  router.get("/:area/drafts", (req, res) =>
    res.json({ drafts: service.drafts(req.auth, req.params.area) }),
  );
  router.get("/:area/drafts/:id", (req, res) =>
    res.json(service.draft(req.auth, req.params.area, req.params.id)),
  );
  router.put(
    "/:area/drafts/:id",
    asyncHandler(async (req, res) => {
      await scanPayload(req.body?.data, config);
      res.json(
        service.saveDraft(req.auth, req.params.area, {
          ...req.body,
          id: req.params.id,
        }),
      );
    }),
  );
  router.delete("/:area/drafts/:id", (req, res) =>
    res.json(
      service.deleteDraft(
        req.auth,
        req.params.area,
        req.params.id,
        req.body.revision,
      ),
    ),
  );
  router.get("/:area/items/:id/documents", (req, res) =>
    res.json(service.documents(req.auth, req.params.area, req.params.id)),
  );
  router.post(
    "/:area/items/:id/documents",
    asyncHandler(async (req, res) => {
      const validationStatus = await scanPayload(req.body, config);
      res.status(201).json(
        service.upload(req.auth, req.params.area, req.params.id, {
          ...req.body,
          validationStatus,
        }),
      );
    }),
  );
  router.get("/:area/items/:id/documents/:documentId", (req, res) => {
    const doc = service.download(
      req.auth,
      req.params.area,
      req.params.id,
      req.params.documentId,
    );
    res
      .type("application/pdf")
      .attachment(doc.name)
      .send(Buffer.from(doc.bytes));
  });
  router.get("/:area/items/:id/receipt", (req, res) =>
    res
      .type("html")
      .attachment(
        `constancia-${req.params.id.replace(/[^a-zA-Z0-9-]/g, "")}.html`,
      )
      .send(service.receipt(req.auth, req.params.area, req.params.id)),
  );
  router.post("/notifications/:id/read", (req, res) =>
    res.json(service.readNotification(req.auth, req.params.id)),
  );
  router.post("/notifications/:id/retry", (req, res) =>
    res.json(service.retryNotification(req.auth, req.params.id)),
  );
  return router;
}
