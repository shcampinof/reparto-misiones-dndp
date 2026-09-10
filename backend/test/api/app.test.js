import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { createSilentLogger } from "../../src/shared/logger.js";
import { createCatalogSeed } from "../../src/infrastructure/demo/catalog-seeds.js";

const TEST_SECRET = "test-secret-with-at-least-thirty-two-characters";

function testApp(overrides = {}) {
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

function activeGrant(capability, area, scopeType = "AREA") {
  return {
    capability,
    area,
    scopeType,
    validFrom: "2026-09-01T00:00:00.000Z",
    validTo: null,
  };
}

function investigationPayload(overrides = {}) {
  return {
    identifierType: "SPOA",
    spoa: "110016000049202600090",
    processReference: "Proceso penal de prueba",
    delito: "Conducta objeto de investigación",
    proceduralStage: "INVESTIGACION",
    hearingApplies: true,
    hearingDate: "2026-10-15",
    facts: "Hechos relevantes para la solicitud.",
    hypothesis: "Hipótesis de trabajo verificable.",
    requiredWork: "Verificar fuentes y circunstancias.",
    differentialApproach: { applies: false, detail: null },
    priority: { type: "ORDINARIA", reason: null, support: null },
    persons: [
      {
        alias: "Persona relacionada A",
        relationship: "Procesado/a",
        notes: null,
      },
    ],
    documents: [{ type: "SOLICITUD_DEFENSA", reference: "REF-SOL-INV-001" }],
    service: "SVC_INV_VERIFICACION_TERRENO",
    region: "BOGOTA",
    ...overrides,
  };
}

function victimsPayload(overrides = {}) {
  return {
    externalId: "RAD-2026-0099",
    law: "LEY_1448",
    service: "SVC_VIC_EVALUACION_PSICOLOGICA",
    region: "BOGOTA",
    caseData: {
      processReference: "Proceso de reparación de prueba",
      hearingApplies: true,
      hearingDate: "2026-10-20",
      facts: "Hechos relevantes para la valoración.",
    },
    persons: [
      {
        alias: "Persona vinculada A",
        type: "DIRECTA",
        relationship: "Víctima directa",
        familyGroup: "Núcleo A",
        contact: {
          phone: "3000000001",
          email: "persona.a@example.invalid",
          preferredChannel: "Correo",
        },
      },
      {
        alias: "Persona vinculada B",
        type: "INDIRECTA",
        relationship: "Familiar",
        familyGroup: "Núcleo A",
        contact: {
          phone: "3000000002",
          email: "persona.b@example.invalid",
          preferredChannel: "Teléfono",
        },
      },
    ],
    documents: [{ type: "FORMATO_SOLICITUD", reference: "REF-FORM-VIC-001" }],
    ...overrides,
  };
}

test("los catálogos de referencia son versionados, vigentes y ampliables", () => {
  const catalogs = createCatalogSeed();
  for (const catalogName of [
    "regions",
    "laws",
    "proceduralStages",
    "documentTypes",
  ]) {
    assert.ok(catalogs[catalogName].length > 0);
    assert.ok(
      catalogs[catalogName].every(
        (entry) =>
          entry.version === 1 &&
          entry.status === "PUBLICADO" &&
          entry.extensible === true &&
          entry.institutionalLimit === false,
      ),
    );
  }
  assert.equal(catalogs.identifierPolicies[0].approved, false);
  assert.equal(catalogs.identifierPolicies[0].pattern, null);
  assert.equal(catalogs.identifierPolicies[0].requireUnique, true);
});

test("salud, cuentas sintéticas y protección de rutas", async () => {
  const app = testApp();
  const health = await request(app)
    .get("/api/health")
    .set("x-request-id", "demo-correlation-1")
    .expect(200);
  assert.equal(health.body.ok, true);
  assert.equal(health.headers["x-request-id"], "demo-correlation-1");

  const ready = await request(app).get("/api/health/ready").expect(200);
  assert.equal(ready.body.checks.persistence, "demo-memory-resettable");
  const spaceReady = await request(app).get("/api/ready").expect(200);
  assert.equal(spaceReady.body.status, "ready");

  const accounts = await request(app)
    .get("/api/auth/demo-accounts")
    .expect(200);
  assert.ok(accounts.body.accounts.length >= 11);
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
  const app = testApp({ STATIC_DIR: "test/fixtures/public" });
  const portal = await request(app).get("/portal").expect(200);
  assert.match(portal.text, /SIGIP-DP fixture/);
  assert.match(portal.headers["content-type"], /text\/html/);

  const missingApi = await request(app).get("/api/no-existe").expect(404);
  assert.equal(missingApi.body.error.code, "ROUTE_NOT_FOUND");
});

test("recorrido completo de Investigación exige aprobación final PAG", async () => {
  const app = testApp();
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
      service: "SVC_INV_VERIFICACION_TERRENO",
      region: "BOGOTA",
      investigadorId: "inv-demo-01",
    })
    .expect(400);

  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(
      investigationPayload({
        spoa: "110016000049202600002",
        delito: "Conducta para recorrido integral",
        service: "SVC_INV_VERIFICACION_TERRENO",
        region: "BOGOTA",
      }),
    )
    .expect(201);
  let item = itemFrom(created);
  assert.equal(item.status, "ASIGNADA");
  assert.equal(
    item.assigneeId,
    "inv-demo-02",
    "el backend decide por menor carga",
  );
  assert.ok(item.assignment.evaluated.length >= 3);
  const deniedRetry = await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/repartir`)
    .set(auth(defender))
    .expect(403);
  assert.equal(deniedRetry.body.error.code, "CAPABILITY_FORBIDDEN");
  assert.ok(
    item.assignment.evaluated.some(
      (candidate) => candidate.exclusions.length > 0,
    ),
  );
  const sourceBeforeExecution = {
    externalId: created.body.request.externalId,
    summary: created.body.request.summary,
    ownerUserId: created.body.request.ownerUserId,
    persons: created.body.request.persons,
    caseData: created.body.request.caseData,
    documents: created.body.request.documents,
  };

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
    .send({ observation: "Actuación sintética verificada" })
    .expect(200);
  const delivered = await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/entregar`)
    .set(auth(investigator))
    .send({ reference: "INF-2026-0004" })
    .expect(200);
  assert.equal(itemFrom(delivered).status, "INFORME_ENTREGADO");
  assert.deepEqual(
    {
      externalId: delivered.body.request.externalId,
      summary: delivered.body.request.summary,
      ownerUserId: delivered.body.request.ownerUserId,
      persons: delivered.body.request.persons,
      caseData: delivered.body.request.caseData,
      documents: delivered.body.request.documents,
    },
    sourceBeforeExecution,
  );

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
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const expert = await login(app, "demo-perito-psicologia");
  const payload = victimsPayload({
    externalId: "RAD-2026-0099",
  });

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

  await request(app)
    .post(`/api/demo/victimas/items/${item.id}/aprobar-y-repartir`)
    .set(auth(rjv))
    .expect(403);

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
  const sourceBeforeExecution = {
    externalId: assigned.body.request.externalId,
    ownerUserId: assigned.body.request.ownerUserId,
    persons: assigned.body.request.persons,
    caseData: assigned.body.request.caseData,
    documents: assigned.body.request.documents,
  };

  await request(app)
    .post(`/api/demo/victimas/items/${item.id}/iniciar`)
    .set(auth(expert))
    .expect(200);
  await request(app)
    .post(`/api/demo/victimas/items/${item.id}/avance`)
    .set(auth(expert))
    .send({ observation: "Valoración sintética en curso" })
    .expect(200);
  const finished = await request(app)
    .post(`/api/demo/victimas/items/${item.id}/finalizar`)
    .set(auth(expert))
    .send({ f171Reference: "F171-2026-0099" })
    .expect(200);
  item = itemFrom(finished);
  assert.equal(item.status, "CERRADA");
  assert.equal(item.products.length, 1);
  assert.deepEqual(
    {
      type: item.products[0].type,
      reference: item.products[0].reference,
      version: item.products[0].version,
      status: item.products[0].status,
      author: item.products[0].author,
      itemId: item.products[0].itemId,
    },
    {
      type: "F171",
      reference: "F171-2026-0099",
      version: 1,
      status: "REGISTRADO",
      author: "demo-perito-psicologia",
      itemId: item.id,
    },
  );
  assert.ok(item.products[0].createdAt);
  assert.deepEqual(
    {
      externalId: finished.body.request.externalId,
      ownerUserId: finished.body.request.ownerUserId,
      persons: finished.body.request.persons,
      caseData: finished.body.request.caseData,
      documents: finished.body.request.documents,
    },
    sourceBeforeExecution,
  );
  assert.equal(item.timeline.at(-1).actor, "demo-perito-psicologia");
  assert.match(item.timeline.at(-1).message, /sin aprobación final/i);

  await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/aprobar-entrega`)
    .set(auth(pag))
    .expect(404);
});

test("PAG devuelve una solicitud de Víctimas y el RJV corrige y reenvía conservando versiones", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(
      victimsPayload({
        externalId: "RAD-2026-0088",
      }),
    )
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
  assert.deepEqual(
    returned.body.request.versions[0].data.persons,
    victimsPayload().persons,
  );
  assert.equal(
    returned.body.request.versions[0].reviews[0].observation,
    "Adjuntar soporte de parentesco",
  );
  assert.equal(returned.body.request.versions[0].reviews[0].itemId, itemId);
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
      persons: [
        ...victimsPayload().persons,
        {
          alias: "Persona vinculada C",
          type: "INDIRECTA",
          relationship: "Familiar",
          familyGroup: "Núcleo B",
          contact: {
            phone: "3000000003",
            email: null,
            preferredChannel: "Teléfono",
          },
        },
      ],
    })
    .expect(200);
  assert.equal(itemFrom(resent).status, "PENDIENTE_APROBACION_PAG");
  assert.equal(resent.body.request.persons.length, 3);
  assert.equal(resent.body.request.versions.length, 2);
  assert.equal(resent.body.request.versions[0].data.persons.length, 2);
  assert.equal(resent.body.request.versions[1].data.persons.length, 3);
  assert.equal(resent.body.request.persons[2].relationship, "Familiar");
  assert.equal(resent.body.request.persons[2].familyGroup, "Núcleo B");
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
  const app = testApp();
  const admin = await login(app, "demo-admin");
  const attempts = [
    request(app)
      .post("/api/demo/investigacion/solicitudes")
      .set(auth(admin))
      .send({
        spoa: "110016000049202600087",
        delito: "Caso de control de autorización",
        service: "SVC_INV_ANALISIS_BALISTICO",
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
      service: "SVC_VIC_EVALUACION_PSICOLOGICA",
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
    assert.equal(response.body.error.code, "CAPABILITY_FORBIDDEN");
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
  const app = testApp();
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
    .send(
      victimsPayload({
        externalId: "RAD-2026-0086",
        law: "LEY_975",
      }),
    )
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
    .expect(404);
});

test("sin candidato pasa a PENDIENTE_EXCEPCION y conserva una explicación auditable", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(
      investigationPayload({
        spoa: "110016000049202600085",
        delito: "Caso sin cobertura disponible",
        service: "SVC_INV_ANALISIS_BALISTICO",
        region: "CUNDINAMARCA",
      }),
    )
    .expect(201);
  const deniedRetry = await request(app)
    .post(`/api/demo/investigacion/items/${itemFrom(created).id}/repartir`)
    .set(auth(defender))
    .expect(403);
  assert.equal(deniedRetry.body.error.code, "CAPABILITY_FORBIDDEN");
  const item = itemFrom(created);
  assert.equal(item.status, "PENDIENTE_EXCEPCION");
  assert.equal(item.assigneeId, null);
  assert.equal(item.exception.type, "FALTA_CANDIDATO");
  assert.match(item.assignment.selectedReason, /todos fueron excluidos/i);
  assert.ok(item.assignment.evaluated.length >= 3);
  assert.ok(
    item.assignment.evaluated.every((candidate) => !candidate.eligible),
  );
  assert.equal(item.timeline.at(-1).message, item.assignment.selectedReason);
});

test("restablecer demo recupera semillas reproducibles", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const admin = await login(app, "demo-admin");
  await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(
      investigationPayload({
        spoa: "110016000049202600099",
        delito: "Registro para comprobar restablecimiento",
        service: "SVC_INV_ANALISIS_BALISTICO",
        region: "BOGOTA",
      }),
    )
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
  const app = testApp();
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
  const app = testApp();
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

test("los perfiles adicionales de Investigación conservan alcances separados y solo lectura", async () => {
  const app = testApp();
  const regional = await login(app, "demo-gestor-regional-investigacion");
  const central = await login(app, "demo-gestor-central-excepciones");
  const defenderRegional = await login(app, "demo-defensor-regional");

  const regionalView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(regional))
    .expect(200);
  assert.ok(
    regionalView.body.requests
      .flatMap((entry) => entry.items)
      .every((item) => item.region === "BOGOTA"),
  );
  assert.ok(
    regionalView.body.authorization.grants.some(
      (grant) => grant.capability === "CONSULTAR_PROBLEMAS_INVESTIGACION",
    ),
  );

  const centralView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(central))
    .expect(200);
  assert.ok(
    centralView.body.requests
      .flatMap((entry) => entry.items)
      .some((item) => item.status === "PENDIENTE_EXCEPCION"),
  );
  assert.ok(
    centralView.body.authorization.grants.some(
      (grant) => grant.capability === "CONSULTAR_EXCEPCIONES_INVESTIGACION",
    ),
  );

  const defenderView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(defenderRegional))
    .expect(200);
  assert.ok(
    defenderView.body.authorization.grants.every(
      (grant) =>
        ![
          "REINTENTAR_REPARTO_EXCEPCION",
          "RESOLVER_EXCEPCION_MANUAL",
          "REASIGNAR_ITEM",
          "APROBAR_INFORME_INVESTIGACION",
        ].includes(grant.capability),
    ),
  );

  for (const token of [regional, central, defenderRegional]) {
    await request(app)
      .post("/api/demo/investigacion/items/MT-2026-0001-02/repartir")
      .set(auth(token))
      .expect(403);
  }
});

test("las métricas de plazo se omiten cuando no existe una regla vigente", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const response = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(defender))
    .expect(200);
  for (const item of response.body.requests.flatMap((entry) => entry.items)) {
    assert.deepEqual(item.tracking, { configured: false });
  }
});

test("rutas desconocidas y JSON inválido usan errores correlacionados", async () => {
  const app = testApp();
  const missing = await request(app).get("/api/no-existe").expect(404);
  assert.equal(missing.body.error.code, "ROUTE_NOT_FOUND");
  const invalid = await request(app)
    .post("/api/auth/demo-login")
    .set("content-type", "application/json")
    .send('{"userId":')
    .expect(400);
  assert.equal(invalid.body.error.code, "INVALID_JSON");
});

test("el contrato pre-Oracle publica capacidades, perfiles propuestos inactivos y servicios vigentes", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const response = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(defender))
    .expect(200);

  assert.equal(
    response.body.productName,
    "SIGIP-DP — Gestión investigativa y pericial de la Defensoría del Pueblo",
  );
  assert.ok(
    response.body.authorization.grants.every(
      (grant) => grant.capability !== "REINTENTAR_REPARTO_EXCEPCION",
    ),
  );
  assert.ok(
    response.body.authorization.proposedProfiles.every(
      (profile) =>
        profile.enabled === false && profile.status === "PENDIENTE_RACI",
    ),
  );
  assert.equal(response.body.serviceCatalog.services.length, 5);
  assert.equal(response.body.serviceCatalog.specialties.length, 17);
  assert.ok(
    response.body.serviceCatalog.specialties.every(
      (specialty) =>
        specialty.area === "INVESTIGACION" &&
        specialty.extensible === true &&
        specialty.institutionalLimit === false,
    ),
  );
  assert.ok(response.body.serviceCatalog.serviceSpecialtyRelations.length > 5);
  assert.ok(
    response.body.serviceCatalog.services.some(
      (service) => service.specialtyIds.length > 1,
    ),
  );
  assert.ok(
    response.body.serviceCatalog.services.filter((service) =>
      service.specialtyIds.includes("ESP_INV_CAMPO"),
    ).length > 1,
  );
  const persistedModel = app.locals.demoRepository.snapshot();
  const serviceIds = new Set(
    persistedModel.catalogs.services.map((service) => service.id),
  );
  const specialtyIds = new Set(
    persistedModel.catalogs.specialties.map((specialty) => specialty.id),
  );
  assert.equal(persistedModel.catalogs.services.length, 10);
  assert.equal(persistedModel.catalogs.specialties.length, 19);
  assert.ok(
    persistedModel.catalogs.services.every(
      (service) => !Object.hasOwn(service, "specialtyIds"),
    ),
  );
  assert.ok(
    persistedModel.catalogs.serviceSpecialtyRelations.every(
      (relation) =>
        serviceIds.has(relation.serviceId) &&
        specialtyIds.has(relation.specialtyId),
    ),
  );
  assert.ok(
    persistedModel.requests.every((entry) =>
      entry.items.every((item) => serviceIds.has(item.service)),
    ),
  );
  assert.deepEqual(response.body.parameters.pendingDecisionCodes, [
    "DEC-PLZ-001",
    "DEC-TURNO-001",
  ]);
  assert.equal(Object.hasOwn(response.body.parameters, "maximumLoad"), false);
  assert.equal(Object.hasOwn(response.body.parameters, "termDays"), false);
  assert.equal(
    Object.hasOwn(response.body.parameters, "semaphoreRanges"),
    false,
  );
  assert.ok(
    response.body.serviceCatalog.services.every(
      (service) =>
        service.status === "PUBLICADO" &&
        service.specialtyIds.length > 0 &&
        service.termPolicy.value === null &&
        service.termPolicy.label === "Plazo parametrizable por servicio",
    ),
  );
  assert.deepEqual(response.body.dashboards.INVESTIGACION, {
    requestCount: 3,
    personCount: 0,
    itemCount: 4,
    assignmentCount: 3,
    pendingItemCount: 1,
    activeItemCount: 2,
    closedItemCount: 1,
  });
});

test("una solicitud multiítem mantiene estados y repartos independientes", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(
      investigationPayload({
        spoa: "110016000049202600081",
        delito: "Solicitud con dos servicios",
        items: [
          { service: "SVC_INV_VERIFICACION_TERRENO", region: "BOGOTA" },
          { service: "SVC_INV_ANALISIS_BALISTICO", region: "CUNDINAMARCA" },
        ],
      }),
    )
    .expect(201);

  assert.equal(created.body.request.items.length, 2);
  assert.equal(created.body.request.aggregateStatus, "EN_TRAMITE");
  assert.equal(created.body.request.items[0].status, "ASIGNADA");
  assert.equal(created.body.request.items[1].status, "PENDIENTE_EXCEPCION");
  assert.notEqual(
    created.body.request.items[0].id,
    created.body.request.items[1].id,
  );

  assert.ok(created.body.request.items.every((item) => item.assignment));

  const investigator = await login(app, "demo-investigador");
  const pag = await login(app, "demo-pag-investigacion");
  const firstItemId = created.body.request.items[0].id;
  await request(app)
    .post(`/api/demo/investigacion/items/${firstItemId}/iniciar`)
    .set(auth(investigator))
    .expect(200);
  await request(app)
    .post(`/api/demo/investigacion/items/${firstItemId}/entregar`)
    .set(auth(investigator))
    .send({ reference: "INF-2026-MULTI-001" })
    .expect(200);
  const partiallyClosed = await request(app)
    .post(`/api/demo/investigacion/items/${firstItemId}/aprobar-entrega`)
    .set(auth(pag))
    .expect(200);
  assert.equal(partiallyClosed.body.request.items[0].status, "CERRADA");
  assert.equal(
    partiallyClosed.body.request.items[1].status,
    "PENDIENTE_EXCEPCION",
  );
  assert.equal(
    partiallyClosed.body.request.aggregateStatus,
    "PARCIALMENTE_CERRADA",
  );
  assert.deepEqual(partiallyClosed.body.request.aggregateCounts, {
    totalItems: 2,
    closedItems: 1,
    assignedItems: 1,
  });
});

test("el catálogo es consultable por solicitantes, ejecutores y supervisores según su área", async () => {
  const app = testApp();
  const profiles = [
    ["demo-defensor", "INVESTIGACION", 5, 17],
    ["demo-investigador", "INVESTIGACION", 5, 17],
    ["demo-pag-investigacion", "INVESTIGACION", 5, 17],
    ["demo-rjv", "VICTIMAS", 5, 2],
    ["demo-perito-psicologia", "VICTIMAS", 5, 2],
    ["demo-pag-victimas", "VICTIMAS", 5, 2],
  ];

  for (const [userId, area, serviceCount, specialtyCount] of profiles) {
    const token = await login(app, userId);
    const response = await request(app)
      .get("/api/demo/bootstrap")
      .set(auth(token))
      .expect(200);
    assert.equal(response.body.serviceCatalog.services.length, serviceCount);
    assert.equal(
      response.body.serviceCatalog.specialties.length,
      specialtyCount,
    );
    assert.ok(
      response.body.serviceCatalog.services.every(
        (service) => service.area === area,
      ),
    );
    assert.ok(
      response.body.serviceCatalog.specialties.every(
        (specialty) => specialty.area === area,
      ),
    );
  }
});

test("una solicitud de Víctimas cierra solo cuando todos sus ítems independientes cierran", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const psychologist = await login(app, "demo-perito-psicologia");
  const financialExpert = await login(app, "demo-perito-financiero");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(
      victimsPayload({
        externalId: "RAD-2026-0084",
        items: [
          {
            service: "SVC_VIC_EVALUACION_PSICOLOGICA",
            region: "BOGOTA",
            law: "LEY_1448",
          },
          {
            service: "SVC_VIC_LIQUIDACION_PERJUICIOS",
            region: "BOGOTA",
            law: "LEY_1448",
          },
        ],
      }),
    )
    .expect(201);
  const [psychologyItem, financialItem] = created.body.request.items;

  await request(app)
    .post(`/api/demo/victimas/items/${psychologyItem.id}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);
  await request(app)
    .post(`/api/demo/victimas/items/${financialItem.id}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);

  await request(app)
    .post(`/api/demo/victimas/items/${psychologyItem.id}/iniciar`)
    .set(auth(psychologist))
    .expect(200);
  const partial = await request(app)
    .post(`/api/demo/victimas/items/${psychologyItem.id}/finalizar`)
    .set(auth(psychologist))
    .send({ f171Reference: "F171-2026-MULTI-PSI" })
    .expect(200);
  assert.equal(partial.body.request.aggregateStatus, "PARCIALMENTE_CERRADA");

  await request(app)
    .post(`/api/demo/victimas/items/${financialItem.id}/iniciar`)
    .set(auth(financialExpert))
    .expect(200);
  const closed = await request(app)
    .post(`/api/demo/victimas/items/${financialItem.id}/finalizar`)
    .set(auth(financialExpert))
    .send({ f171Reference: "F171-2026-MULTI-FIN" })
    .expect(200);
  assert.equal(closed.body.request.aggregateStatus, "CERRADA");

  const ownerView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(rjv))
    .expect(200);
  const requestView = ownerView.body.requests.find(
    (entry) => entry.id === created.body.request.id,
  );
  assert.deepEqual(
    requestView.items.map((item) => [item.status, item.reportReference]),
    [
      ["CERRADA", "F171-2026-MULTI-PSI"],
      ["CERRADA", "F171-2026-MULTI-FIN"],
    ],
  );
});

test("dos repartos concurrentes no pierden la carga del mismo candidato", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const create = (spoa) =>
    request(app)
      .post("/api/demo/investigacion/solicitudes")
      .set(auth(defender))
      .send(
        investigationPayload({
          spoa,
          delito: "Concurrencia controlada de reparto",
          service: "SVC_INV_ANALISIS_BALISTICO",
          region: "BOGOTA",
        }),
      );
  const [first, second] = await Promise.all([
    create("110016000049202600078"),
    create("110016000049202600079"),
  ]);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const items = [itemFrom(first), itemFrom(second)];
  assert.ok(items.every((item) => item.assigneeId === "inv-demo-01"));
  assert.deepEqual(
    items
      .map(
        (item) =>
          item.assignment.evaluated.find(
            (candidate) => candidate.candidateId === "inv-demo-01",
          ).metrics.load,
      )
      .sort(),
    [2, 3],
  );
});

test("problemas se registran sin alterar el estado y las prórrogas quedan bloqueadas con decisión trazable", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const investigator = await login(app, "demo-investigador");
  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(
      investigationPayload({
        spoa: "110016000049202600080",
        delito: "Caso para contrato operativo",
        service: "SVC_INV_VERIFICACION_TERRENO",
        region: "BOGOTA",
      }),
    )
    .expect(201);
  const itemId = itemFrom(created).id;
  const problem = await request(app)
    .post(`/api/demo/investigacion/items/${itemId}/operaciones/problema`)
    .set(auth(investigator))
    .send({
      reason: "Insumo ilegible",
      description: "El anexo técnico no permite continuar el análisis",
      supportReference: "ANEXO-TECNICO-01",
    })
    .expect(201);
  const item = itemFrom(problem);
  assert.equal(item.status, "ASIGNADA");
  assert.equal(item.operations.length, 1);
  assert.equal(item.operations[0].type, "PROBLEMA");
  assert.equal(item.operations[0].supportReference, "ANEXO-TECNICO-01");
  assert.equal(item.operations[0].primaryStatusSnapshot, "ASIGNADA");
  assert.equal(item.operations[0].routing.status, "EN_BANDEJA");
  const regionalManager = await login(
    app,
    "demo-gestor-regional-investigacion",
  );
  const regionalView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(regionalManager))
    .expect(200);
  const routedItem = regionalView.body.requests
    .flatMap((entry) => entry.items)
    .find((entry) => entry.id === itemId);
  assert.equal(
    routedItem.operations.at(-1).supportReference,
    "ANEXO-TECNICO-01",
  );

  const pending = await request(app)
    .post(`/api/demo/investigacion/items/${itemId}/operaciones/prorroga`)
    .set(auth(investigator))
    .send({})
    .expect(409);
  assert.equal(pending.body.error.code, "PENDING_FUNCTIONAL_DECISION");
  assert.equal(pending.body.error.details.decisionCode, "DEC-PLZ-001");
});

test("el perito reporta un problema trazable y el solicitante no adquiere esa capacidad", async () => {
  const app = testApp();
  const expert = await login(app, "demo-perito-psicologia");
  const rjv = await login(app, "demo-rjv");
  const path =
    "/api/demo/victimas/items/VIC-ITEM-DEMO-0003/operaciones/problema";

  await request(app)
    .post(path)
    .set(auth(expert))
    .send({ reason: "Falta soporte", description: "No es legible" })
    .expect(400);

  const reported = await request(app)
    .post(path)
    .set(auth(expert))
    .send({
      reason: "Falta soporte",
      description: "El soporte remitido no es legible",
      supportReference: "REF-VIC-SOPORTE-01",
    })
    .expect(201);
  const item = itemFrom(reported);
  assert.equal(item.status, "ASIGNADA");
  assert.equal(item.operations.at(-1).primaryStatusSnapshot, "ASIGNADA");
  assert.equal(
    item.operations.at(-1).routing.status,
    "PENDIENTE_CONFIGURACION",
  );

  await request(app)
    .post(path)
    .set(auth(rjv))
    .send({
      reason: "Intento no permitido",
      description: "El RJV no es ejecutor",
      supportReference: "REF-01",
    })
    .expect(403);
});

test("Víctimas usa PENDIENTE_EXCEPCION cuando nunca existió candidato", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(
      victimsPayload({
        externalId: "CASO-VIC-SIN-CANDIDATO",
        region: "ANTIOQUIA",
      }),
    )
    .expect(201);
  const approved = await request(app)
    .post(`/api/demo/victimas/items/${itemFrom(created).id}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);
  const item = itemFrom(approved);
  assert.equal(item.status, "PENDIENTE_EXCEPCION");
  assert.equal(item.assigneeId, null);
  assert.equal(item.exception.type, "FALTA_CANDIDATO");
  assert.equal(item.approvedSubmissionVersion, 1);
  assert.ok(
    item.timeline.every((event) => event.to !== "PENDIENTE_REASIGNACION"),
  );
});

