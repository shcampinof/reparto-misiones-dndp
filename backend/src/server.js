import path from "node:path";
import {
  createApp,
  createSeedFactory,
  configureRuntimeState,
} from "./app/create-app.js";
import { OracleRepository } from "./infrastructure/persistence/oracle/repository.js";
import { createConfig } from "./config/index.js";
import { loadEnvFile } from "./config/load-env.js";
import { createLogger } from "./shared/logger.js";

if (process.env.SIGIP_ENV_FILE)
  loadEnvFile(path.resolve(process.env.SIGIP_ENV_FILE));
else {
  loadEnvFile(path.resolve(process.cwd(), "../.env"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

async function main() {
  const config = createConfig();
  const logger = createLogger({ level: config.logLevel });
  const repository =
    config.storage.driver === "oracle"
      ? await OracleRepository.open(
          config.oracle,
          createSeedFactory(config),
          (state) => configureRuntimeState(state, config),
        )
      : undefined;
  const app = createApp({ config, logger, repository });
  app.locals.backups.start();

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
    app.locals.backups.stop();
    logger.info({ signal }, "service_stopping");
    server.close(async (error) => {
      try {
        await app.locals.demoRepository.close?.();
      } catch {
        process.exitCode = 1;
      }
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
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "startup_failed",
      code: error.code || error.name,
      ...(error.issues ? { configuration: error.issues } : {}),
    }),
  );
  process.exitCode = 1;
});
