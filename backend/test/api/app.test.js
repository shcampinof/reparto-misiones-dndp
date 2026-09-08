import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { createSilentLogger } from "../../src/shared/logger.js";

const TEST_SECRET = "test-secret-with-at-least-thirty-two-characters";

async function testApp(overrides = {}) {
  const config = createConfig({
    NODE_ENV: "test",
    JWT_SECRET: TEST_SECRET,
    ENABLE_DEMO_ACCOUNTS: "true",
    ...overrides,
  });
  return createApp({ config, logger: createSilentLogger() });
}

function tokenFor(claims) {
  return jwt.sign(claims, TEST_SECRET, { expiresIn: "1h" });
}

async function login(app, userId) {
  const response = await request(app)
    .post("/api/auth/demo-login")
    .send({ userId })
    .expect(200);
  return response.body.accessToken;
}

function auth(token) {
  return { authorization: `Bearer ${token}` };
}

function itemFrom(response) {
  return response.body.request.items[0];
}

test("salud, cuentas sintéticas y protección de rutas", async () => {
  const app = await testApp();
  const health = await request(app)
    .get("/api/health")
    .set("x-request-id", "demo-correlation-1")
    .expect(200);
  assert.equal(health.body.ok, true);
  assert.equal(health.headers["x-request-id"], "demo-correlation-1");

  const ready = await request(app).get("/api/health/ready").expect(200);
  assert.equal(ready.body.checks.persistence.driver, "sqlite");
  assert.equal(ready.body.checks.persistence.status, "ready");
  const spaceReady = await request(app).get("/api/ready").expect(200);
  assert.equal(spaceReady.body.status, "ready");

  const accounts = await request(app)
    .get("/api/auth/demo-accounts")
    .expect(200);
  assert.ok(accounts.body.accounts.length >= 8);
  assert.ok(
    accounts.body.accounts.every((account) =>
      account.userId.startsWith("demo-"),
    ),
  );
  assert.ok(
    accounts.body.accounts.every(
      (account) => !Object.hasOwn(account, "password"),
    ),
  );

  const denied = await request(app).get("/api/demo/bootstrap").expect(401);
  assert.equal(denied.body.error.code, "TOKEN_REQUIRED");
});

test("sirve la SPA en rutas internas sin interceptar endpoints API", async () => {
  const app = await testApp({ STATIC_DIR: "test/fixtures/public" });
  const portal = await request(app).get("/portal").expect(200);
  assert.match(portal.text, /SIGIP-DP fixture/);
  assert.match(portal.headers["content-type"], /text\/html/);

  const missingApi = await request(app).get("/api/no-existe").expect(404);
  assert.equal(missingApi.body.error.code, "ROUTE_NOT_FOUND");
});

