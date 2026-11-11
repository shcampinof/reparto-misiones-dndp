import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { createSilentLogger } from "../../src/shared/logger.js";
import {
  addTermDays,
  institutionalDate,
  termTracking,
} from "../../src/modules/core/calendars/terms.js";
import { dispatchOutbox } from "../../src/modules/core/notifications/outbox.js";

const secret = "adjustment-test-secret-with-at-least-thirty-two-characters";
const at = "2026-10-16T14:00:00.000Z";
const service = "SVC_INV_VERIFICACION_TERRENO";
const path = "/api/demo/investigacion/items/MT-2026-0001";
const calendar = {
  id: "TEST-CALENDAR",
  version: "test-1",
  holidays: ["2026-10-19"],
  weekendDays: [0, 6],
  validFrom: "2026-01-01",
  validTo: "2027-01-01",
};
function appFor(clock = () => at) {
  return createApp({
    config: createConfig({
      NODE_ENV: "test",
      JWT_SECRET: secret,
      ENABLE_DEMO_ACCOUNTS: "true",
    }),
    logger: createSilentLogger(),
    clock,
  });
}
async function login(app, userId) {
  return (
    await request(app).post("/api/auth/demo-login").send({ userId }).expect(200)
  ).body.accessToken;
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const post = (app, token, suffix, body, url = path) =>
  request(app).post(`${url}/${suffix}`).set(auth(token)).send(body);
function configure(app, type, changes = {}) {
  app.locals.demoRepository.transaction((state) => {
    state.calendars = [calendar];
    state.investigationPolicies.push({
      type,
      area: "INVESTIGACION",
      status: "APROBADA",
      version: "TEST-ONLY-1",
      approvalEvidence: "TEST-ONLY-NOT-INSTITUTIONAL",
      validFrom: "2026-01-01",
      validTo: "2027-01-01",
      maxExtensions: 2,
      extensionDays: 3,
      dayType: "HABILES",
      calendarId: calendar.id,
      calendarVersion: calendar.version,
      approverRole: "gestor_operativo_regional",
      initiatorRole: "pag_investigacion",
      routerRole: "gestor_central_excepciones",
      route: "CENTRAL",
      ...changes,
    });
    const item = state.requests.find((entry) => entry.id === "INV-2026-0001")
      .items[0];
    item.dueDate = "2026-10-16";
    item.termSnapshot = {
      status: "APROBADA",
      approvalEvidence: "TEST-ONLY",
      version: 1,
      value: 3,
      dayType: "HABILES",
      calendarId: calendar.id,
    };
    item.calendarSnapshot = calendar;
  });
}
const extension = (id = "extension-1") => ({
  submissionId: id,
  reason: "Diligencia pendiente por insumo",
  supportReference: "SOPORTE-TEST",
});
const referral = (id = "referral-1") => ({
  submissionId: id,
  service,
  region: "ANTIOQUIA",
  reason: "Visita en otra ciudad",
  completedActivities: "Entrevista de origen concluida",
  pendingActivities: "Verificar arraigo en destino",
});

test("calendario distingue fin de semana, festivo y cambio de vigencia; no fija plazos institucionales", () => {
  assert.equal(addTermDays("2026-10-16", 3, "HABILES", calendar), "2026-10-22");
  assert.equal(
    addTermDays("2026-10-16", 3, "CALENDARIO", calendar),
    "2026-10-19",
  );
  assert.throws(() => addTermDays("2026-12-31", 1, "HABILES", calendar), {
    code: "CALENDAR_OUT_OF_VALIDITY",
  });
  assert.throws(() => addTermDays("2026-10-16", 3, "HABILES", undefined), {
    code: "INVALID_TERM_POLICY",
  });
  assert.equal(institutionalDate("2027-01-01T02:00:00Z"), "2026-12-31");
  const item = {
    dueDate: "2026-10-22",
    status: "EN_EJECUCION",
    termSnapshot: {
      status: "APROBADA",
      approvalEvidence: "TEST",
      dayType: "HABILES",
    },
    calendarSnapshot: calendar,
  };
  assert.equal(termTracking(item, at).daysRemaining, 3);
  assert.equal(
    termTracking(
      {
        ...item,
        status: "CERRADA",
        timeline: [{ to: "INFORME_ENTREGADO", at }],
      },
      "2026-12-01T14:00:00Z",
    ).opportunity,
    "Entregado en plazo",
  );
});

const intake = (overrides = {}) => ({
  identifierType: "SPOA",
  spoa: "000016000049202600090",
  processReference: "Proceso de prueba",
  delito: "Conducta de prueba",
  proceduralStage: "INVESTIGACION",
  hearingApplies: false,
  facts: "Hechos de prueba",
  hypothesis: "Hipótesis verificable",
  requiredWork: "Entrevistar y verificar",
  differentialApproach: { applies: false },
  priority: { type: "ORDINARIA" },
  persons: [{ alias: "Persona de prueba", relationship: "Procesado" }],
  documents: [{ type: "SOLICITUD_DEFENSA", reference: "REF-TEST" }],
  service,
  region: "BOGOTA",
  ...overrides,
});

test("asignación calcula un término sólo con política de servicio vigente y conserva calendario", async () => {
  const app = appFor(),
    token = await login(app, "demo-defensor");
  app.locals.demoRepository.transaction((state) => {
    state.calendars = [calendar];
    state.catalogs.services.find((entry) => entry.id === service).termPolicy = {
      status: "APROBADA",
      version: "TEST-TERM-1",
      approvalEvidence: "TEST-ONLY",
      validFrom: "2026-01-01",
      validTo: "2027-01-01",
      startEvent: "ASIGNACION",
      value: 3,
      dayType: "HABILES",
      calendarId: calendar.id,
      calendarVersion: calendar.version,
    };
  });
  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(token))
    .send(intake())
    .expect(201);
  assert.equal(created.body.request.items[0].dueDate, "2026-10-22");
  assert.equal(
    created.body.request.items[0].calendarSnapshot.version,
    calendar.version,
  );
  app.locals.demoRepository.transaction((state) => {
    state.catalogs.services.find(
      (entry) => entry.id === service,
    ).termPolicy.validTo = "2026-10-16";
  });
  const before = app.locals.demoRepository.snapshot();
  await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(token))
    .send(intake())
    .expect(409);
  assert.deepEqual(app.locals.demoRepository.snapshot(), before);
});

