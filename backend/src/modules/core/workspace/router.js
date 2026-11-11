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
  const route = (method, path, handler) =>
    router[method](path, asyncHandler(handler));
  router.use(authMiddleware);
  route("get", "/maintenance", async (req, res) => {
    assertCapability(req.auth, CAPABILITIES.ADMINISTRAR_PLATAFORMA, {
      area: "AMBAS",
    });
    const state = await repository.snapshot(),
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
  route(
    "post",
    "/maintenance/backup",
    asyncHandler(async (req, res) => {
      assertCapability(req.auth, CAPABILITIES.ADMINISTRAR_PLATAFORMA, {
        area: "AMBAS",
      });
      if (config.storage.driver === "oracle")
        return res.status(409).json({
          error: {
            code: "ORACLE_BACKUP_MANAGED_BY_DBA",
            message: "El respaldo Oracle se gestiona con el DBA",
          },
        });
      if (!req.app.locals.backups.status.configured)
        return res.status(409).json({
          error: { message: "Configure un destino de copias en el hosting" },
        });
      res.json(await req.app.locals.backups.run());
    }),
  );
  route("get", "/policy", async (_req, res) =>
    res.json(await service.policy()),
  );
  route("get", "/:area/drafts", async (req, res) =>
    res.json({ drafts: await service.drafts(req.auth, req.params.area) }),
  );
  route("get", "/:area/drafts/:id", async (req, res) =>
    res.json(await service.draft(req.auth, req.params.area, req.params.id)),
  );
  route(
    "put",
    "/:area/drafts/:id",
    asyncHandler(async (req, res) => {
      await scanPayload(req.body?.data, config);
      res.json(
        await service.saveDraft(req.auth, req.params.area, {
          ...req.body,
          id: req.params.id,
        }),
      );
    }),
  );
  route("delete", "/:area/drafts/:id", async (req, res) =>
    res.json(
      await service.deleteDraft(
        req.auth,
        req.params.area,
        req.params.id,
        req.body.revision,
      ),
    ),
  );
  route("get", "/:area/items/:id/documents", async (req, res) =>
    res.json(await service.documents(req.auth, req.params.area, req.params.id)),
  );
  route(
    "post",
    "/:area/items/:id/documents",
    asyncHandler(async (req, res) => {
      const validationStatus = await scanPayload(req.body, config);
      res.status(201).json(
        await service.upload(req.auth, req.params.area, req.params.id, {
          ...req.body,
          validationStatus,
        }),
      );
    }),
  );
  route("get", "/:area/items/:id/documents/:documentId", async (req, res) => {
    const doc = await service.download(
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
  route("get", "/:area/items/:id/receipt", async (req, res) =>
    res
      .type("html")
      .attachment(
        `constancia-${req.params.id.replace(/[^a-zA-Z0-9-]/g, "")}.html`,
      )
      .send(await service.receipt(req.auth, req.params.area, req.params.id)),
  );
  route("post", "/notifications/:id/read", async (req, res) =>
    res.json(await service.readNotification(req.auth, req.params.id)),
  );
  route("post", "/notifications/:id/retry", async (req, res) =>
    res.json(await service.retryNotification(req.auth, req.params.id)),
  );
  return router;
}