test("recorrido completo de Investigación exige aprobación final PAG", async () => {
  const app = await testApp();
  const defender = await login(app, "demo-defensor");
  const investigator = await login(app, "demo-investigador");
  const pag = await login(app, "demo-pag-investigacion");

  const before = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(investigator))
    .expect(200);
  assert.deepEqual(
    before.body.requests.map((entry) => entry.id),
    ["INV-2026-0002"],
  );
  assert.ok(
    before.body.requests.every((entry) =>
      entry.items.every((item) => item.assigneeId === "inv-demo-02"),
    ),
    "el investigador solo debe ver sus propios encargos",
  );

  await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send({
      spoa: "110016000049202600090",
      delito: "Intento de selección manual",
      service: "INVESTIGACION_CAMPO",
      region: "BOGOTA",
      investigadorId: "inv-demo-01",
    })
    .expect(400);

  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send({
      spoa: "110016000049202600002",
      delito: "Delito sintético para demostración",
      service: "INVESTIGACION_CAMPO",
      region: "BOGOTA",
    })
    .expect(201);
  let item = itemFrom(created);
  assert.equal(item.status, "RADICADA");

  const assigned = await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/repartir`)
    .set(auth(defender))
    .send({ assigneeId: "inv-demo-01" })
    .expect(200);
  item = itemFrom(assigned);
  assert.equal(item.status, "ASIGNADA");
  assert.equal(
    item.assigneeId,
    "inv-demo-02",
    "el backend decide por menor carga",
  );
  assert.ok(item.assignment.evaluated.length >= 3);
  assert.ok(
    item.assignment.evaluated.some(
      (candidate) => candidate.exclusions.length > 0,
    ),
  );

  const own = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(investigator))
    .expect(200);
  assert.deepEqual(
    own.body.requests.map((entry) => entry.id),
    [created.body.request.id, "INV-2026-0002"],
  );
  assert.ok(
    own.body.requests.every((entry) => entry.id !== "INV-2026-0001"),
    "la bandeja no debe incluir encargos de otro investigador",
  );

  await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/iniciar`)
    .set(auth(investigator))
    .expect(200);
  await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/avance`)
    .set(auth(investigator))
    .send({ progress: 55, observation: "Avance sintético verificado" })
    .expect(200);
  const delivered = await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/entregar`)
    .set(auth(investigator))
    .send({ reference: "INF-2026-0004" })
    .expect(200);
  assert.equal(itemFrom(delivered).status, "INFORME_ENTREGADO");

  const approved = await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/aprobar-entrega`)
    .set(auth(pag))
    .expect(200);
  assert.equal(itemFrom(approved).status, "CERRADA");
  assert.equal(
    itemFrom(approved).timeline.at(-1).actor,
    "demo-pag-investigacion",
  );
});

test("recorrido completo de Víctimas tiene aprobación previa y cierre directo F-171", async () => {
  const app = await testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const expert = await login(app, "demo-perito-psicologia");
  const payload = {
    externalId: "RAD-2026-0099",
    law: "LEY_1448",
    service: "PSICOLOGICO",
    region: "BOGOTA",
    victimCount: 2,
  };

  const cannotChoose = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send({ ...payload, peritoId: "per-demo-psi-02" })
    .expect(400);
  assert.equal(cannotChoose.body.error.code, "DEMO_VALIDATION_ERROR");

  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(payload)
    .expect(201);
  let item = itemFrom(created);
  assert.equal(item.status, "PENDIENTE_APROBACION_PAG");
  assert.equal(created.body.request.persons.length, 2);

  const assigned = await request(app)
    .post(`/api/demo/victimas/items/${item.id}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);
  item = itemFrom(assigned);
  assert.equal(item.status, "ASIGNADA");
  assert.equal(item.assigneeId, "per-demo-psi-01");
  assert.ok(item.timeline.some((event) => event.to === "APROBADA_REPARTO"));
  assert.ok(
    item.assignment.evaluated.some((candidate) =>
      candidate.exclusions.some((reason) => /Ley\/programa/i.test(reason)),
    ),
  );

  await request(app)
    .post(`/api/demo/victimas/items/${item.id}/iniciar`)
    .set(auth(expert))
    .expect(200);
  await request(app)
    .post(`/api/demo/victimas/items/${item.id}/avance`)
    .set(auth(expert))
    .send({ progress: 70, observation: "Valoración sintética en curso" })
    .expect(200);
  const finished = await request(app)
    .post(`/api/demo/victimas/items/${item.id}/finalizar`)
    .set(auth(expert))
    .send({ f171Reference: "F171-2026-0099" })
    .expect(200);
  item = itemFrom(finished);
  assert.equal(item.status, "CERRADA");
  assert.equal(item.timeline.at(-1).actor, "demo-perito-psicologia");
  assert.match(item.timeline.at(-1).message, /sin aprobación final/i);

  await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/aprobar-entrega`)
    .set(auth(pag))
    .expect(403);
});

test("PAG devuelve una solicitud de Víctimas y el RJV corrige y reenvía conservando versiones", async () => {
  const app = await testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send({
      externalId: "RAD-2026-0088",
      law: "LEY_1448",
      service: "PSICOLOGICO",
      region: "BOGOTA",
      victimCount: 2,
    })
    .expect(201);
  const itemId = itemFrom(created).id;

  await request(app)
    .post(`/api/demo/victimas/items/${itemId}/devolver-solicitud`)
    .set(auth(pag))
    .send({})
    .expect(400);

  const returned = await request(app)
    .post(`/api/demo/victimas/items/${itemId}/devolver-solicitud`)
    .set(auth(pag))
    .send({ observation: "Adjuntar soporte de parentesco" })
    .expect(200);
  assert.equal(itemFrom(returned).status, "DEVUELTA");
  assert.equal(returned.body.request.versions.length, 1);
  assert.deepEqual(returned.body.request.versions[0].data.persons, [
    { alias: "Persona vinculada 001", type: "DIRECTA" },
    { alias: "Persona vinculada 002", type: "INDIRECTA" },
  ]);
  assert.equal(
    returned.body.request.versions[0].review.observation,
    "Adjuntar soporte de parentesco",
  );
  assert.match(itemFrom(returned).timeline.at(-1).message, /devuelta al RJV/i);

  await request(app)
    .post(`/api/demo/victimas/items/${itemId}/corregir-reenviar`)
    .set(auth(rjv))
    .send({})
    .expect(400);

  const resent = await request(app)
    .post(`/api/demo/victimas/items/${itemId}/corregir-reenviar`)
    .set(auth(rjv))
    .send({
      correctionSummary: "Soporte incorporado y grupo familiar actualizado",
      victimCount: 7,
    })
    .expect(200);
  assert.equal(itemFrom(resent).status, "PENDIENTE_APROBACION_PAG");
  assert.equal(resent.body.request.persons.length, 7);
  assert.equal(resent.body.request.versions.length, 2);
  assert.equal(resent.body.request.versions[0].data.persons.length, 2);
  assert.equal(resent.body.request.versions[1].data.persons.length, 7);
  assert.match(
    itemFrom(resent).timeline.at(-1).message,
    /corregida y reenviada/i,
  );

  const approved = await request(app)
    .post(`/api/demo/victimas/items/${itemId}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);
  assert.equal(itemFrom(approved).status, "ASIGNADA");
});

