import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "../../src/config/load-env.js";
import { createConfig } from "../../src/config/index.js";
import {
  createSeedFactory,
  configureRuntimeState,
} from "../../src/app/create-app.js";
import { OracleRepository } from "../../src/infrastructure/persistence/oracle/repository.js";

// Requires an explicitly designated integration-test schema with migrations.
// Never runs merely because credentials are present in an env file.
test(
  "Oracle REAL: bloqueo entre conexiones, rollback y conservación al reabrir",
  {
    skip:
      process.env.SIGIP_ORACLE_TESTS !== "true"
        ? "Requiere listener, credenciales y SIGIP_ORACLE_TESTS=true en esquema dedicado"
        : false,
  },
  async () => {
    if (process.env.SIGIP_ENV_FILE)
      loadEnvFile(path.resolve(process.env.SIGIP_ENV_FILE));
    const config = createConfig({ ...process.env, STORAGE_DRIVER: "oracle" });
    const open = () =>
      OracleRepository.open(config.oracle, createSeedFactory(config), (state) =>
        configureRuntimeState(state, config),
      );
    const one = await open(),
      two = await open();
    const key = `oracle-integration-${randomUUID()}`;
    try {
      await one.transaction((state) => {
        state.integrationChecks ||= {};
        state.integrationChecks[key] = 0;
      });
      await Promise.all(
        [one, two].map((repo) =>
          repo.transaction(async (state) => {
            const n = state.integrationChecks[key];
            await new Promise((resolve) => setTimeout(resolve, 20));
            state.integrationChecks[key] = n + 1;
          }),
        ),
      );
      assert.equal((await two.snapshot()).integrationChecks[key], 2);
      await assert.rejects(
        one.transaction((state) => {
          state.integrationChecks[key] = 999;
          throw new Error("ABORT_INTEGRATION");
        }),
        /ABORT_INTEGRATION/,
      );
      assert.equal((await two.snapshot()).integrationChecks[key], 2);
    } finally {
      await one.close();
      await two.close();
    }
    const restored = await open();
    try {
      assert.equal((await restored.snapshot()).integrationChecks[key], 2);
    } finally {
      await restored.close();
    }
  },
);