test("la corrección parcial de Víctimas conserva el snapshot del ítem ya aprobado", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(
      victimsPayload({
        externalId: "CASO-VIC-MULTIITEM",
        items: [
          {
            service: "SVC_VIC_EVALUACION_PSICOLOGICA",
            region: "BOGOTA",
            law: "LEY_1448",
          },
          {
            service: "SVC_VIC_LIQUIDACION_PERJUICIOS",
            region: "BOGOTA",
            law: "LEY_1448",
          },
        ],
      }),
    )
    .expect(201);
  const [firstId, secondId] = created.body.request.items.map((item) => item.id);
  const firstApproved = await request(app)
    .post(`/api/demo/victimas/items/${firstId}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);
  const firstBefore = firstApproved.body.request.items.find(
    (item) => item.id === firstId,
  );

  await request(app)
    .post(`/api/demo/victimas/items/${secondId}/devolver-solicitud`)
    .set(auth(pag))
    .send({ observation: "Precisar persona indirecta" })
    .expect(200);
  const correctedPeople = [
    ...victimsPayload().persons,
    {
      alias: "Persona vinculada C",
      type: "INDIRECTA",
      relationship: "Familiar",
      familyGroup: "Núcleo B",
      contact: {
        phone: "3000000003",
        email: null,
        preferredChannel: "Teléfono",
      },
    },
  ];
  const corrected = await request(app)
    .post(`/api/demo/victimas/items/${secondId}/corregir-reenviar`)
    .set(auth(rjv))
    .send({
      correctionSummary: "Se precisó la relación familiar",
      externalId: "CASO-VIC-MULTIITEM-CORREGIDO",
      persons: correctedPeople,
    })
    .expect(200);
  const firstAfter = corrected.body.request.items.find(
    (item) => item.id === firstId,
  );
  const secondAfter = corrected.body.request.items.find(
    (item) => item.id === secondId,
  );
  assert.equal(firstAfter.status, firstBefore.status);
  assert.equal(firstAfter.assigneeId, firstBefore.assigneeId);
  assert.equal(firstAfter.approvedSubmissionVersion, 1);
  assert.equal(firstAfter.approvedRequestData.externalId, "CASO-VIC-MULTIITEM");
  assert.equal(firstAfter.approvedRequestData.persons.length, 2);
  assert.equal(secondAfter.submissionVersion, 2);
  assert.equal(secondAfter.approvedSubmissionVersion, null);
  assert.equal(corrected.body.request.persons.length, 3);
  assert.equal(corrected.body.request.versions[0].reviews.length, 2);
  assert.equal(corrected.body.request.versions[1].reviews.length, 0);

  const secondApproved = await request(app)
    .post(`/api/demo/victimas/items/${secondId}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);
  const approvedSecond = secondApproved.body.request.items.find(
    (item) => item.id === secondId,
  );
  assert.equal(approvedSecond.approvedSubmissionVersion, 2);
  assert.equal(
    approvedSecond.approvedRequestData.externalId,
    "CASO-VIC-MULTIITEM-CORREGIDO",
  );
});