test("el administrador técnico no puede adoptar decisiones operativas", async () => {
  const app = await testApp();
  const admin = await login(app, "demo-admin");
  const attempts = [
    request(app)
      .post("/api/demo/investigacion/solicitudes")
      .set(auth(admin))
      .send({
        spoa: "110016000049202600087",
        delito: "Caso de control de autorización",
        service: "BALISTICA",
        region: "BOGOTA",
      }),
    request(app)
      .post("/api/demo/investigacion/items/MT-2026-0001/repartir")
      .set(auth(admin)),
    request(app)
      .post("/api/demo/investigacion/items/MT-2026-0002/aprobar-entrega")
      .set(auth(admin)),
    request(app)
      .post("/api/demo/investigacion/items/MT-2026-0002/devolver-entrega")
      .set(auth(admin))
      .send({ observation: "No autorizada" }),
    request(app).post("/api/demo/victimas/solicitudes").set(auth(admin)).send({
      externalId: "RAD-2026-0087",
      law: "LEY_1448",
      service: "PSICOLOGICO",
      region: "BOGOTA",
      victimCount: 1,
    }),
    request(app)
      .post("/api/demo/victimas/items/VIC-ITEM-DEMO-0002/aprobar-y-repartir")
      .set(auth(admin)),
    request(app)
      .post("/api/demo/victimas/items/VIC-ITEM-DEMO-0002/devolver-solicitud")
      .set(auth(admin))
      .send({ observation: "No autorizada" }),
    request(app)
      .post("/api/demo/victimas/items/VIC-ITEM-DEMO-0003/finalizar")
      .set(auth(admin))
      .send({ f171Reference: "F171-2026-ADMIN" }),
  ];

  for (const attempt of attempts) {
    const response = await attempt;
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "DEMO_FORBIDDEN");
  }

  const globalView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(admin))
    .expect(200);
  assert.ok(
    globalView.body.requests.some((entry) => entry.area === "VICTIMAS"),
  );
  assert.ok(
    globalView.body.requests.some((entry) => entry.area === "INVESTIGACION"),
  );
  await request(app).post("/api/demo/reset").set(auth(admin)).expect(200);
});