test("corrección de informe no habilita automáticamente una prórroga", async () => {
  const app = appFor();
  configure(app, "PRORROGA");
  app.locals.demoRepository.transaction((state) => {
    state.requests
      .find((entry) => entry.id === "INV-2026-0001")
      .items[0].timeline.push({
        at,
        to: "INFORME_ENTREGADO",
        from: "EN_EJECUCION",
        actor: "demo-investigador-mateo",
        message: "Entrega anterior",
      });
  });
  const token = await login(app, "demo-investigador-mateo"),
    manager = await login(app, "demo-gestor-regional-investigacion");
  const created = await post(
    app,
    token,
    "solicitar-prorroga",
    extension(),
  ).expect(200);
  const result = await post(app, manager, "decidir-prorroga", {
    submissionId: "after-return",
    extensionId: created.body.request.items[0].termExtensions[0].id,
    decision: "APROBADA",
    observation: "Corrección",
  }).expect(409);
  assert.equal(result.body.error.code, "RETURN_EXTENSION_POLICY_PENDING");
});

test("SPOA conserva ceros y exige 21 dígitos de texto; fechas y longitud técnica se validan en API", async () => {
  const app = appFor(),
    token = await login(app, "demo-defensor");
  for (const spoa of [1234, "123", "a".repeat(21), "1".repeat(22)]) {
    await request(app)
      .post("/api/demo/investigacion/solicitudes")
      .set(auth(token))
      .send(intake({ spoa }))
      .expect(400);
  }
  const created = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(token))
    .send(intake())
    .expect(201);
  assert.equal(created.body.request.externalId, "000016000049202600090");
  assert.match(created.body.request.id, /^INV-2026-\d{5}$/);
  assert.match(created.body.request.displayNumber, /^2026-\d{5}$/);
  await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(token))
    .send(intake({ hearingApplies: true, hearingDate: "2026-02-30" }))
    .expect(400);
  app.locals.demoRepository.transaction((state) => {
    state.investigationTextPolicy.maxLength = 50;
  });
  await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(token))
    .send(intake({ facts: "x".repeat(51) }))
    .expect(400);
});