test("el catálogo valida requisitos por ítem y el identificador de Víctimas es configurable y único", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const rjv = await login(app, "demo-rjv");

  const missingRequirement = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(
      investigationPayload({
        spoa: "110016000049202600081",
        documents: [
          { type: "SOPORTE_PROCESAL", reference: "SOPORTE-SIN-SOLICITUD" },
        ],
      }),
    )
    .expect(400);
  assert.match(missingRequirement.body.error.message, /Ítem 1/i);
  assert.equal(
    missingRequirement.body.error.details.items[0].missingDocumentTypes[0].id,
    "SOLICITUD_DEFENSA",
  );

  await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(victimsPayload({ externalId: "IDENTIFICADOR LIBRE 2026-A" }))
    .expect(201);
  const duplicate = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(victimsPayload({ externalId: "IDENTIFICADOR LIBRE 2026-A" }))
    .expect(400);
  assert.match(duplicate.body.error.message, /ya existe/i);
});

test("los informes de Investigación conservan devolución y nueva versión", async () => {
  const app = testApp();
  const investigator = await login(app, "demo-investigador");
  const pag = await login(app, "demo-pag-investigacion");

  const returned = await request(app)
    .post("/api/demo/investigacion/items/MT-2026-0002/devolver-entrega")
    .set(auth(pag))
    .send({ observation: "Corregir conclusión" })
    .expect(200);
  assert.equal(itemFrom(returned).products[0].status, "DEVUELTO");

  const redelivered = await request(app)
    .post("/api/demo/investigacion/items/MT-2026-0002/entregar")
    .set(auth(investigator))
    .send({ reference: "INF-2026-0002-V2" })
    .expect(200);
  assert.equal(itemFrom(redelivered).products.length, 2);
  assert.equal(itemFrom(redelivered).products[1].version, 2);
  assert.equal(itemFrom(redelivered).products[1].status, "ENTREGADO");

  const approved = await request(app)
    .post("/api/demo/investigacion/items/MT-2026-0002/aprobar-entrega")
    .set(auth(pag))
    .expect(200);
  assert.deepEqual(
    itemFrom(approved).products.map(({ version, status }) => ({
      version,
      status,
    })),
    [
      { version: 1, status: "DEVUELTO" },
      { version: 2, status: "APROBADO" },
    ],
  );
});

