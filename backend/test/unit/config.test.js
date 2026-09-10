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

test("produccion permite exclusivamente el modo demo explícito para el Space", () => {
  const config = createConfig({
    NODE_ENV: "production",
    PORT: "7860",
    HOST: "0.0.0.0",
    DEMO_MODE: "true",
    DEMO_RESET_ON_START: "true",
    JWT_SECRET: "s".repeat(32),
    STATIC_DIR: "/app/public",
  });
  assert.equal(config.auth.demoEnabled, true);
  assert.equal(config.demoResetOnStart, true);
  assert.equal(config.port, 7860);
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.staticDir, "/app/public");
  assert.deepEqual(config.corsOrigins, []);
});

test("los perfiles conservadores de presentación pueden ocultarse por configuración", () => {
  const config = createConfig({
    NODE_ENV: "development",
    ENABLE_ROLE_GESTOR_OPERATIVO_REGIONAL: "false",
    ENABLE_ROLE_GESTOR_CENTRAL_EXCEPCIONES: "false",
    ENABLE_ROLE_DEFENSOR_REGIONAL: "false",
  });
  assert.equal(config.auth.roleFlags.gestor_operativo_regional, false);
  assert.equal(config.auth.roleFlags.gestor_central_excepciones, false);
  assert.equal(config.auth.roleFlags.defensor_regional, false);
  assert.equal(config.auth.roleFlags.coordinador, undefined);
  assert.equal(config.auth.roleFlags.administrativo_delegado, undefined);
  assert.equal(config.auth.roleFlags.pag_unidad_operativa, undefined);
});