test("numeración anual utiliza la fecha de Bogotá, incrementa sin colisión y reinicia por año", async () => {
  let now = "2027-01-01T02:00:00Z";
  const app = appFor(() => now),
    token = await login(app, "demo-defensor");
  const submit = () =>
    request(app)
      .post("/api/demo/investigacion/solicitudes")
      .set(auth(token))
      .send(intake())
      .expect(201);
  const first = await submit(),
    second = await submit();
  assert.match(first.body.request.id, /^INV-2026-\d{5}$/);
  assert.notEqual(first.body.request.id, second.body.request.id);
  now = "2027-01-01T06:00:00Z";
  const nextYear = await submit();
  assert.equal(nextYear.body.request.id, "INV-2027-00001");
});

test("dos remisiones concurrentes conservan hijos distintos y revalidan la carga en cada reparto", async () => {
  const app = appFor();
  configure(app, "REMISION");
  app.locals.demoRepository.transaction((state) => {
    for (const person of state.professionals)
      if (person.area === "INVESTIGACION")
        person.available = person.id === "inv-demo-02";
  });
  const pag = await login(app, "demo-pag-investigacion"),
    central = await login(app, "demo-gestor-central-excepciones");
  const results = await Promise.all([
    post(app, pag, "remitir-actividad", {
      ...referral("concurrent-1"),
      region: "BOGOTA",
    }).expect(200),
    post(app, pag, "remitir-actividad", {
      ...referral("concurrent-2"),
      region: "BOGOTA",
    }).expect(200),
  ]);
  const ids = results[1].body.request.items
    .filter((item) => item.originItemId)
    .map((item) => item.id);
  assert.equal(new Set(ids).size, 2);
  const routed = await Promise.all(
    ids.map((id) =>
      post(
        app,
        central,
        "enrutar-actividad",
        { submissionId: `route-${id}`, observation: "Reparto concurrente" },
        `/api/demo/investigacion/items/${id}`,
      ).expect(200),
    ),
  );
  const selected = routed.map((response, index) =>
    response.body.request.items
      .find((item) => item.id === ids[index])
      .assignment.evaluated.find(
        (candidate) => candidate.candidateId === "inv-demo-02",
      ),
  );
  assert.equal(selected[1].metrics.load, selected[0].metrics.load + 1);
});

test("solicitud de prórroga es trazable e idempotente y no altera término ni otros ítems", async () => {
  const app = appFor(),
    token = await login(app, "demo-investigador-mateo");
  const before = app.locals.demoRepository.snapshot();
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await post(
      app,
      token,
      "solicitar-prorroga",
      extension(),
    ).expect(200);
    assert.equal(result.body.request.items[0].termExtensions.length, 1);
    assert.equal(result.body.request.items[0].status, "EN_EJECUCION");
    assert.equal(result.body.request.items[0].dueDate, null);
  }
  await post(app, token, "solicitar-prorroga", {
    ...extension(),
    reason: "Otra razón",
  }).expect(409);
  await post(
    app,
    token,
    "solicitar-prorroga",
    extension("second-pending"),
  ).expect(409);
  assert.deepEqual(
    app.locals.demoRepository
      .snapshot()
      .requests.filter((entry) => entry.area === "VICTIMAS"),
    before.requests.filter((entry) => entry.area === "VICTIMAS"),
  );
});

