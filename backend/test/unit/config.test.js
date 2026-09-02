import assert from "node:assert/strict";
import test from "node:test";
import { ConfigurationError, createConfig } from "../../src/config/index.js";

test("desarrollo genera un secreto efimero cuando no se configura JWT", () => {
  const config = createConfig({ NODE_ENV: "development" });
  assert.equal(config.environment, "development");
  assert.equal(config.auth.ephemeralJwtSecret, true);
  assert.equal(config.auth.demoEnabled, false);
  assert.ok(config.auth.jwtSecret.length >= 32);
});

test("produccion exige un secreto robusto", () => {
  assert.throws(
    () => createConfig({ NODE_ENV: "production" }),
    (error) =>
      error instanceof ConfigurationError &&
      error.issues.includes("JWT_SECRET es obligatorio en produccion"),
  );
});

test("produccion rechaza cuentas demo", () => {
  assert.throws(
    () =>
      createConfig({
        NODE_ENV: "production",
        JWT_SECRET: "x".repeat(32),
        ENABLE_DEMO_ACCOUNTS: "true",
        DEMO_ADMIN_PASSWORD: "solo-prueba",
      }),
    (error) =>
      error instanceof ConfigurationError &&
      error.issues.includes(
        "ENABLE_DEMO_ACCOUNTS no puede habilitarse en produccion",
      ),
  );
});