test("cada operación especial pendiente permanece deshabilitada con su decisión", async () => {
  const app = testApp();
  const pendingOperations = [
    ["novedad", "GESTIONAR_NOVEDAD", "DEC-NOV-001"],
    ["excepcion_manual", "RESOLVER_EXCEPCION_MANUAL", "DEC-ASG-EXC"],
    ["reasignacion", "REASIGNAR_ITEM", "DEC-RACI-OPERACIONES"],
    ["transferencia", "TRANSFERIR_SOLICITUD", "DEC-RACI-TRANSFERENCIA"],
    ["prorroga", "SOLICITAR_PRORROGA", "DEC-PLZ-001"],
    ["ampliacion", "SOLICITAR_AMPLIACION", "DEC-AMP-001"],
    ["actualizacion_f171", "SOLICITAR_ACTUALIZACION_F171", "DEC-VIC-F171"],
  ];
  const operator = tokenFor({
    sub: "operador-contratos-prueba",
    role: "perfil-propuesto-no-activo",
    area: "INVESTIGACION",
    grants: pendingOperations.map(([, capability]) =>
      activeGrant(capability, "INVESTIGACION"),
    ),
  });

  for (const [operation, , decisionCode] of pendingOperations) {
    const response = await request(app)
      .post(
        `/api/demo/investigacion/items/MT-2026-0001/operaciones/${operation}`,
      )
      .set(auth(operator))
      .send({})
      .expect(409);
    assert.equal(response.body.error.code, "PENDING_FUNCTIONAL_DECISION");
    assert.equal(response.body.error.details.decisionCode, decisionCode);
  }
});

