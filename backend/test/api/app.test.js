import { exampleReportPdf } from "../../../frontend/src/demo-pdf.js";
import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { createSilentLogger } from "../../src/shared/logger.js";
import { createCatalogSeed } from "../../src/infrastructure/demo/catalog-seeds.js";

const TEST_SECRET = "test-secret-with-at-least-thirty-two-characters";

test("F171 inicial se descarga como PDF y conserva reserva por rol", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const expert = await login(app, "demo-perito-financiero");
  const pag = await login(app, "demo-pag-victimas");
  const path =
    "/api/demo/victimas/items/VIC-ITEM-DEMO-0001/productos/PROD-VIC-ITEM-DEMO-0001-F171-1/documento";
  for (const token of [rjv, expert]) {
    const response = await request(app).get(path).set(auth(token)).expect(200);
    assert.match(response.headers["content-type"], /application\/pdf/);
    assert.ok(response.body.subarray(0, 5).equals(Buffer.from("%PDF-")));
    assert.match(
      response.body.toString("ascii"),
      /Informe de Actividades Periciales/,
    );
    assert.doesNotMatch(response.body.toString("ascii"), /ficticio/i);
  }
  await request(app).get(path).set(auth(pag)).expect(403);
  await request(app).get(path).expect(401);
});

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

test("F163 y Formato de solicitud satisfacen el mismo requisito sin aceptar anexos diferentes", async () => {
  for (const requiredType of ["FORMATO_SOLICITUD", "F163"]) {
    const app = testApp();
    app.locals.demoRepository.transaction((state) => {
      state.catalogs.services.find(
        (service) => service.id === "SVC_VIC_EVALUACION_PSICOLOGICA",
      ).requiredDocumentTypes = [requiredType];
    });
    const rjv = await login(app, "demo-rjv");
    const beforeInvestigation = app.locals.demoRepository
      .snapshot()
      .requests.filter((entry) => entry.area === "INVESTIGACION");
    for (const suppliedType of ["F163", "FORMATO_SOLICITUD"]) {
      const created = await request(app)
        .post("/api/demo/victimas/solicitudes")
        .set(auth(rjv))
        .send(
          victimsPayload({
            externalId: `RAD-${requiredType}-${suppliedType}`,
            documents: [
              { type: suppliedType, reference: "Solicitud-F163.pdf" },
            ],
          }),
        )
        .expect(201);
      assert.equal(itemFrom(created).status, "PENDIENTE_APROBACION_PAG");
      assert.equal(created.body.request.documents[0].type, suppliedType);
    }
    const denied = await request(app)
      .post("/api/demo/victimas/solicitudes")
      .set(auth(rjv))
      .send(
        victimsPayload({
          externalId: `RAD-SIN-F163-${requiredType}`,
          documents: [
            { type: "SENTENCIA_EJECUTORIADA", reference: "Solicitud-F163.pdf" },
          ],
        }),
      )
      .expect(400);
    assert.match(denied.body.error.message, /Formato de solicitud F163/);
    await request(app)
      .post("/api/demo/victimas/solicitudes")
      .send(victimsPayload())
      .expect(401);
    assert.deepEqual(
      app.locals.demoRepository
        .snapshot()
        .requests.filter((entry) => entry.area === "INVESTIGACION"),
      beforeInvestigation,
    );
  }
});

test("F163 conserva fechas, ubicación y bases financieras sin volverlas obligatorias para psicología", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const persons = structuredClone(victimsPayload().persons);
  Object.assign(persons[0], {
    identityDocument: "DOC-FICTICIO-1",
    birthDate: "1980-01-01",
    factDate: "2005-04-01",
    factNumber: "H-1",
    factPlace: "Municipio ficticio",
    monthlyIncome: 0,
    emergingDamage: 1200.5,
    displacementDays: 12,
    incomeSupportReference: "CERT-FICTICIO-1",
  });
  Object.assign(persons[0].contact, {
    address: "Dirección ficticia",
    municipality: "Municipio ficticio",
    department: "Bogotá",
  });
  const payload = victimsPayload({
    persons,
    caseData: {
      ...victimsPayload().caseData,
      judicialAuthority: "Juzgado de ejemplo",
      offenses: "Homicidio; desaparición forzada",
      defendantName: "Postulado ficticio",
      requestedMeasures: "Valoración de daños",
      sentenceDate: "2025-02-01",
    },
  });
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(payload)
    .expect(201);
  assert.equal(created.body.request.persons[0].monthlyIncome, 0);
  assert.equal(
    created.body.request.caseData.offenses,
    "Homicidio; desaparición forzada",
  );
  assert.equal(
    created.body.request.persons[0].contact.address,
    "Dirección ficticia",
  );
  const id = itemFrom(created).id;
  await request(app)
    .post(`/api/demo/victimas/items/${id}/devolver-solicitud`)
    .set(auth(pag))
    .send({ observation: "Actualizar autoridad" })
    .expect(200);
  const corrected = await request(app)
    .post(`/api/demo/victimas/items/${id}/corregir-reenviar`)
    .set(auth(rjv))
    .send({
      caseData: { ...payload.caseData, judicialAuthority: "Juzgado corregido" },
      correctionSummary: "Se corrige la autoridad",
    })
    .expect(200);
  assert.equal(
    corrected.body.request.versions[0].data.caseData.judicialAuthority,
    "Juzgado de ejemplo",
  );
  assert.equal(corrected.body.request.persons[0].emergingDamage, 1200.5);
  assert.ok(
    itemFrom(corrected).correctionHistory[0].changes.some(
      (entry) => entry.field === "caseData.judicialAuthority",
    ),
  );
  for (const bad of [
    { birthDate: "2005-02-30" },
    { monthlyIncome: -1 },
    { displacementDays: 1.5 },
    { birthDate: "2006-01-01", factDate: "2005-01-01" },
  ]) {
    await request(app)
      .post("/api/demo/victimas/solicitudes")
      .set(auth(rjv))
      .send(
        victimsPayload({
          externalId: "RAD-BAD",
          persons: [{ ...persons[0], ...bad }],
        }),
      )
      .expect(400);
  }
  const family = structuredClone(victimsPayload().persons);
  family[0].contact = {};
  family[0].contactUnavailableReason = "Víctima directa fallecida";
  await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(victimsPayload({ externalId: "RAD-FAMILIA", persons: family }))
    .expect(201);
  await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(
      victimsPayload({ externalId: "RAD-SIN-CONTACTO", persons: [family[0]] }),
    )
    .expect(400);
});