test("prórroga deniega rol ajeno, otro asignado, estados inválidos y decisiones sin política", async () => {
  const app = appFor();
  const mateo = await login(app, "demo-investigador-mateo"),
    other = await login(app, "demo-investigador"),
    manager = await login(app, "demo-gestor-regional-investigacion"),
    defender = await login(app, "demo-defensor");
  await post(app, other, "solicitar-prorroga", extension()).expect(403);
  await post(app, defender, "solicitar-prorroga", extension()).expect(403);
  await post(
    app,
    other,
    "solicitar-prorroga",
    extension(),
    "/api/demo/investigacion/items/MT-2026-0002",
  ).expect(409);
  const created = await post(
    app,
    mateo,
    "solicitar-prorroga",
    extension(),
  ).expect(200);
  const extensionId = created.body.request.items[0].termExtensions[0].id;
  const before = app.locals.demoRepository.snapshot();
  const rejected = await post(app, manager, "decidir-prorroga", {
    submissionId: "decision-1",
    extensionId,
    decision: "APROBADA",
    observation: "Se acepta",
  }).expect(409);
  assert.equal(rejected.body.error.code, "PENDING_FUNCTIONAL_DECISION");
  assert.deepEqual(app.locals.demoRepository.snapshot(), before);
});

test("política de prueba permite decisión con calendario, límite y conservación de snapshots", async () => {
  const app = appFor();
  configure(app, "PRORROGA");
  const mateo = await login(app, "demo-investigador-mateo"),
    manager = await login(app, "demo-gestor-regional-investigacion");
  const created = await post(
    app,
    mateo,
    "solicitar-prorroga",
    extension(),
  ).expect(200);
  const extensionId = created.body.request.items[0].termExtensions[0].id;
  const payload = {
    submissionId: "decision-1",
    extensionId,
    decision: "APROBADA",
    observation: "Sustento verificado",
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await post(app, manager, "decidir-prorroga", payload).expect(
      200,
    );
    const item = result.body.request.items[0];
    assert.equal(item.dueDate, "2026-10-22");
    assert.equal(item.termExtensions[0].originalDueDate, "2026-10-16");
    assert.equal(item.termExtensions[0].policySnapshot.version, "TEST-ONLY-1");
  }
  app.locals.demoRepository.transaction((state) => {
    state.investigationPolicies[0].extensionDays = 4;
  });
  const snapshot = app.locals.demoRepository
    .snapshot()
    .requests.find((entry) => entry.id === "INV-2026-0001").items[0];
  assert.equal(snapshot.termExtensions[0].policySnapshot.extensionDays, 3);
});

for (const [name, changes, expected] of [
  ["vencida", { validTo: "2026-10-16" }, "PENDING_FUNCTIONAL_DECISION"],
  ["futura", { validFrom: "2026-10-17" }, "PENDING_FUNCTIONAL_DECISION"],
  ["sin evidencia", { approvalEvidence: null }, "PENDING_FUNCTIONAL_DECISION"],
  ["límite no autorizado", { maxExtensions: 0 }, "EXTENSION_LIMIT"],
  ["reporte previo", { requiresProblem: true }, "PROBLEM_REQUIRED"],
])
  test(`prórroga rechaza política ${name} sin mutación parcial`, async () => {
    const app = appFor();
    configure(app, "PRORROGA", changes);
    // This scenario deliberately removes the initial problem to test the policy gate.
    app.locals.demoRepository.transaction((state) => {
      state.requests.find(
        (entry) => entry.id === "INV-2026-0001",
      ).items[0].operations = [];
    });
    const token = await login(app, "demo-investigador-mateo"),
      manager = await login(app, "demo-gestor-regional-investigacion");
    const created = await post(
      app,
      token,
      "solicitar-prorroga",
      extension(),
    ).expect(200);
    const before = app.locals.demoRepository.snapshot();
    const result = await post(app, manager, "decidir-prorroga", {
      submissionId: "decision-1",
      extensionId: created.body.request.items[0].termExtensions[0].id,
      decision: "APROBADA",
      observation: "Observación",
    }).expect(409);
    assert.equal(result.body.error.code, expected);
    assert.deepEqual(app.locals.demoRepository.snapshot(), before);
  });

