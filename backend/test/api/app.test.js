import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { createSilentLogger } from "../../src/shared/logger.js";

function testApp() {
  const config = createConfig({
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-with-at-least-thirty-two-characters",
    ENABLE_DEMO_ACCOUNTS: "true",
    DEMO_ADMIN_USER: "admin-test",
    DEMO_ADMIN_PASSWORD: "password-test",
    DEMO_USER_ROLE: "defensor",
  });
  return createApp({ config, logger: createSilentLogger() });
}

async function authenticate(app) {
  const login = await request(app)
    .post("/api/auth/login")
    .send({ document: "admin-test", password: "password-test" })
    .expect(200);
  const selected = await request(app)
    .post("/api/auth/select-account")
    .send({
      preAuthToken: login.body.preAuthToken,
      accountId: login.body.accounts[0].id,
    })
    .expect(200);
  return selected.body.accessToken;
}

test("health conserva compatibilidad y propaga correlacion", async () => {
  const response = await request(testApp())
    .get("/api/health")
    .set("x-request-id", "test-correlation-1")
    .expect(200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "sigip-dp-api");
  assert.equal(response.body.requestId, "test-correlation-1");
  assert.equal(response.headers["x-request-id"], "test-correlation-1");
});

test("readiness hace explicito que la persistencia sigue siendo demo", async () => {
  const response = await request(testApp())
    .get("/api/health/ready")
    .expect(200);
  assert.equal(response.body.status, "ready");
  assert.equal(response.body.checks.persistence, "demo-memory");
});

test("login, seleccion, perfil y bootstrap mantienen el contrato", async () => {
  const app = testApp();
  const token = await authenticate(app);
  const me = await request(app)
    .get("/api/auth/me")
    .set("authorization", `Bearer ${token}`)
    .expect(200);
  assert.equal(me.body.profile.role, "administrador");
  const bootstrap = await request(app)
    .get("/api/bootstrap")
    .set("authorization", `Bearer ${token}`)
    .expect(200);
  assert.equal(bootstrap.body.specialties.length, 17);
  assert.ok(Array.isArray(bootstrap.body.missions));
});

test("una ruta protegida rechaza peticiones sin token con error correlacionado", async () => {
  const response = await request(testApp()).get("/api/bootstrap").expect(401);
  assert.equal(response.body.error.code, "TOKEN_REQUIRED");
  assert.equal(response.body.error.requestId, response.headers["x-request-id"]);
});

test("rutas desconocidas y JSON invalido usan el manejador central", async () => {
  const missing = await request(testApp()).get("/api/no-existe").expect(404);
  assert.equal(missing.body.error.code, "ROUTE_NOT_FOUND");

  const invalid = await request(testApp())
    .post("/api/auth/login")
    .set("content-type", "application/json")
    .send('{"document":')
    .expect(400);
  assert.equal(invalid.body.error.code, "INVALID_JSON");
});