test("F171 reserva referencias y archivos al RJV titular y al perito; PAG y administración consultan metadatos", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const expert = await login(app, "demo-perito-psicologia");
  const admin = await login(app, "demo-admin");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(victimsPayload())
    .expect(201);
  const base = `/api/demo/victimas/items/${itemFrom(created).id}`;
  await request(app)
    .post(base + "/aprobar-y-repartir")
    .set(auth(pag))
    .expect(200);
  await request(app)
    .post(base + "/iniciar")
    .set(auth(expert))
    .expect(200);
  await request(app)
    .post(base + "/finalizar")
    .set(auth(expert))
    .send({
      ...pdfDelivery("bad-f171"),
      f171: { reportNumber: "PRIVADO-F171", assessmentDate: "2026-02-30" },
    })
    .expect(400);
  const delivered = await request(app)
    .post(base + "/finalizar")
    .set(auth(expert))
    .send({
      ...pdfDelivery("private-f171"),
      f171: { reportNumber: "PRIVADO-F171", assessmentDate: "2026-10-01" },
    })
    .expect(200);
  const product = itemFrom(delivered).products[0];
  assert.equal(product.formatMetadata.reportNumber, "PRIVADO-F171");
  const documentUrl = `${base}/productos/${product.id}/documento`;
  await request(app).get(documentUrl).set(auth(rjv)).expect(200);
  await request(app).get(documentUrl).set(auth(expert)).expect(200);
  for (const token of [pag, admin]) {
    await request(app).get(documentUrl).set(auth(token)).expect(403);
    const view = await request(app)
      .get("/api/demo/bootstrap")
      .set(auth(token))
      .expect(200);
    const item = view.body.requests.find(
      (entry) => entry.id === created.body.request.id,
    ).items[0];
    assert.equal(item.products[0].reserved, true);
    for (const field of ["reference", "attachment", "formatMetadata"])
      assert.equal(item.products[0][field], undefined);
    assert.equal(item.reportReference, "F171 reservado");
    assert.equal(item.products[0].status, "REGISTRADO");
  }
});

