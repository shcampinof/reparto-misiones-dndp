import path from "node:path";
import { createConfig } from "../../../config/index.js";
import { loadEnvFile } from "../../../config/load-env.js";
import {
  configureRuntimeState,
  createSeedFactory,
} from "../../../app/create-app.js";
import {
  createOraclePool,
  queryOptions,
  withOracleConnection,
} from "./connection.js";
import { migrateOracle } from "./migrations.js";
import { OracleRepository } from "./repository.js";

if (process.env.SIGIP_ENV_FILE)
  loadEnvFile(path.resolve(process.env.SIGIP_ENV_FILE));
else {
  loadEnvFile(path.resolve(process.cwd(), "../.env"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

let pool;
try {
  const config = createConfig({ ...process.env, STORAGE_DRIVER: "oracle" });
  const command = process.argv[2] || "check";
  if (!["check", "migrate", "init"].includes(command))
    throw new Error("ORACLE_COMMAND_INVALID");
  if (command === "init") {
    const repository = await OracleRepository.open(
      config.oracle,
      createSeedFactory(config),
      (state) => configureRuntimeState(state, config),
    );
    try {
      console.log(
        JSON.stringify({
          status: "INICIALIZADO",
          ...(await repository.check()),
        }),
      );
    } finally {
      await repository.close();
    }
  } else {
    pool = await createOraclePool(config.oracle);
    const result =
      command === "migrate"
        ? await migrateOracle(pool, config.oracle)
        : await withOracleConnection(
            pool,
            config.oracle,
            async (connection) => {
              const schema = await connection.execute(
                "SELECT SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS ESQUEMA FROM DUAL",
                {},
                queryOptions,
              );
              const tables = await connection.execute(
                "SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME LIKE 'SIGIP\\_%' ESCAPE '\\' ORDER BY TABLE_NAME",
                {},
                queryOptions,
              );
              return {
                status: "CONECTADO",
                thin: connection.thin,
                version: connection.oracleServerVersionString,
                schema: schema.rows[0].ESQUEMA,
                tables: tables.rows.map((r) => r.TABLE_NAME),
              };
            },
          );
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  // Driver error messages may contain connection details. Never print credentials.
  console.error(
    JSON.stringify({
      status: "PENDIENTE",
      code: error.code || error.name,
      ...(error.issues ? { missingConfiguration: error.issues } : {}),
    }),
  );
  process.exitCode = 1;
} finally {
  if (pool) await pool.close(0);
}
