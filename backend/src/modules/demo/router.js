import { Router } from "express";
import { asyncHandler } from "../../shared/errors.js";
import { assertCapability, CAPABILITIES } from "../core/auth/capabilities.js";

export function createDemoRouter({
  authMiddleware,
  demoService,
  catalogService,
}) {
  const router = Router();
  const route = (method, path, handler) =>
    router[method](path, asyncHandler(handler));
  router.use(authMiddleware);

  route("get", "/bootstrap", async (_req, res) =>
    res.json(await demoService.bootstrap(_req.auth)),
  );
  route("get", "/reportes/investigacion.xlsx", async (req, res) => {
    const bytes = await demoService.exportInvestigation(req.auth, req.query);
    res.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.attachment("Control-misiones-Investigacion.xlsx");
    res.send(Buffer.from(bytes));
  });
  for (const [path, method] of Object.entries({
    "solicitar-prorroga": "requestExtension",
    "decidir-prorroga": "decideExtension",
    "remitir-actividad": "referActivity",
    "enrutar-actividad": "routeActivity",
    "registrar-envio": "recordDispatch",
  })) {
    route("post", `/investigacion/items/:id/${path}`, async (req, res) =>
      res.json({
        request: await demoService[method](
          req.auth,
          req.params.id,
          req.body || {},
        ),
      }),
    );
  }
  route(
    "get",
    "/:area/items/:id/productos/:productId/documento",
    async (req, res) => {
      const document = await demoService.productDocument(
        req.auth,
        req.params.area,
        req.params.id,
        req.params.productId,
      );
      res.set("Content-Type", "application/pdf");
      res.set("Cache-Control", "no-store");
      res.set("X-Content-Type-Options", "nosniff");
      res.attachment(document.name);
      res.send(Buffer.from(document.contentBase64, "base64"));
    },
  );
  route("get", "/:area/items/:id/documentos/:index", async (req, res) => {
    const document = await demoService.intakeDocument(
      req.auth,
      req.params.area,
      req.params.id,
      req.params.index,
      req.query.version,
    );
    res.type("application/pdf");
    res.attachment(document.name);
    res.send(Buffer.from(document.contentBase64, "base64"));
  });
  route("post", "/reset", async (req, res) =>
    res.json(await demoService.reset(req.auth)),
  );
  route("post", "/victimas/items/:id/continuacion", async (req, res) =>
    res.status(201).json({
      request: await demoService.requestVictimsFollowUp(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/victimas/items/:id/solicitar-prorroga", async (req, res) =>
    res.json({
      request: await demoService.requestVictimsExtension(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/victimas/items/:id/decidir-prorroga", async (req, res) =>
    res.json({
      request: await demoService.decideVictimsExtension(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("get", "/supervision/investigacion", async (req, res) => {
    assertCapability(
      req.auth,
      CAPABILITIES.CONSULTAR_INDICADORES_INVESTIGACION,
      { area: "INVESTIGACION", region: req.auth.region },
    );
    res.json({
      supervision: (await demoService.bootstrap(req.auth)).supervision,
    });
  });

  route("get", "/catalogo/servicios", async (req, res) =>
    res.json({
      services: await catalogService.listPublished(req.auth, {
        area: req.query.area,
        at: req.query.at,
      }),
    }),
  );
  route("post", "/catalogo/servicios", async (req, res) =>
    res.status(201).json({
      service: await catalogService.createDraft(req.auth, req.body || {}),
    }),
  );
  route("post", "/catalogo/servicios/:id/enviar-revision", async (req, res) =>
    res.json({
      service: await catalogService.submit(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/catalogo/servicios/:id/publicar", async (req, res) =>
    res.json({
      service: await catalogService.publish(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/catalogo/servicios/:id/retirar", async (req, res) =>
    res.json({
      service: await catalogService.retire(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );

  route("post", "/:area/items/:id/operaciones/:type", async (req, res) =>
    res.status(201).json({
      request: await demoService.registerOperation(
        req.auth,
        req.params.area,
        req.params.id,
        req.params.type,
        req.body || {},
      ),
    }),
  );

  route(
    "post",
    "/investigacion/solicitudes",
    asyncHandler(async (req, res) => {
      res.status(201).json({
        request: await demoService.createInvestigation(
          req.auth,
          req.body || {},
        ),
      });
    }),
  );
  route("post", "/investigacion/items/:id/repartir", async (req, res) =>
    res.json({
      request: await demoService.assignInvestigationItem(
        req.auth,
        req.params.id,
      ),
    }),
  );
  route("post", "/investigacion/items/:id/iniciar", async (req, res) =>
    res.json({
      request: await demoService.startInvestigation(req.auth, req.params.id),
    }),
  );
  route("post", "/investigacion/items/:id/avance", async (req, res) =>
    res.json({
      request: await demoService.progressInvestigation(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/investigacion/items/:id/entregar", async (req, res) =>
    res.json({
      request: await demoService.deliverInvestigation(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/investigacion/items/:id/aprobar-entrega", async (req, res) =>
    res.json({
      request: await demoService.approveInvestigationDelivery(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/investigacion/items/:id/devolver-entrega", async (req, res) =>
    res.json({
      request: await demoService.returnInvestigationDelivery(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );

  route(
    "post",
    "/victimas/solicitudes",
    asyncHandler(async (req, res) => {
      res.status(201).json({
        request: await demoService.createVictims(req.auth, req.body || {}),
      });
    }),
  );
  route("post", "/victimas/items/:id/aprobar-y-repartir", async (req, res) =>
    res.json({
      request: await demoService.approveVictimsAndAssign(
        req.auth,
        req.params.id,
      ),
    }),
  );
  route("post", "/victimas/items/:id/devolver-solicitud", async (req, res) =>
    res.json({
      request: await demoService.returnVictimsRequest(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/victimas/items/:id/corregir-reenviar", async (req, res) =>
    res.json({
      request: await demoService.correctAndResubmitVictims(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/victimas/items/:id/iniciar", async (req, res) =>
    res.json({
      request: await demoService.startVictims(req.auth, req.params.id),
    }),
  );
  route("post", "/victimas/items/:id/avance", async (req, res) =>
    res.json({
      request: await demoService.progressVictims(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );
  route("post", "/victimas/items/:id/finalizar", async (req, res) =>
    res.json({
      request: await demoService.finishVictims(
        req.auth,
        req.params.id,
        req.body || {},
      ),
    }),
  );

  return router;
}