test("improcedencia es exclusiva del perito asignado, exige constancia y es idempotente sin alterar otros ítems ni Investigación", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const expert = await login(app, "demo-perito-psicologia");
  const otherExpert = await login(app, "demo-perito-financiero");
  const admin = await login(app, "demo-admin");
  const investigationBefore = app.locals.demoRepository
    .snapshot()
    .requests.filter((entry) => entry.area === "INVESTIGACION");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(
      victimsPayload({
        items: [
          { service: "SVC_VIC_EVALUACION_PSICOLOGICA", region: "BOGOTA" },
          { service: "SVC_VIC_LIQUIDACION_PERJUICIOS", region: "BOGOTA" },
        ],
      }),
    )
    .expect(201);
  const [first, second] = created.body.request.items;
  const url = `/api/demo/victimas/items/${first.id}/operaciones/improcedencia`;
  const payload = {
    reason: "Causal técnica de ejemplo",
    description: "Constancia ficticia motivada",
    supportReference: "CONSTANCIA-FICTICIA",
    submissionId: "imp-1",
  };
  for (const token of [rjv, pag, admin, otherExpert])
    await request(app).post(url).set(auth(token)).send(payload).expect(403);
  await request(app).post(url).set(auth(expert)).send(payload).expect(403);
  await request(app)
    .post(`/api/demo/victimas/items/${first.id}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);
  for (const field of ["reason", "description", "supportReference"])
    await request(app)
      .post(url)
      .set(auth(expert))
      .send({ ...payload, [field]: "" })
      .expect(400);
  const expired = tokenFor({
    sub: "demo-perito-psicologia",
    executorId: "per-demo-psi-01",
    grants: [
      {
        ...activeGrant(
          "DECLARAR_IMPROCEDENCIA_VICTIMAS",
          "VICTIMAS",
          "OWN_ASSIGNMENTS",
        ),
        validTo: "2026-10-01",
      },
    ],
  });
  await request(app).post(url).set(auth(expired)).send(payload).expect(403);
  const result = await request(app)
    .post(url)
    .set(auth(expert))
    .send(payload)
    .expect(201);
  assert.equal(itemFrom(result).status, "IMPROCEDENTE");
  const repeat = await request(app)
    .post(url)
    .set(auth(expert))
    .send(payload)
    .expect(201);
  assert.equal(itemFrom(repeat).operations.length, 1);
  await request(app)
    .post(url)
    .set(auth(expert))
    .send({ ...payload, reason: "Otra causa" })
    .expect(409);
  await request(app)
    .post(`/api/demo/victimas/items/${first.id}/iniciar`)
    .set(auth(expert))
    .expect(409);
  await request(app)
    .post(url)
    .set(auth(expert))
    .send({ ...payload, submissionId: "imp-2" })
    .expect(409);
  const view = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(rjv))
    .expect(200);
  const visible = view.body.requests.find(
    (entry) => entry.id === created.body.request.id,
  );
  assert.equal(
    visible.items.find((item) => item.id === second.id).status,
    "PENDIENTE_APROBACION_PAG",
  );
  assert.equal(
    visible.items[0].operations[0].routing.recipientUserId,
    "demo-rjv",
  );
  assert.equal(
    visible.items[0].operations[0].routing.emailStatus,
    "PENDIENTE_CONFIGURACION",
  );
  assert.deepEqual(
    app.locals.demoRepository
      .snapshot()
      .requests.filter((entry) => entry.area === "INVESTIGACION"),
    investigationBefore,
  );
  await request(app)
    .post(
      "/api/demo/investigacion/items/MT-2026-0001/operaciones/improcedencia",
    )
    .set(auth(expert))
    .send(payload)
    .expect(404);
});

test("leyes y anexos de Víctimas respetan elegibilidad y vigencia sin alterar los catálogos de Investigación", async () => {
  const app = testApp();
  const rjv = await login(app, "demo-rjv");
  const pag = await login(app, "demo-pag-victimas");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(victimsPayload({ law: "LEY_1719" }))
    .expect(201);
  const assigned = await request(app)
    .post(`/api/demo/victimas/items/${itemFrom(created).id}/aprobar-y-repartir`)
    .set(auth(pag))
    .expect(200);
  assert.equal(itemFrom(assigned).assigneeId, "per-demo-psi-01");
  assert.ok(
    itemFrom(assigned).assignment.evaluated.find(
      (entry) => entry.candidateId === "per-demo-psi-02",
    ).exclusions.length,
  );
  await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(
      victimsPayload({
        externalId: "RAD-ANEXO",
        documents: [{ type: "F169", reference: "ANEXO" }],
      }),
    )
    .expect(400);
  await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(
      victimsPayload({
        externalId: "RAD-ANEXO",
        law: "LEY_975",
        documents: [
          { type: "F163", reference: "SOLICITUD" },
          { type: "F169", reference: "ANEXO" },
        ],
      }),
    )
    .expect(201);
  app.locals.demoRepository.transaction((state) => {
    state.catalogs.laws.find((entry) => entry.id === "LEY_985").validTo =
      "2026-01-01";
  });
  await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(victimsPayload({ externalId: "RAD-VIGENCIA", law: "LEY_985" }))
    .expect(400);
});

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
    .send({
      verificationReference: "CONSTANCIA-VERIFICACION-1",
      confirmReviewed: true,
    })
    .expect(200);
  assert.equal(itemFrom(approved).status, "APROBADO_PENDIENTE_ENVIO");
  assert.equal(
    itemFrom(approved).timeline.at(-1).actor,
    "demo-pag-investigacion",
  );
  const closed = await request(app)
    .post(`/api/demo/investigacion/items/${item.id}/registrar-envio`)
    .set(auth(investigator))
    .send({ submissionId: "envio-flujo-1", evidence: "Correo al defensor 1" })
    .expect(200);
  assert.equal(itemFrom(closed).status, "CERRADA");
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
  const ownerAfterExecution = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(rjv))
    .expect(200);
  const sourceAfterExecution = ownerAfterExecution.body.requests.find(
    (entry) => entry.id === finished.body.request.id,
  );
  assert.deepEqual(
    {
      externalId: sourceAfterExecution.externalId,
      ownerUserId: sourceAfterExecution.ownerUserId,
      persons: sourceAfterExecution.persons,
      caseData: sourceAfterExecution.caseData,
      documents: sourceAfterExecution.documents,
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

  const unchanged = await request(app)
    .post(`/api/demo/victimas/items/${itemId}/corregir-reenviar`)
    .set(auth(rjv))
    .send({ correctionSummary: "Se revisó la información" })
    .expect(400);
  assert.match(unchanged.body.error.message, /al menos un cambio/i);

  const changedPersons = structuredClone(victimsPayload().persons);
  changedPersons[0].contact.phone = "3000000099";
  const changedCaseData = {
    ...victimsPayload().caseData,
    processReference: "Proceso de reparación corregido",
    facts: "Hechos corregidos luego de verificar el soporte de parentesco.",
  };
  const changedDocuments = [
    { type: "FORMATO_SOLICITUD", reference: "REF-FORM-VIC-001-CORREGIDO" },
  ];

  const missingDescription = await request(app)
    .post(`/api/demo/victimas/items/${itemId}/corregir-reenviar`)
    .set(auth(rjv))
    .send({ caseData: changedCaseData })
    .expect(400);
  assert.match(missingDescription.body.error.message, /descripci/i);

  const missingServiceDocument = await request(app)
    .post(`/api/demo/victimas/items/${itemId}/corregir-reenviar`)
    .set(auth(rjv))
    .send({
      correctionSummary: "Se corrigieron los hechos sin adjuntar el formato",
      caseData: changedCaseData,
      documents: [
        { type: "SOPORTE_RELACION", reference: "REF-PARENTESCO-CORREGIDO" },
      ],
    })
    .expect(400);
  assert.match(
    missingServiceDocument.body.error.message,
    /adjunte|documento|formato/i,
  );

  const afterRejectedCorrection = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(rjv))
    .expect(200);
  const unchangedRequest = afterRejectedCorrection.body.requests.find(
    (entry) => entry.externalId === "RAD-2026-0088",
  );
  assert.equal(unchangedRequest.versions.length, 1);
  assert.equal(
    unchangedRequest.items.find((entry) => entry.id === itemId).status,
    "DEVUELTA",
  );

  const resent = await request(app)
    .post(`/api/demo/victimas/items/${itemId}/corregir-reenviar`)
    .set(auth(rjv))
    .send({
      correctionSummary: "Soporte incorporado y grupo familiar actualizado",
      caseData: changedCaseData,
      persons: changedPersons,
      documents: changedDocuments,
    })
    .expect(200);
  assert.equal(itemFrom(resent).status, "PENDIENTE_APROBACION_PAG");
  assert.equal(resent.body.request.persons[0].contact.phone, "3000000099");
  assert.equal(
    resent.body.request.caseData.processReference,
    "Proceso de reparación corregido",
  );
  assert.equal(
    resent.body.request.documents[0].reference,
    "REF-FORM-VIC-001-CORREGIDO",
  );
  assert.equal(resent.body.request.versions.length, 2);
  assert.equal(
    resent.body.request.versions[0].data.persons[0].contact.phone,
    "3000000001",
  );
  assert.equal(
    resent.body.request.versions[1].data.persons[0].contact.phone,
    "3000000099",
  );
  assert.equal(resent.body.request.versions[1].correction.baseVersion, 1);
  assert.equal(resent.body.request.versions[1].correction.itemId, itemId);
  assert.deepEqual(
    resent.body.request.versions[1].correction.changes.map(
      (change) => change.field,
    ),
    ["caseData.processReference", "caseData.facts", "persons", "documents"],
  );
  assert.match(
    itemFrom(resent).timeline.at(-1).message,
    /corregida y reenviada/i,
  );

  const pagView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(pag))
    .expect(200);
  const pagRequest = pagView.body.requests.find(
    (entry) => entry.externalId === "RAD-2026-0088",
  );
  const pagItem = pagRequest.items.find((entry) => entry.id === itemId);
  assert.equal(
    pagRequest.caseData.processReference,
    "Proceso de reparación corregido",
  );
  assert.equal(pagRequest.persons[0].contact.phone, "3000000099");
  assert.equal(pagRequest.documents[0].reference, "REF-FORM-VIC-001-CORREGIDO");
  assert.equal(pagItem.submissionVersion, 2);
  assert.equal(
    pagItem.pagObservations[0].observation,
    "Adjuntar soporte de parentesco",
  );
  assert.equal(pagItem.correctionHistory[0].version, 2);
  assert.equal(pagItem.correctionHistory[0].changes.length, 4);

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
  assert.equal(reset.body.requests.length, 11);
  assert.deepEqual(reset.body.requests.map((entry) => entry.id).sort(), [
    "INV-2026-0001",
    "INV-2026-0002",
    "INV-2026-0003",
    "INV-2026-0101",
    "INV-2026-0102",
    "INV-2026-0103",
    "INV-2026-0104",
    "INV-2026-0105",
    "SVP-2026-0001",
    "SVP-2026-0002",
    "SVP-2026-0003",
  ]);
  assert.equal(
    reset.body.requests.filter((entry) => entry.area === "INVESTIGACION")
      .length,
    8,
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
  assert.equal(defenderView.body.requests.length, 8);
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
  assert.equal(
    response.body.serviceCatalog.services.length,
    createCatalogSeed().services.filter(
      (service) => service.area === "INVESTIGACION",
    ).length,
  );
  const coveredSpecialties = new Set(
    response.body.serviceCatalog.serviceSpecialtyRelations.map(
      (relation) => relation.specialtyId,
    ),
  );
  assert.ok(
    response.body.serviceCatalog.specialties.every((specialty) =>
      coveredSpecialties.has(specialty.id),
    ),
  );
  const identity = await request(app)
    .get("/api/auth/me")
    .set(auth(defender))
    .expect(200);
  assert.equal(identity.body.profile.fullName, "Laura Méndez");
  assert.equal(identity.body.profile.email, "laura.mendez@sigip.example");
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
  assert.equal(
    persistedModel.catalogs.services.length,
    createCatalogSeed().services.length,
  );
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
    requestCount: 8,
    personCount: 5,
    itemCount: 9,
    assignmentCount: 8,
    pendingItemCount: 1,
    activeItemCount: 6,
    closedItemCount: 2,
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
  const approvedPartial = await request(app)
    .post(`/api/demo/investigacion/items/${firstItemId}/aprobar-entrega`)
    .set(auth(pag))
    .send({
      verificationReference: "CONSTANCIA-VERIFICACION-MULTI",
      confirmReviewed: true,
    })
    .expect(200);
  assert.equal(
    approvedPartial.body.request.items[0].status,
    "APROBADO_PENDIENTE_ENVIO",
  );
  const partiallyClosed = await request(app)
    .post(`/api/demo/investigacion/items/${firstItemId}/registrar-envio`)
    .set(auth(investigator))
    .send({
      submissionId: "envio-multi-1",
      evidence: "Correo al defensor MULTI",
    })
    .expect(200);
  assert.equal(partiallyClosed.body.request.items[0].status, "CERRADA");
  const wholeRequest = (
    await request(app).get("/api/demo/bootstrap").set(auth(pag)).expect(200)
  ).body.requests.find((entry) => entry.id === created.body.request.id);
  assert.equal(wholeRequest.items[1].status, "PENDIENTE_EXCEPCION");
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
    ["demo-defensor", "INVESTIGACION", 19, 17],
    ["demo-investigador", "INVESTIGACION", 19, 17],
    ["demo-pag-investigacion", "INVESTIGACION", 19, 17],
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

test("supervisión central y territorial limita personal, eventos y métricas en servidor", async () => {
  const app = testApp();
  const pag = await login(app, "demo-pag-investigacion");
  const central = await request(app)
    .get("/api/demo/supervision/investigacion")
    .set(auth(pag))
    .expect(200);
  assert.equal(central.body.supervision.overview.requests, 8);
  assert.equal(central.body.supervision.personnel.length, 20);
  assert.ok(
    central.body.supervision.regions.some((entry) => entry.id === "META"),
  );
  const regional = await login(app, "demo-defensor-regional");
  const scoped = await request(app)
    .get("/api/demo/supervision/investigacion")
    .set(auth(regional))
    .expect(200);
  assert.ok(
    scoped.body.supervision.regions.every((entry) => entry.id === "BOGOTA"),
  );
  assert.ok(
    scoped.body.supervision.personnel.every((person) =>
      person.coverages.some((entry) => entry.id === "BOGOTA"),
    ),
  );
  assert.equal(JSON.stringify(scoped.body).includes("MT-2026-0105"), false);
  for (const user of [
    "demo-defensor",
    "demo-investigador",
    "demo-admin",
    "demo-pag-victimas",
    "demo-gestor-central-excepciones",
  ]) {
    const token = await login(app, user);
    await request(app)
      .get("/api/demo/supervision/investigacion")
      .set(auth(token))
      .expect(403);
    const bootstrap = await request(app)
      .get("/api/demo/bootstrap")
      .set(auth(token))
      .expect(200);
    assert.equal(bootstrap.body.supervision, null);
  }
  const expired = tokenFor({
    sub: "demo-pag-investigacion",
    area: "INVESTIGACION",
    grants: [
      {
        ...activeGrant("CONSULTAR_INDICADORES_INVESTIGACION", "INVESTIGACION"),
        validTo: "2026-01-01T00:00:00.000Z",
      },
    ],
  });
  await request(app)
    .get("/api/demo/supervision/investigacion")
    .set(auth(expired))
    .expect(403);
});

test("territorios ampliados no conceden automáticamente cobertura ni se trasladan a Víctimas", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const inv = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(defender))
    .expect(200);
  assert.equal(inv.body.catalogs.regions.length, 33);
  const supported = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(investigationPayload({ region: "VALLE_CAUCA" }))
    .expect(201);
  assert.equal(itemFrom(supported).status, "ASIGNADA");
  assert.equal(itemFrom(supported).assigneeName, "Felipe Osorio");
  const missing = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(investigationPayload({ region: "AMAZONAS" }))
    .expect(201);
  assert.equal(itemFrom(missing).status, "PENDIENTE_EXCEPCION");
  assert.ok(
    itemFrom(missing).assignment.evaluated.every(
      (candidate) => candidate.eligible === false,
    ),
  );
  const rjv = await login(app, "demo-rjv");
  const vic = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(rjv))
    .expect(200);
  assert.equal(vic.body.catalogs.regions.length, 3);
  assert.equal(
    vic.body.catalogs.regions.some((entry) => entry.id === "VALLE_CAUCA"),
    false,
  );
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
  const psychologyExpert = await login(app, "demo-perito-psicologia");
  const financialExpert = await login(app, "demo-perito-financiero");
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
  const correctedCaseData = {
    ...victimsPayload().caseData,
    facts: "Hechos precisados únicamente para el segundo ítem.",
  };
  const correctedDocuments = [
    { type: "FORMATO_SOLICITUD", reference: "REF-MULTIITEM-CORREGIDO" },
  ];
  const corrected = await request(app)
    .post(`/api/demo/victimas/items/${secondId}/corregir-reenviar`)
    .set(auth(rjv))
    .send({
      correctionSummary: "Se precisó la relación familiar",
      externalId: "CASO-VIC-MULTIITEM-CORREGIDO",
      caseData: correctedCaseData,
      persons: correctedPeople,
      documents: correctedDocuments,
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
  assert.equal(
    firstAfter.approvedRequestData.caseData.facts,
    victimsPayload().caseData.facts,
  );
  assert.equal(
    firstAfter.approvedRequestData.documents[0].reference,
    "REF-FORM-VIC-001",
  );
  assert.equal(secondAfter.submissionVersion, 2);
  assert.equal(secondAfter.approvedSubmissionVersion, null);
  assert.equal(corrected.body.request.persons.length, 3);
  assert.equal(
    corrected.body.request.caseData.facts,
    "Hechos precisados únicamente para el segundo ítem.",
  );
  assert.equal(
    corrected.body.request.documents[0].reference,
    "REF-MULTIITEM-CORREGIDO",
  );
  assert.equal(corrected.body.request.versions[0].reviews.length, 2);
  assert.equal(corrected.body.request.versions[1].reviews.length, 0);
  assert.equal(
    firstAfter.applicableRequestData.externalId,
    "CASO-VIC-MULTIITEM",
  );
  assert.equal(
    firstAfter.applicableRequestData.items.find((item) => item.id === firstId)
      .serviceLabel,
    "Evaluación psicológica pericial",
  );
  assert.ok(
    firstAfter.applicableRequestData.items
      .find((item) => item.id === firstId)
      .specialtyLabels.includes("Psicología pericial"),
  );
  assert.equal(
    firstAfter.applicableRequestData.items.find((item) => item.id === firstId)
      .lawLabel,
    "Ley 1448",
  );
  assert.equal(
    firstAfter.applicableRequestData.items.find((item) => item.id === firstId)
      .regionLabel,
    "Bogotá",
  );

  const firstExpertView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(psychologyExpert))
    .expect(200);
  const firstExpertItem = firstExpertView.body.requests
    .flatMap((entry) => entry.items)
    .find((item) => item.id === firstId);
  const firstExpertRequest = firstExpertView.body.requests.find((entry) =>
    entry.items.some((item) => item.id === firstId),
  );
  assert.equal(firstExpertRequest.externalId, undefined);
  assert.equal(firstExpertRequest.caseData, undefined);
  assert.equal(firstExpertRequest.persons, undefined);
  assert.equal(firstExpertRequest.documents, undefined);
  assert.deepEqual(
    firstExpertRequest.versions.map((entry) => entry.version),
    [1],
  );
  assert.equal(firstExpertRequest.aggregateCounts.totalItems, 2);
  assert.equal(firstExpertItem.submittedRequestData, undefined);
  assert.equal(firstExpertItem.correctionHistory, undefined);
  assert.equal(firstExpertItem.nextSubmissionVersion, undefined);
  assert.deepEqual(
    firstExpertItem.approvedRequestData.items.map((item) => item.id),
    [firstId],
  );
  assert.deepEqual(
    firstExpertRequest.versions[0].data.items.map((item) => item.id),
    [firstId],
  );
  assert.ok(
    !JSON.stringify(firstExpertRequest).includes("REF-MULTIITEM-CORREGIDO"),
  );
  assert.ok(
    !JSON.stringify(firstExpertRequest).includes("Persona vinculada C"),
  );
  assert.ok(!JSON.stringify(firstExpertRequest).includes(secondId));
  const startedForExpert = await request(app)
    .post(`/api/demo/victimas/items/${firstId}/iniciar`)
    .set(auth(psychologyExpert))
    .expect(200);
  assert.equal(startedForExpert.body.request.items[0].status, "EN_EJECUCION");
  assert.ok(!JSON.stringify(startedForExpert.body).includes(secondId));
  assert.ok(
    !JSON.stringify(startedForExpert.body).includes("Persona vinculada C"),
  );
  await request(app)
    .post(`/api/demo/victimas/items/${secondId}/iniciar`)
    .set(auth(psychologyExpert))
    .expect(403);
  assert.equal(firstExpertItem.approvedSubmissionVersion, 1);
  assert.equal(
    firstExpertItem.applicableRequestData.externalId,
    "CASO-VIC-MULTIITEM",
  );
  assert.equal(firstExpertItem.applicableRequestData.persons.length, 2);
  assert.equal(
    firstExpertItem.applicableRequestData.documents[0].reference,
    "REF-FORM-VIC-001",
  );

  for (const actor of [rjv, pag]) {
    const currentView = await request(app)
      .get("/api/demo/bootstrap")
      .set(auth(actor))
      .expect(200);
    const currentRequest = currentView.body.requests.find((entry) =>
      entry.items.some((item) => item.id === secondId),
    );
    assert.equal(currentRequest.externalId, "CASO-VIC-MULTIITEM-CORREGIDO");
    assert.equal(currentRequest.persons.length, 3);
    assert.equal(
      currentRequest.items.find((item) => item.id === secondId)
        .correctionHistory[0].version,
      2,
    );
  }

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
  const secondExpertView = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(financialExpert))
    .expect(200);
  const secondExpertItem = secondExpertView.body.requests
    .flatMap((entry) => entry.items)
    .find((item) => item.id === secondId);
  assert.equal(secondExpertItem.approvedSubmissionVersion, 2);
  assert.deepEqual(
    secondExpertItem.applicableRequestData.items.map((item) => item.id),
    [secondId],
  );
  const secondExpertRequest = secondExpertView.body.requests.find((entry) =>
    entry.items.some((item) => item.id === secondId),
  );
  assert.deepEqual(
    secondExpertRequest.versions.map((entry) => entry.version),
    [2],
  );
  assert.ok(!JSON.stringify(secondExpertRequest).includes(firstId));
  assert.equal(
    secondExpertItem.applicableRequestData.externalId,
    "CASO-VIC-MULTIITEM-CORREGIDO",
  );
  assert.equal(secondExpertItem.applicableRequestData.persons.length, 3);
  assert.equal(
    secondExpertItem.applicableRequestData.documents[0].reference,
    "REF-MULTIITEM-CORREGIDO",
  );
});

test("el alcance regional filtra también ítems dentro de versiones de Investigación", async () => {
  const app = testApp();
  const defender = await login(app, "demo-defensor");
  const regional = await login(app, "demo-gestor-regional-investigacion");
  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(
      investigationPayload({
        items: [
          { service: "SVC_INV_VERIFICACION_TERRENO", region: "BOGOTA" },
          { service: "SVC_INV_VERIFICACION_TERRENO", region: "ANTIOQUIA" },
        ],
      }),
    )
    .expect(201);
  const [visibleItem, hiddenItem] = created.body.request.items;
  const view = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(regional))
    .expect(200);
  const projected = view.body.requests.find(
    (entry) => entry.id === created.body.request.id,
  );
  assert.deepEqual(
    projected.items.map((item) => item.id),
    [visibleItem.id],
  );
  assert.deepEqual(
    projected.versions[0].data.items.map((item) => item.id),
    [visibleItem.id],
  );
  assert.ok(!JSON.stringify(projected).includes(hiddenItem.id));
  const beforeDeniedAction = app.locals.demoRepository.snapshot();
  await request(app)
    .post(`/api/demo/investigacion/items/${hiddenItem.id}/iniciar`)
    .set(auth(regional))
    .expect(403);
  assert.deepEqual(app.locals.demoRepository.snapshot(), beforeDeniedAction);
});

test("una concesión de consulta vencida no devuelve solicitudes ni snapshots", async () => {
  const app = testApp();
  const expired = tokenFor({
    sub: "lector-expirado",
    grants: [
      {
        ...activeGrant("CONSULTAR_SOLICITUDES", "VICTIMAS"),
        validTo: "2026-09-01T00:00:00.000Z",
      },
    ],
  });
  const view = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(expired))
    .expect(200);
  assert.deepEqual(view.body.requests, []);
  assert.deepEqual(view.body.allowedAreas, []);
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
    .send({
      verificationReference: "CONSTANCIA-VERIFICACION-V2",
      confirmReviewed: true,
    })
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
    [
      "actualizacion_f171",
      "SOLICITAR_ACTUALIZACION_F171",
      "DEC-VIC-F171",
      "VICTIMAS",
    ],
  ];
  const operator = tokenFor({
    sub: "operador-contratos-prueba",
    role: "perfil-propuesto-no-activo",
    area: "INVESTIGACION",
    grants: pendingOperations.map(([, capability, , area = "INVESTIGACION"]) =>
      activeGrant(capability, area),
    ),
  });

  const before = app.locals.demoRepository.snapshot();
  for (const [
    operation,
    ,
    decisionCode,
    area = "INVESTIGACION",
  ] of pendingOperations) {
    const itemPath =
      area === "VICTIMAS"
        ? "victimas/items/VIC-ITEM-DEMO-0001"
        : "investigacion/items/MT-2026-0001";
    const response = await request(app)
      .post(`/api/demo/${itemPath}/operaciones/${operation}`)
      .set(auth(operator))
      .send({})
      .expect(409);
    assert.equal(response.body.error.code, "PENDING_FUNCTIONAL_DECISION");
    assert.equal(response.body.error.details.decisionCode, decisionCode);
  }
  for (const operation of ["actualizacion_f171", "improcedencia"]) {
    await request(app)
      .post(
        `/api/demo/investigacion/items/MT-2026-0001/operaciones/${operation}`,
      )
      .set(auth(operator))
      .expect(404);
  }
  assert.deepEqual(app.locals.demoRepository.snapshot(), before);
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

function pdfDelivery(id = "upload-1") {
  return {
    deliveryMode: "PDF",
    submissionId: id,
    file: {
      name: "Informe de campo.pdf",
      mimeType: "application/pdf",
      contentBase64: Buffer.from(exampleReportPdf("MT-2026-0002")).toString(
        "base64",
      ),
    },
  };
}

test("PDF autorizado conserva bytes, historial y versiones; reintentos no duplican la entrega", async () => {
  const app = testApp();
  const investigator = await login(app, "demo-investigador");
  const pag = await login(app, "demo-pag-investigacion");
  const admin = await login(app, "demo-admin");
  const other = await login(app, "demo-investigador-mateo");
  const endpoint = "/api/demo/investigacion/items/MT-2026-0002";
  await request(app)
    .post(endpoint + "/devolver-entrega")
    .set(auth(pag))
    .send({ observation: "Añadir soporte" })
    .expect(200);
  await request(app)
    .post(endpoint + "/entregar")
    .set(auth(other))
    .send(pdfDelivery())
    .expect(403);
  for (const file of [
    {
      ...pdfDelivery().file,
      contentBase64: Buffer.from("texto").toString("base64"),
    },
    { ...pdfDelivery().file, mimeType: "text/plain" },
    { ...pdfDelivery().file, name: "../informe.pdf" },
    { ...pdfDelivery().file, contentBase64: "no es base64" },
    {
      ...pdfDelivery().file,
      contentBase64: Buffer.from("%PDF-1.4 /JavaScript %%EOF").toString(
        "base64",
      ),
    },
    {
      ...pdfDelivery().file,
      contentBase64: Buffer.alloc(2 * 1024 * 1024 + 1, 65).toString("base64"),
    },
  ]) {
    await request(app)
      .post(endpoint + "/entregar")
      .set(auth(investigator))
      .send({ ...pdfDelivery(), file })
      .expect(400);
  }
  const delivered = await request(app)
    .post(endpoint + "/entregar")
    .set(auth(investigator))
    .send(pdfDelivery())
    .expect(200);
  const product = itemFrom(delivered).products[1];
  assert.equal(product.version, 2);
  assert.equal(
    product.attachment.size,
    Buffer.from(exampleReportPdf("MT-2026-0002")).length,
  );
  assert.equal(product.attachment.sha256.length, 64);
  assert.equal(product.attachment.contentBase64, undefined);
  const repeated = await request(app)
    .post(endpoint + "/entregar")
    .set(auth(investigator))
    .send(pdfDelivery())
    .expect(200);
  assert.equal(itemFrom(repeated).products.length, 2);
  await request(app)
    .post(endpoint + "/entregar")
    .set(auth(investigator))
    .send({
      ...pdfDelivery(),
      file: { ...pdfDelivery().file, name: "Otro.pdf" },
    })
    .expect(409);
  await request(app)
    .post(endpoint + "/entregar")
    .set(auth(investigator))
    .send(pdfDelivery("another-id"))
    .expect(409);
  const download = endpoint + "/productos/" + product.id + "/documento";
  await request(app).get(download).expect(401);
  await request(app).get(download).set(auth(admin)).expect(200);
  const victimUser = await login(app, "demo-rjv");
  await request(app).get(download).set(auth(victimUser)).expect(403);
  await request(app).get(download).set(auth(other)).expect(403);
  await request(app)
    .get(download.replace("investigacion", "victimas"))
    .set(auth(pag))
    .expect(404);
  const bytes = await request(app)
    .get(download)
    .set(auth(pag))
    .expect(200)
    .expect("Content-Type", /application\/pdf/);
  assert.deepEqual(bytes.body, Buffer.from(exampleReportPdf("MT-2026-0002")));
  await request(app)
    .post(endpoint + "/devolver-entrega")
    .set(auth(pag))
    .send({ observation: "Aclarar hallazgos" })
    .expect(200);
  const newVersion = await request(app)
    .post(endpoint + "/entregar")
    .set(auth(investigator))
    .send(pdfDelivery("upload-2"))
    .expect(200);
  assert.equal(itemFrom(newVersion).products[2].version, 3);
  assert.equal(itemFrom(newVersion).products[1].status, "DEVUELTO");
  await request(app).get(download).set(auth(pag)).expect(200);
  const view = await request(app)
    .get("/api/demo/bootstrap")
    .set(auth(investigator))
    .expect(200);
  assert.equal(JSON.stringify(view.body).includes("contentBase64"), false);
  assert.equal(
    JSON.stringify(view.body).includes("confirmedSubmissions"),
    false,
  );
  assert.match(JSON.stringify(view.body), /Consulta del PDF/);
});

test("SharePoint se valida en servidor y Víctimas conserva cierre directo e idempotente con PDF", async () => {
  const app = testApp();
  const investigator = await login(app, "demo-investigador");
  const pag = await login(app, "demo-pag-investigacion");
  const endpoint = "/api/demo/investigacion/items/MT-2026-0002";
  await request(app)
    .post(endpoint + "/devolver-entrega")
    .set(auth(pag))
    .send({ observation: "Vincular informe" })
    .expect(200);
  for (const url of [
    "http://sigip.sharepoint.com/a.pdf",
    "https://sharepoint.com.evil.test/a",
    "https://user:password@sigip.sharepoint.com/a",
    "javascript:alert(1)",
  ]) {
    await request(app)
      .post(endpoint + "/entregar")
      .set(auth(investigator))
      .send({ deliveryMode: "SHAREPOINT", sharepointUrl: url })
      .expect(400);
  }
  const delivered = await request(app)
    .post(endpoint + "/entregar")
    .set(auth(investigator))
    .send({
      deliveryMode: "SHAREPOINT",
      sharepointUrl: "https://sigip.sharepoint.com/sites/informes/Informe.pdf",
    })
    .expect(200);
  assert.equal(itemFrom(delivered).status, "INFORME_ENTREGADO");
  assert.equal(itemFrom(delivered).products[1].attachment.kind, "SHAREPOINT");
  const rjv = await login(app, "demo-rjv");
  const pagVictims = await login(app, "demo-pag-victimas");
  const expert = await login(app, "demo-perito-psicologia");
  const created = await request(app)
    .post("/api/demo/victimas/solicitudes")
    .set(auth(rjv))
    .send(victimsPayload())
    .expect(201);
  const vic = "/api/demo/victimas/items/" + itemFrom(created).id;
  await request(app)
    .post(vic + "/aprobar-y-repartir")
    .set(auth(pagVictims))
    .expect(200);
  await request(app)
    .post(vic + "/iniciar")
    .set(auth(expert))
    .expect(200);
  const finished = await request(app)
    .post(vic + "/finalizar")
    .set(auth(expert))
    .send(pdfDelivery("f171-upload"))
    .expect(200);
  assert.equal(itemFrom(finished).status, "CERRADA");
  assert.equal(itemFrom(finished).products[0].type, "F171");
  assert.equal(itemFrom(finished).products[0].status, "REGISTRADO");
  const repeated = await request(app)
    .post(vic + "/finalizar")
    .set(auth(expert))
    .send(pdfDelivery("f171-upload"))
    .expect(200);
  assert.equal(itemFrom(repeated).products.length, 1);
});

test("actuaciones exigen texto y estado válido, autorización y reintento idempotente", async () => {
  const app = testApp();
  const investigator = await login(app, "demo-investigador");
  const pag = await login(app, "demo-pag-investigacion");
  const endpoint = "/api/demo/investigacion/items/MT-2026-0002";
  await request(app)
    .post(endpoint + "/avance")
    .set(auth(investigator))
    .send({ observation: "Actuación" })
    .expect(409);
  await request(app)
    .post(endpoint + "/devolver-entrega")
    .set(auth(pag))
    .send({ observation: "Completar" })
    .expect(200);
  await request(app)
    .post(endpoint + "/avance")
    .set(auth(pag))
    .send({ observation: "Actuación" })
    .expect(403);
  await request(app)
    .post(endpoint + "/avance")
    .set(auth(investigator))
    .send({ observation: " " })
    .expect(400);
  await request(app)
    .post(endpoint + "/avance")
    .set(auth(investigator))
    .send({ observation: "A".repeat(10001) })
    .expect(400);
  const payload = {
    observation:
      "Se entrevistaron dos fuentes.\nPendiente contraste documental.",
    submissionId: "act-1",
  };
  const first = await request(app)
    .post(endpoint + "/avance")
    .set(auth(investigator))
    .send(payload)
    .expect(200);
  const repeated = await request(app)
    .post(endpoint + "/avance")
    .set(auth(investigator))
    .send(payload)
    .expect(200);
  assert.equal(
    itemFrom(first).activities.length,
    itemFrom(repeated).activities.length,
  );
  assert.equal(
    itemFrom(repeated).activities.at(-1).observation,
    payload.observation,
  );
  assert.equal(itemFrom(repeated).status, "EN_EJECUCION");
});