test("rechazo de prórroga exige RACI vigente y no cambia vencimiento", async () => {
  const app = appFor();
  configure(app, "PRORROGA");
  const token = await login(app, "demo-investigador-mateo"),
    manager = await login(app, "demo-gestor-regional-investigacion");
  const created = await post(
    app,
    token,
    "solicitar-prorroga",
    extension(),
  ).expect(200);
  const result = await post(app, manager, "decidir-prorroga", {
    submissionId: "decision-1",
    extensionId: created.body.request.items[0].termExtensions[0].id,
    decision: "RECHAZADA",
    observation: "No se acredita la causal",
  }).expect(200);
  assert.equal(result.body.request.items[0].dueDate, "2026-10-16");
  assert.equal(
    result.body.request.items[0].termExtensions[0].status,
    "RECHAZADA",
  );
});

test("remisión requiere política y conserva SPOA, titular, origen y trabajo sin elegir investigador", async () => {
  const app = appFor(),
    pag = await login(app, "demo-pag-investigacion"),
    central = await login(app, "demo-gestor-central-excepciones"),
    admin = await login(app, "demo-admin");
  await post(app, pag, "remitir-actividad", referral()).expect(409);
  configure(app, "REMISION");
  await post(app, admin, "remitir-actividad", referral()).expect(403);
  await post(app, pag, "remitir-actividad", {
    ...referral(),
    assigneeId: "chosen",
  }).expect(400);
  let created;
  for (let attempt = 0; attempt < 2; attempt++)
    created = await post(app, pag, "remitir-actividad", referral()).expect(200);
  const derived = created.body.request.items.find((item) => item.originItemId);
  assert.equal(created.body.request.items.length, 3);
  assert.equal(created.body.request.id, "INV-2026-0001");
  assert.equal(created.body.request.ownerUserId, "demo-defensor");
  assert.equal(derived.status, "PENDIENTE_ENRUTAMIENTO");
  assert.equal(derived.assigneeId, null);
  const original = app.locals.demoRepository
    .snapshot()
    .requests.find((entry) => entry.id === "INV-2026-0001").items[0];
  assert.equal(original.status, "EN_EJECUCION");
  const url = `/api/demo/investigacion/items/${derived.id}`;
  await post(
    app,
    pag,
    "enrutar-actividad",
    { submissionId: "route-1", observation: "Enrutar" },
    url,
  ).expect(403);
  const routed = await post(
    app,
    central,
    "enrutar-actividad",
    { submissionId: "route-1", observation: "Validada la regional destino" },
    url,
  ).expect(200);
  const item = routed.body.request.items.find(
    (entry) => entry.id === derived.id,
  );
  assert.equal(item.status, "ASIGNADA");
  assert.ok(item.assigneeId);
  assert.ok(item.assignment.evaluated.length);
  const repeated = await post(
    app,
    central,
    "enrutar-actividad",
    { submissionId: "route-1", observation: "Validada la regional destino" },
    url,
  ).expect(200);
  assert.deepEqual(
    repeated.body.request.items.find((entry) => entry.id === item.id)
      .assignment,
    item.assignment,
  );
});

test("remisión sin candidato conserva explicación y excluye coberturas vencidas", async () => {
  const app = appFor();
  configure(app, "REMISION");
  const pag = await login(app, "demo-pag-investigacion"),
    central = await login(app, "demo-gestor-central-excepciones");
  const invalid = { ...referral(), region: "NO-EXISTE" };
  await post(app, pag, "remitir-actividad", invalid).expect(400);
  const created = await post(app, pag, "remitir-actividad", {
    ...referral(),
    region: "CUNDINAMARCA",
    service: "SVC_INV_ANALISIS_BALISTICO",
  }).expect(200);
  const derived = created.body.request.items.find(
    (entry) => entry.originItemId,
  );
  const routed = await post(
    app,
    central,
    "enrutar-actividad",
    { submissionId: "route-no-candidate", observation: "Remisión de prueba" },
    `/api/demo/investigacion/items/${derived.id}`,
  ).expect(200);
  const item = routed.body.request.items.find(
    (entry) => entry.id === derived.id,
  );
  assert.equal(item.status, "PENDIENTE_EXCEPCION");
  assert.equal(item.assigneeId, null);
  assert.ok(item.assignment.selectedReason);
});

