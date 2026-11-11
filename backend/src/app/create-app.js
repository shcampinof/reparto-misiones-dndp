import cors from "cors";
import express from "express";
import { InMemoryDemoRepository } from "../infrastructure/demo/demo-repository.js";
import { SqliteRepository } from "../infrastructure/persistence/sqlite-repository.js";
import { createDemoSeed } from "../infrastructure/demo/seeds.js";
import { applyProvisionalRules } from "../modules/core/policies/provisional.js";
import { buildDemoUsers } from "../infrastructure/demo/demo-users.js";
import { assignmentModule } from "../modules/assignment/index.js";
import { createAuthMiddleware } from "../modules/core/auth/middleware.js";
import { createAuthRouter } from "../modules/core/auth/router.js";
import { createAuthService } from "../modules/core/auth/service.js";
import {
  createHealthRouter,
  readinessPayload,
} from "../modules/core/health/router.js";
import { coreModule } from "../modules/core/index.js";
import { createDemoRouter } from "../modules/demo/router.js";
import { createDemoService } from "../modules/demo/service.js";
import { createCatalogService } from "../modules/core/catalogs/service.js";
import { integrationsModule } from "../modules/integrations/index.js";
import { investigationModule } from "../modules/investigacion/index.js";
import { reportingModule } from "../modules/reporting/index.js";
import { victimsModule } from "../modules/victimas/index.js";
import { AppError } from "../shared/errors.js";
import { createWorkspaceService } from "../modules/core/workspace/service.js";
import { createWorkspaceRouter } from "../modules/core/workspace/router.js";
import { createBackupSchedule } from "../infrastructure/persistence/backup-schedule.js";
import { scanPayload } from "../infrastructure/documents/antimalware.js";
import { asyncHandler } from "../shared/errors.js";
import {
  errorHandler,
  notFoundHandler,
} from "../shared/middleware/error-handler.js";
import { requestContext } from "../shared/middleware/request-context.js";
import { requestLogger } from "../shared/middleware/request-logger.js";

export function createApp({ config, logger, clock }) {
  const app = express();
  const users = buildDemoUsers(config);
  const authService = createAuthService({ config, users });
  const authMiddleware = createAuthMiddleware(config);
  const seedFactory = () => {
    const seed = createDemoSeed();
    seed.filePolicy = config.files;
    return config.provisionalRules ? applyProvisionalRules(seed) : seed;
  };
  const demoRepository =
    config.storage.driver === "sqlite"
      ? new SqliteRepository(config.storage.filename, seedFactory)
      : new InMemoryDemoRepository(seedFactory);
  const storedRules = demoRepository.snapshot().provisionalRules;
  if (
    storedRules &&
    (storedRules.operationalEnabled !== false) !== config.provisionalRules
  ) {
    demoRepository.transaction((state) => {
      state.provisionalRules.operationalEnabled = config.provisionalRules;
      for (const policy of [
        ...state.investigationPolicies,
        ...(state.victimsPolicies || []),
        ...state.catalogs.services.map((service) => service.termPolicy),
      ]) {
        if (policy.status === "PROVISIONAL")
          policy.operationalEnabled = config.provisionalRules;
      }
    });
  }
  const catalogService = createCatalogService({ repository: demoRepository });
  demoRepository.transaction((state) => {
    state.filePolicy = config.files;
  });
  const demoService = createDemoService({
    repository: demoRepository,
    catalogService,
    clock,
    filePolicy: config.files,
  });
  const workspaceService = createWorkspaceService({
    repository: demoRepository,
    config,
    clock,
  });
  app.locals.backups = createBackupSchedule({
    filename: config.storage.filename,
    ...config.backups,
  });

  app.disable("x-powered-by");
  app.locals.config = config;
  app.locals.demoRepository = demoRepository;
  app.locals.modules = [
    coreModule,
    investigationModule,
    victimsModule,
    assignmentModule,
    reportingModule,
    integrationsModule,
  ];

  app.use(requestContext);
  app.use(requestLogger(logger));
  if (config.corsOrigins.length > 0) {
    app.use(
      cors({
        origin(origin, callback) {
          if (!origin || config.corsOrigins.includes(origin))
            return callback(null, true);
          return callback(
            new AppError(
              403,
              "CORS_ORIGIN_DENIED",
              "Origen no permitido por CORS",
            ),
          );
        },
        credentials: true,
        exposedHeaders: ["x-request-id"],
      }),
    );
  }
  app.use(express.json({ limit: config.files.maxRequestBytes }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });

  app.use("/api/health", createHealthRouter({ config }));
  app.get("/api/ready", (req, res) => res.json(readinessPayload(req)));
  app.use("/api/auth", createAuthRouter({ authService, authMiddleware }));
  if (config.auth.demoEnabled) {
    app.use(
      "/api/workspace",
      createWorkspaceRouter({
        authMiddleware,
        service: workspaceService,
        config,
        repository: demoRepository,
      }),
    );
    app.use(
      "/api/demo",
      authMiddleware,
      asyncHandler(async (req, _res, next) => {
        if (["POST", "PUT"].includes(req.method))
          await scanPayload(req.body, config);
        next();
      }),
      createDemoRouter({ authMiddleware, demoService, catalogService }),
    );
  }

  if (config.staticDir) {
    app.use(express.static(config.staticDir, { index: false }));
    app.get("*", (req, res, next) => {
      if (req.path === "/api" || req.path.startsWith("/api/")) return next();
      return res.sendFile("index.html", { root: config.staticDir }, (error) => {
        if (error) next(error);
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
