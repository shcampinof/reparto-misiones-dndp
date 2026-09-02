import path from "node:path";
import { createApp } from "./app/create-app.js";
import { createConfig } from "./config/index.js";
import { loadEnvFile } from "./config/load-env.js";
import { createLogger } from "./shared/logger.js";

loadEnvFile(path.resolve(process.cwd(), "../.env"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const config = createConfig();
const logger = createLogger({ level: config.logLevel });
const app = createApp({ config, logger });

const server = app.listen(config.port, config.host, () => {
  logger.info(
    {
      service: config.serviceName,
      version: config.serviceVersion,
      environment: config.environment,
      host: config.host,
      port: config.port,
      demoAccounts: config.auth.demoEnabled,
      demoResetOnStart: config.demoResetOnStart,
      ephemeralJwtSecret: config.auth.ephemeralJwtSecret,
    },
    "service_started",
  );
});

function shutdown(signal) {
  logger.info({ signal }, "service_stopping");
  server.close((error) => {
    if (error) {
      logger.error(
        { errorName: error.name, errorMessage: error.message },
        "service_stop_failed",
      );
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
