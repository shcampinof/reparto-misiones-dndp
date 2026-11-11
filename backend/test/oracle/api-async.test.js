import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import {
  createApp,
  createSeedFactory,
  configureRuntimeState,
} from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { createSilentLogger } from "../../src/shared/logger.js";
import { OracleRepository } from "../../src/infrastructure/persistence/oracle/repository.js";
import { fakeOraclePool } from "../../test-support/fake-oracle.js";

function setup() {
  const config = createConfig({
    NODE_ENV: "test",
    STORAGE_DRIVER: "oracle",
    ORACLE_USER: "TEST",
    ORACLE_PASSWORD: "synthetic-test-only",
    ORACLE_CONNECT_STRING: "example.invalid/test",
    ORACLE_SEED_DEMO: "true",
    ENABLE_DEMO_ACCOUNTS: "true",
  });
  const seed = createSeedFactory(config)();
  configureRuntimeState(seed, config);
  const pool = fakeOraclePool(seed);
  const repository = new OracleRepository(pool, config.oracle);
  const app = createApp({ config, repository, logger: createSilentLogger() });
  return { app, pool, repository };
}
async function login(app, id) {
  const response = await request(app)
    .post("/api/auth/demo-login")
    .send({ userId: id })
    .expect(200);
  return { Authorization: `Bearer ${response.body.accessToken}` };
}

test("API asíncrona: lectura, catálogo, borradores, documentos y permisos esperan el repositorio", async () => {
  const { app, repository } = setup();
  const defender = await login(app, "demo-defensor"),
    rjv = await login(app, "demo-rjv"),
    pag = await login(app, "demo-pag-victimas");
  const ready = await request(app).get("/api/ready").expect(200);
  assert.equal(ready.body.checks.persistence, "oracle-transactional");
  const admin = await login(app, "demo-admin");
  const backup = await request(app)
    .post("/api/workspace/maintenance/backup")
    .set(admin)
    .expect(409);
  assert.equal(backup.body.error.code, "ORACLE_BACKUP_MANAGED_BY_DBA");
  const bootstrap = await request(app)
    .get("/api/demo/bootstrap")
    .set(defender)
    .expect(200);
  assert.ok(bootstrap.body.requests.every((r) => r.area === "INVESTIGACION"));
  const catalogs = await request(app)
    .get("/api/demo/catalogo/servicios?area=INVESTIGACION")
    .set(defender)
    .expect(200);
  assert.ok(catalogs.body.services.length > 0);
  const id = randomUUID();
  await request(app)
    .put(`/api/workspace/investigacion/drafts/${id}`)
    .set(defender)
    .send({ revision: 0, data: { form: { spoa: "000016000049202600001" } } })
    .expect(200);
  const draft = await request(app)
    .get(`/api/workspace/investigacion/drafts/${id}`)
    .set(defender)
    .expect(200);
  assert.equal(draft.body.data.form.spoa, "000016000049202600001");
  await request(app)
    .get(`/api/workspace/investigacion/drafts/${id}`)
    .set(rjv)
    .expect(403);
  await request(app)
    .delete(`/api/workspace/investigacion/drafts/${id}`)
    .set(defender)
    .send({ revision: 1 })
    .expect(200);
  const path =
    "/api/demo/victimas/items/VIC-ITEM-DEMO-0001/productos/PROD-VIC-ITEM-DEMO-0001-F171-1/documento";
  const pdf = await request(app).get(path).set(rjv).expect(200);
  assert.equal(pdf.body.subarray(0, 5).toString(), "%PDF-");
  await request(app).get(path).set(pag).expect(403);
  const state = await repository.snapshot();
  assert.deepEqual(
    state.audit.map((e) => e.type),
    ["BORRADOR_GUARDADO", "BORRADOR_ARCHIVADO"],
  );
  const item = state.requests
    .flatMap((r) => r.items)
    .find((i) => i.id === "VIC-ITEM-DEMO-0001");
  assert.match(item.timeline.at(-1).message, /Consulta del PDF/);
});

test("API asíncrona: fallo de commit responde error y conserva la operación anterior", async () => {
  const { app, pool, repository } = setup();
  const defender = await login(app, "demo-defensor");
  const before = await repository.snapshot();
  pool.failCommit = true;
  const response = await request(app)
    .put(`/api/workspace/investigacion/drafts/${randomUUID()}`)
    .set(defender)
    .send({ revision: 0, data: { form: {} } })
    .expect(500);
  assert.equal(response.body.error.code, "INTERNAL_ERROR");
  assert.deepEqual(await repository.snapshot(), before);
});

test("API asíncrona: reintento concurrente de radicación conserva un solo reparto y outbox", async () => {
  const { app, repository } = setup();
  const defender = await login(app, "demo-defensor");
  const payload = {
    submissionId: randomUUID(),
    identifierType: "SPOA",
    spoa: "000016000049202699999",
    processReference: "Prueba de contrato",
    delito: "Conducta de prueba",
    proceduralStage: "INVESTIGACION",
    hearingApplies: false,
    facts: "Hechos de prueba",
    hypothesis: "Hipótesis de prueba",
    requiredWork: "Verificar información de prueba",
    differentialApproach: { applies: false, detail: null },
    priority: { type: "ORDINARIA", reason: null, support: null },
    persons: [
      { alias: "Persona sintética", relationship: "Procesado/a", notes: null },
    ],
    documents: [{ type: "SOLICITUD_DEFENSA", reference: "CONTRACT-TEST" }],
    service: "SVC_INV_VERIFICACION_TERRENO",
    region: "BOGOTA",
  };
  const results = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post("/api/demo/investigacion/solicitudes")
        .set(defender)
        .send(payload)
        .expect(201),
    ),
  );
  assert.equal(results[0].body.request.id, results[1].body.request.id);
  const state = await repository.snapshot();
  const matches = state.requests.filter((r) => r.externalId === payload.spoa);
  assert.equal(matches.length, 1);
  assert.ok(matches[0].items[0].assignment);
  assert.equal(
    state.outbox.filter((e) => e.requestId === matches[0].id).length,
    1,
  );
});
