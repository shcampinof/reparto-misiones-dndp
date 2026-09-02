import cors from "cors";
import express from "express";
import { buildDemoUsers } from "../infrastructure/demo/demo-users.js";
import {
  createAssignmentRouter,
  assignmentModule,
} from "../modules/assignment/router.js";
import { createAuthMiddleware } from "../modules/core/auth/middleware.js";
import { createAuthRouter } from "../modules/core/auth/router.js";
import { createAuthService } from "../modules/core/auth/service.js";
import { createHealthRouter } from "../modules/core/health/router.js";
import { coreModule } from "../modules/core/index.js";
import { createPortalRouter } from "../modules/core/portal/router.js";
import { integrationsModule } from "../modules/integrations/index.js";
import { investigationModule } from "../modules/investigacion/index.js";
import { createInvestigationRouter } from "../modules/investigacion/router.js";
import { reportingModule } from "../modules/reporting/index.js";
import { victimsModule } from "../modules/victimas/index.js";
import { AppError } from "../shared/errors.js";
import {
  errorHandler,
  notFoundHandler,
} from "../shared/middleware/error-handler.js";
import { requestContext } from "../shared/middleware/request-context.js";
import { requestLogger } from "../shared/middleware/request-logger.js";

export function createApp({ config, logger }) {
  const app = express();
  const users = buildDemoUsers(config);
  const authService = createAuthService({ config, users });
  const authMiddleware = createAuthMiddleware(config);

  app.disable("x-powered-by");
  app.locals.config = config;
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
  app.use(express.json({ limit: "5mb" }));

  app.use("/api/health", createHealthRouter({ config }));
  app.use("/api/auth", createAuthRouter({ authService, authMiddleware }));
  app.use("/api", createPortalRouter({ authMiddleware, config }));
  app.use("/api", createInvestigationRouter({ authMiddleware }));
  app.use("/api", createAssignmentRouter({ authMiddleware }));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