test("la titularidad y el área protegen la corrección de solicitudes devueltas", async () => {
  const app = await testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const otherRjv = tokenFor({
    sub: "rjv-sin-titularidad",
    role: "rjv",
    area: "VICTIMAS",
  });
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send({
      externalId: "RAD-2026-0086",
      law: "LEY_975",
      service: "PSICOLOGICO",
      region: "BOGOTA",
      victimCount: 1,
    })
    .expect(201);
  const itemId = itemFrom(created).id;
  await request(app)
    .post(`/api/demo/victimas/items/${itemId}/devolver-solicitud`)
    .set(auth(pag))
    .send({ observation: "Completar anexos" })
    .expect(200);

  await request(app)
    .post(`/api/demo/victimas/items/${itemId}/corregir-reenviar`)
    .set(auth(otherRjv))
    .send({ correctionSummary: "Intento de tercero" })
    .expect(403);
  await request(app)
    .post(`/api/demo/investigacion/items/${itemId}/repartir`)
    .set(auth(rjv))
    .expect(403);
});

test("sin candidato conserva PENDIENTE_REASIGNACION y una explicación auditable", async () => {
  const app = await testApp();
  const defender = await login(app, "demo-defensor");
  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send({
      spoa: "110016000049202600085",
      delito: "Caso sin cobertura disponible",
      service: "BALISTICA",
      region: "CUNDINAMARCA",
    })
    .expect(201);
  const assigned = await request(app)
    .post(`/api/demo/investigacion/items/${itemFrom(created).id}/repartir`)
    .set(auth(defender))
    .expect(200);
  const item = itemFrom(assigned);
  assert.equal(item.status, "PENDIENTE_REASIGNACION");
  assert.equal(item.assigneeId, null);
  assert.match(item.assignment.selectedReason, /todos fueron excluidos/i);
  assert.ok(item.assignment.evaluated.length >= 3);
  assert.ok(
    item.assignment.evaluated.every((candidate) => !candidate.eligible),
  );
  assert.equal(item.timeline.at(-1).message, item.assignment.selectedReason);
});

test("restablecer demo recupera semillas reproducibles", async () => {
  const app = await testApp();
  const defender = await login(app, "demo-defensor");
  const admin = await login(app, "demo-admin");
  await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send({
      spoa: "110016000049202600099",
      delito: "Registro temporal",
      service: "BALISTICA",
      region: "BOGOTA",
    })
    .expect(201);

  const reset = await request(app)
    .post("/api/demo/reset")
    .set(auth(admin))
    .expect(200);
  assert.equal(reset.body.requests.length, 6);
  assert.deepEqual(reset.body.requests.map((entry) => entry.id).sort(), [
    "INV-2026-0001",
    "INV-2026-0002",
    "INV-2026-0003",
    "SVP-2026-0001",
    "SVP-2026-0002",
    "SVP-2026-0003",
  ]);
  assert.equal(
    reset.body.requests.filter((entry) => entry.area === "INVESTIGACION")
      .length,
    3,
  );
  assert.equal(
    reset.body.requests.filter((entry) => entry.area === "VICTIMAS").length,
    3,
  );
});

test("PAG puede devolver informe de Investigación con motivo y conservar documento", async () => {
  const app = await testApp();
  const pag = await login(app, "demo-pag-investigacion");

  const missingReason = await request(app)
    .post("/api/demo/investigacion/items/MT-2026-0002/devolver-entrega")
    .set(auth(pag))
    .send({})
    .expect(400);
  assert.equal(missingReason.body.error.code, "DEMO_VALIDATION_ERROR");

  const returned = await request(app)
    .post("/api/demo/investigacion/items/MT-2026-0002/devolver-entrega")
    .set(auth(pag))
    .send({ observation: "Aclarar la conclusión técnica" })
    .expect(200);
  const item = itemFrom(returned);
  assert.equal(item.status, "EN_EJECUCION");
  assert.equal(item.reportReference, "INF-2026-0002");
  assert.equal(item.documents.length, 1);
  assert.match(item.timeline.at(-1).message, /Aclarar la conclusión/i);
});