test("verificación y envío separan aprobación de cierre y generan un solo aviso al defensor", async () => {
  const app = appFor(),
    pag = await login(app, "demo-pag-investigacion"),
    investigator = await login(app, "demo-investigador"),
    defender = await login(app, "demo-defensor");
  const url = "/api/demo/investigacion/items/MT-2026-0002";
  await post(app, pag, "aprobar-entrega", {}, url).expect(400);
  await post(
    app,
    defender,
    "aprobar-entrega",
    { verificationReference: "REF", confirmReviewed: true },
    url,
  ).expect(403);
  const approved = await post(
    app,
    pag,
    "aprobar-entrega",
    {
      verificationReference: "VERIFICACION-FIRMADA-TEST",
      confirmReviewed: true,
    },
    url,
  ).expect(200);
  assert.equal(
    approved.body.request.items[0].status,
    "APROBADO_PENDIENTE_ENVIO",
  );
  assert.equal(
    approved.body.request.items[0].verification.confirmedBy,
    "demo-pag-investigacion",
  );
  await post(
    app,
    pag,
    "registrar-envio",
    { submissionId: "envio-1", evidence: "CORREO" },
    url,
  ).expect(403);
  await post(
    app,
    investigator,
    "registrar-envio",
    { submissionId: "envio-1" },
    url,
  ).expect(400);
  for (let attempt = 0; attempt < 2; attempt++) {
    const closed = await post(
      app,
      investigator,
      "registrar-envio",
      { submissionId: "envio-1", evidence: "CORREO-AL-DEFENSOR-TEST" },
      url,
    ).expect(200);
    assert.equal(closed.body.request.items[0].status, "CERRADA");
  }
  const state = app.locals.demoRepository.snapshot();
  assert.equal(
    state.outbox.filter(
      (entry) =>
        entry.type === "MISION_FINALIZADA" && entry.itemId === "MT-2026-0002",
    ).length,
    1,
  );
  assert.ok(
    state.outbox.every(
      (entry) => !entry.facts && !entry.documents && !entry.token,
    ),
  );
});

test("outbox maneja fallo y reintento con la misma clave sin duplicar operaciones de negocio", async () => {
  const app = appFor(),
    repository = app.locals.demoRepository;
  repository.transaction((state) => {
    state.outbox = [
      {
        key: "test-mail",
        type: "MISION_ASIGNADA",
        status: "PENDIENTE",
        attempts: 0,
        recipientUserId: "demo-investigador",
        requestId: "INV-TEST",
        itemId: "MT-TEST",
      },
    ];
  });
  const before = repository.snapshot().requests;
  const keys = [];
  let fail = true;
  const sender = {
    async send(message) {
      keys.push(message.idempotencyKey);
      if (fail) throw new Error("Internal private failure");
      return { id: "provider-1" };
    },
  };
  await dispatchOutbox({ repository, sender });
  assert.equal(repository.snapshot().outbox[0].status, "FALLIDA");
  assert.ok(
    !JSON.stringify(repository.snapshot().outbox).includes(
      "Internal private failure",
    ),
  );
  fail = false;
  const retryClock = () => new Date(Date.now() + 10000).toISOString();
  await Promise.all([
    dispatchOutbox({ repository, sender, clock: retryClock }),
    dispatchOutbox({ repository, sender, clock: retryClock }),
  ]);
  await dispatchOutbox({ repository, sender });
  assert.deepEqual(keys, ["test-mail", "test-mail"]);
  assert.equal(repository.snapshot().outbox[0].status, "ENVIADA");
  assert.deepEqual(repository.snapshot().requests, before);
});