test("el catálogo exige capacidades separadas y respeta el ciclo borrador-revisión-publicación", async () => {
  const app = testApp();
  const admin = await login(app, "demo-admin");
  await request(app)
    .post("/api/demo/catalogo/servicios")
    .set(auth(admin))
    .send({ area: "INVESTIGACION", id: "SVC_INV_PRUEBA", name: "Prueba" })
    .expect(403);

  const expiredProposer = tokenFor({
    sub: "gestor-expirado",
    role: "perfil-propuesto-no-activo",
    area: "INVESTIGACION",
    grants: [
      {
        ...activeGrant("PROPONER_CATALOGO", "INVESTIGACION"),
        validTo: "2026-09-02T00:00:00.000Z",
      },
    ],
  });
  await request(app)
    .post("/api/demo/catalogo/servicios")
    .set(auth(expiredProposer))
    .send({ area: "INVESTIGACION", id: "SVC_INV_EXPIRADO", name: "Prueba" })
    .expect(403);

  const proposer = tokenFor({
    sub: "gestor-catalogo-prueba",
    role: "perfil-propuesto-no-activo",
    area: "INVESTIGACION",
    grants: [
      activeGrant("PROPONER_CATALOGO", "INVESTIGACION"),
      activeGrant("CONSULTAR_CATALOGO_SERVICIOS", "INVESTIGACION"),
    ],
  });
  const publisher = tokenFor({
    sub: "publicador-catalogo-prueba",
    role: "perfil-propuesto-no-activo",
    area: "INVESTIGACION",
    grants: [activeGrant("PUBLICAR_CATALOGO", "INVESTIGACION")],
  });
  await request(app)
    .post("/api/demo/catalogo/servicios")
    .set(auth(proposer))
    .send({
      area: "INVESTIGACION",
      id: "SVC_INV_DOC_INVALIDO",
      name: "Servicio con requisito inválido",
      specialtyIds: ["ESP_INV_CAMPO"],
      requiredDocumentTypes: ["TIPO_NO_CATALOGADO"],
    })
    .expect(400);
  const draft = await request(app)
    .post("/api/demo/catalogo/servicios")
    .set(auth(proposer))
    .send({
      area: "INVESTIGACION",
      id: "SVC_INV_PRUEBA",
      name: "Servicio funcional de prueba",
      description: "Descripción controlada",
      activities: ["Actividad controlada"],
      scope: ["Alcance controlado"],
      exclusions: ["Exclusión controlada"],
      requirements: ["Solicitud completa"],
      requiredDocumentTypes: ["SOLICITUD_DEFENSA"],
      product: "Informe de prueba",
      specialtyIds: ["ESP_INV_CAMPO"],
      validFrom: "2026-10-01",
    })
    .expect(201);
  assert.equal(draft.body.service.status, "BORRADOR");
  assert.deepEqual(draft.body.service.specialtyIds, ["ESP_INV_CAMPO"]);
  assert.deepEqual(draft.body.service.requiredDocumentTypes, [
    "SOLICITUD_DEFENSA",
  ]);

  await request(app)
    .post("/api/demo/catalogo/servicios/SVC_INV_PRUEBA/enviar-revision")
    .set(auth(proposer))
    .send({ reason: "Validación técnica completada" })
    .expect(200);
  const published = await request(app)
    .post("/api/demo/catalogo/servicios/SVC_INV_PRUEBA/publicar")
    .set(auth(publisher))
    .send({ reason: "Aprobación funcional de prueba" })
    .expect(200);
  assert.equal(published.body.service.status, "PUBLICADO");
  assert.deepEqual(
    published.body.service.history.map((event) => event.to),
    ["BORRADOR", "EN_REVISION", "PUBLICADO"],
  );
  assert.deepEqual(published.body.service.specialtyIds, ["ESP_INV_CAMPO"]);
  const publishedRelation = app.locals.demoRepository
    .snapshot()
    .catalogs.serviceSpecialtyRelations.find(
      (relation) => relation.serviceId === "SVC_INV_PRUEBA",
    );
  assert.equal(publishedRelation.specialtyId, "ESP_INV_CAMPO");
  assert.equal(publishedRelation.status, "PUBLICADO");
  assert.deepEqual(
    publishedRelation.history.map((event) => event.to),
    ["BORRADOR", "EN_REVISION", "PUBLICADO"],
  );

  const beforeValidity = await request(app)
    .get("/api/demo/catalogo/servicios?area=INVESTIGACION&at=2026-09-30")
    .set(auth(proposer))
    .expect(200);
  assert.equal(
    beforeValidity.body.services.some(
      (service) => service.id === "SVC_INV_PRUEBA",
    ),
    false,
  );
  const onValidity = await request(app)
    .get("/api/demo/catalogo/servicios?area=INVESTIGACION&at=2026-10-01")
    .set(auth(proposer))
    .expect(200);
  assert.equal(
    onValidity.body.services.some((service) => service.id === "SVC_INV_PRUEBA"),
    true,
  );
});