test("autorización separa roles, áreas y casos visibles", async () => {
  const app = await testApp();
  const defender = await login(app, "demo-defensor");
  const rjv = await login(app, "demo-rjv");
  const investigator = await login(app, "demo-investigador");

  const defenderView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(defender))
    .expect(200);
  assert.equal(defenderView.body.requests.length, 3);
  assert.ok(
    defenderView.body.requests.every(
      (entry) =>
        entry.area === "INVESTIGACION" && entry.ownerUserId === "demo-defensor",
    ),
  );

  const victimsView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(rjv))
    .expect(200);
  assert.equal(victimsView.body.requests.length, 3);
  assert.ok(
    victimsView.body.requests.every(
      (entry) => entry.area === "VICTIMAS" && entry.ownerUserId === "demo-rjv",
    ),
  );

  await request(app)
    .post("/api/demo/investigacion/items/MT-2026-0002/aprobar-entrega")
    .set(auth(defender))
    .expect(403);
  await request(app)
    .post("/api/demo/investigacion/items/MT-2026-0001/iniciar")
    .set(auth(investigator))
    .expect(403);
  await request(app)
    .post("/api/demo/investigacion/items/MT-2026-0001/repartir")
    .set(auth(rjv))
    .expect(403);
});

test("una solicitud conserva varios ítems con reparto independiente", async () => {
  const app = await testApp();
  const defender = await login(app, "demo-defensor");
  const rjv = await login(app, "demo-rjv");
  const pagVictims = await login(app, "demo-pag-victimas");

  const investigation = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send({
      spoa: "110016000049202600077",
      delito: "Solicitud con dos especialidades",
      items: [
        { service: "INVESTIGACION_CAMPO", region: "BOGOTA" },
        { service: "BALISTICA", region: "BOGOTA" },
      ],
    })
    .expect(201);
  assert.equal(investigation.body.request.items.length, 2);
  const [firstInvestigation, secondInvestigation] =
    investigation.body.request.items;
  const assignedInvestigation = await request(app)
    .post(`/api/demo/investigacion/items/${firstInvestigation.id}/repartir`)
    .set(auth(defender))
    .expect(200);
  assert.equal(assignedInvestigation.body.request.items[0].status, "ASIGNADA");
  assert.equal(
    assignedInvestigation.body.request.items.find(
      (item) => item.id === secondInvestigation.id,
    ).status,
    "RADICADA",
  );

  await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send({
      externalId: "RAD-2026-0077",
      victimCount: 3,
      items: [
        {
          law: "LEY_1448",
          service: "PSICOLOGICO",
          region: "BOGOTA",
          peritoId: "per-demo-psi-01",
        },
      ],
    })
    .expect(400);

  const victims = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send({
      externalId: "RAD-2026-0078",
      victimCount: 3,
      items: [
        {
          law: "LEY_1448",
          service: "PSICOLOGICO",
          region: "BOGOTA",
        },
        {
          law: "LEY_1448",
          service: "ADMINISTRATIVO_FINANCIERO",
          region: "BOGOTA",
        },
      ],
    })
    .expect(201);
  assert.equal(victims.body.request.items.length, 2);
  assert.equal(victims.body.request.versions[0].data.items.length, 2);
  const firstVictims = victims.body.request.items[0];
  const approvedVictims = await request(app)
    .post(`/api/demo/victimas/items/${firstVictims.id}/aprobar-y-repartir`)
    .set(auth(pagVictims))
    .expect(200);
  assert.equal(approvedVictims.body.request.items[0].status, "ASIGNADA");
  assert.equal(
    approvedVictims.body.request.items[1].status,
    "PENDIENTE_APROBACION_PAG",
  );
});

test("rutas desconocidas y JSON inválido usan errores correlacionados", async () => {
  const app = await testApp();
  const missing = await request(app).get("/api/no-existe").expect(404);
  assert.equal(missing.body.error.code, "ROUTE_NOT_FOUND");
  const invalid = await request(app)
    .post("/api/auth/demo-login")
    .set("content-type", "application/json")
    .send('{"userId":')
    .expect(400);
  assert.equal(invalid.body.error.code, "INVALID_JSON");
});