test("exportación XLSX respeta titularidad, área, filtros, auditoría y no convierte texto en fórmula", async () => {
  const app = appFor(),
    defender = await login(app, "demo-defensor"),
    pag = await login(app, "demo-pag-investigacion"),
    rjv = await login(app, "demo-rjv");
  const repo = app.locals.demoRepository;
  repo.transaction((state) => {
    state.requests.find((entry) => entry.area === "INVESTIGACION").externalId =
      '=HYPERLINK("https://invalid")';
  });
  await request(app).get("/api/demo/reportes/investigacion.xlsx").expect(401);
  await request(app)
    .get("/api/demo/reportes/investigacion.xlsx")
    .set(auth(rjv))
    .expect(403);
  await request(app)
    .get("/api/demo/reportes/investigacion.xlsx?from=2026-02-30")
    .set(auth(pag))
    .expect(400);
  const bytes = (
    await request(app)
      .get("/api/demo/reportes/investigacion.xlsx?region=BOGOTA")
      .set(auth(defender))
      .buffer(true)
      .parse((response, done) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => done(null, Buffer.concat(chunks)));
      })
      .expect(200)
  ).body;
  assert.equal(bytes.subarray(0, 4).toString("hex"), "504b0304");
  const text = bytes.toString("utf8");
  assert.match(text, /inlineStr/);
  assert.doesNotMatch(text, /<f[ >]/);
  assert.match(text, /HYPERLINK/);
  assert.doesNotMatch(text, /Pericia administrativa|F171|shcampinof/);
  assert.ok(
    repo
      .snapshot()
      .audit.some(
        (entry) =>
          entry.type === "EXPORTACION_INVESTIGACION" &&
          entry.filters.region === "BOGOTA",
      ),
  );
});

test("concesión vencida y alcance regional protegen decisiones y exportaciones", async () => {
  const app = appFor();
  configure(app, "PRORROGA");
  const token = jwt.sign(
    {
      sub: "demo-gestor-regional-investigacion",
      role: "gestor_operativo_regional",
      area: "INVESTIGACION",
      region: "ANTIOQUIA",
      grants: [
        {
          capability: "DECIDIR_PRORROGA_INVESTIGACION",
          area: "INVESTIGACION",
          scopeType: "REGION",
          region: "ANTIOQUIA",
          validFrom: "2026-01-01",
        },
      ],
    },
    secret,
  );
  await post(app, token, "decidir-prorroga", {
    submissionId: "unauthorized",
  }).expect(403);
  const expired = jwt.sign(
    {
      sub: "demo-defensor",
      grants: [
        {
          capability: "EXPORTAR_INVESTIGACION",
          area: "INVESTIGACION",
          scopeType: "AREA",
          validTo: "2026-01-01",
        },
      ],
    },
    secret,
  );
  await request(app)
    .get("/api/demo/reportes/investigacion.xlsx")
    .set(auth(expired))
    .expect(403);
});

test("IRIS es una referencia sin verificar sólo de Investigación y no habilita conexión externa", async () => {
  const app = appFor(),
    mateo = await login(app, "demo-investigador-mateo"),
    perito = await login(app, "demo-perito-psicologia");
  const result = await post(app, mateo, "entregar", {
    deliveryMode: "IRIS",
    reference: "EXP-IRIS-TEST-1",
    submissionId: "iris-delivery",
  }).expect(200);
  assert.equal(
    result.body.request.items[0].products.at(-1).attachment.verificationStatus,
    "NO_VERIFICADO",
  );
  await request(app)
    .post("/api/demo/victimas/items/VIC-ITEM-DEMO-0003/iniciar")
    .set(auth(perito))
    .expect(200);
  await request(app)
    .post("/api/demo/victimas/items/VIC-ITEM-DEMO-0003/finalizar")
    .set(auth(perito))
    .send({ deliveryMode: "IRIS", f171Reference: "REF-IRIS" })
    .expect(400);
});
