import path from "node:path";
import { createConfig } from "../src/config/index.js";
import { loadEnvFile } from "../src/config/load-env.js";
import { applyOracleMigrations } from "../src/infrastructure/persistence/oracle/migrator.js";
import { createOraclePool } from "../src/infrastructure/persistence/oracle/pool.js";

loadEnvFile(path.resolve(process.cwd(), "../.env"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const config = createConfig({
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_PROFILE: "institutional",
  PERSISTENCE_DRIVER: "oracle",
  ENABLE_DEMO_ACCOUNTS: "false",
  DEMO_MODE: "false",
});

const pool = await createOraclePool(config.persistence.oracle);
try {
  const applied = await applyOracleMigrations(pool, {
    allowMigration: config.persistence.oracle.allowMigration,
  });
  process.stdout.write(
    applied.length
      ? `Migraciones Oracle aplicadas: ${applied.join(", ")}\n`
      : "Esquema Oracle actualizado; no había migraciones pendientes.\n",
  );
} finally {
  await pool.close(10);
}
