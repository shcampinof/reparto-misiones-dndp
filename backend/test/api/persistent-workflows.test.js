import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import jwt from "jsonwebtoken";
import { Worker } from "node:worker_threads";
import { createApp } from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { createSilentLogger } from "../../src/shared/logger.js";
import { SqliteRepository } from "../../src/infrastructure/persistence/sqlite-repository.js";
import { sampleF171Attachment } from "../../src/infrastructure/demo/sample-f171.js";

const secret = "persistent-test-secret-with-at-least-thirty-two-characters";
const instant = "2026-10-16T14:00:00Z";
const auth = (token) => ({ Authorization: `Bearer ${token}` });
function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), "sigip-test-"));
  const filename = join(directory, "workflow.sqlite");
  const apps = [];
  const open = (overrides = {}) => {
    const app = createApp({
      config: createConfig({
        NODE_ENV: "test",
        ENABLE_DEMO_ACCOUNTS: "true",
        ENABLE_PROVISIONAL_RULES: "true",
        STORAGE_DRIVER: "sqlite",
        SQLITE_PATH: filename,
        JWT_SECRET: secret,
        ...overrides,
      }),
      logger: createSilentLogger(),
      clock: () => instant,
    });
    apps.push(app);
    return app;
  };
  t.after(() => {
    for (const app of apps) {
      try {
        app.locals.demoRepository.close();
      } catch {
        /* already closed during restart */
      }
    }
    rmSync(directory, { recursive: true, force: true });
  });
  return { open, filename };
}
async function login(app, userId) {
  return (
    await request(app).post("/api/auth/demo-login").send({ userId }).expect(200)
  ).body.accessToken;
}
const post = (app, token, area, id, action, payload = {}) =>
  request(app)
    .post(`/api/demo/${area}/items/${id}/${action}`)
    .set(auth(token))
    .send(payload);
const intake = (spoa = "000016000049202600090") => ({
  identifierType: "SPOA",
  spoa,
  processReference: "Proceso de prueba",
  delito: "Conducta de prueba",
  proceduralStage: "INVESTIGACION",
  hearingApplies: false,
  facts: "Hechos de prueba",
  hypothesis: "Hipótesis",
  requiredWork: "Verificar",
  differentialApproach: { applies: false },
  priority: { type: "ORDINARIA" },
  persons: [{ alias: "Persona de prueba", relationship: "Procesado" }],
  documents: [{ type: "SOLICITUD_DEFENSA", reference: "REF-TEST" }],
  service: "SVC_INV_VERIFICACION_TERRENO",
  region: "BOGOTA",
});
async function createMission(app, spoa) {
  const defender = await login(app, "demo-defensor");
  const result = await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send(intake(spoa))
    .expect(201);
  const item = result.body.request.items[0];
  const executor = app.locals.demoRepository
    .snapshot()
    .users.find((user) =>
      user.accounts.some((account) => account.executorId === item.assigneeId),
    );
  return {
    request: result.body.request,
    item,
    defender,
    executor: await login(app, executor.id),
  };
}

test("SQLite conserva solicitudes, reparto, outbox y versiones al reiniciar; reset persistente se deniega", async (t) => {
  const { open } = setup(t);
  let app = open();
  const created = await createMission(app);
  assert.equal(created.item.dueDate, "2026-11-10");
  assert.equal(created.item.termSnapshot.status, "PROVISIONAL");
  const before = app.locals.demoRepository.snapshot();
  app.locals.demoRepository.close();
  app = open();
  assert.deepEqual(app.locals.demoRepository.snapshot(), before);
  const admin = await login(app, "demo-admin");
  const ready = await request(app).get("/api/ready").expect(200);
  assert.equal(ready.body.checks.persistence, "sqlite-transactional");
  await request(app).post("/api/demo/reset").set(auth(admin)).expect(409);
  assert.deepEqual(app.locals.demoRepository.snapshot(), before);
});

test("dos conexiones SQLite calculan carga y consecutivos desde el estado confirmado sin pérdida", async (t) => {
  const { open } = setup(t),
    a = open(),
    b = open();
  a.locals.demoRepository.transaction((state) => {
    for (const person of state.professionals)
      if (person.area === "INVESTIGACION")
        person.available = person.id === "inv-demo-02";
  });
  const [one, two] = await Promise.all([
    createMission(a),
    createMission(b, "000016000049202600091"),
  ]);
  assert.notEqual(one.request.id, two.request.id);
  assert.deepEqual(
    a.locals.demoRepository.snapshot(),
    b.locals.demoRepository.snapshot(),
  );
  const state = b.locals.demoRepository.snapshot();
  assert.equal(one.item.assigneeId, two.item.assigneeId);
  const ordered = [one, two].sort((left, right) =>
    left.request.id.localeCompare(right.request.id),
  );
  const loads = ordered.map(
    (entry) =>
      state.requests
        .find((row) => row.id === entry.request.id)
        .items[0].assignment.evaluated.find(
          (candidate) => candidate.candidateId === entry.item.assigneeId,
        ).metrics.load,
  );
  assert.equal(loads[1], loads[0] + 1);
});

test("bloqueo SQLite serializa escritores de procesos independientes y conserva todas las actualizaciones", async (t) => {
  const { filename, open } = setup(t),
    app = open();
  const moduleURL = new URL(
    "../../src/infrastructure/persistence/sqlite-repository.js",
    import.meta.url,
  ).href;
  const tasks = [0, 1].map(
    () =>
      new Promise((resolve, reject) => {
        const worker = new Worker(
          `const {workerData,parentPort}=require('node:worker_threads'); (async()=>{const {SqliteRepository}=await import(workerData.moduleURL);const r=new SqliteRepository(workerData.filename);for(let i=0;i<8;i++)r.transaction(s=>{s.counters.concurrent=(s.counters.concurrent||0)+1;});r.close();parentPort.postMessage('done');})().catch(e=>{throw e;});`,
          { eval: true, workerData: { filename, moduleURL } },
        );
        worker.on("message", resolve);
        worker.on("error", reject);
      }),
  );
  await Promise.all(tasks);
  assert.equal(app.locals.demoRepository.snapshot().counters.concurrent, 16);
});

test("prórroga provisional valida días, autorización, reintento, rechazo y límite ordinario", async (t) => {
  const { open } = setup(t),
    app = open(),
    created = await createMission(app);
  const manager = await login(app, "demo-gestor-regional-investigacion");
  await post(
    app,
    created.executor,
    "investigacion",
    created.item.id,
    "iniciar",
  ).expect(200);
  const body = {
    submissionId: "request-1",
    reason: "Insumo pendiente",
    supportReference: "Soporte",
  };
  const result = await post(
    app,
    created.executor,
    "investigacion",
    created.item.id,
    "solicitar-prorroga",
    body,
  ).expect(200);
  await post(
    app,
    created.executor,
    "investigacion",
    created.item.id,
    "solicitar-prorroga",
    body,
  ).expect(200);
  const extensionId = result.body.request.items[0].termExtensions[0].id;
  const decision = {
    submissionId: "decision-1",
    extensionId,
    decision: "APROBADA",
    observation: "Validada",
    days: 5,
  };
  await post(
    app,
    created.defender,
    "investigacion",
    created.item.id,
    "decidir-prorroga",
    decision,
  ).expect(403);
  await post(
    app,
    manager,
    "investigacion",
    created.item.id,
    "decidir-prorroga",
    { ...decision, days: 26 },
  ).expect(400);
  const approved = await post(
    app,
    manager,
    "investigacion",
    created.item.id,
    "decidir-prorroga",
    decision,
  ).expect(200);
  assert.equal(approved.body.request.items[0].dueDate, "2026-11-15");
  await post(
    app,
    manager,
    "investigacion",
    created.item.id,
    "decidir-prorroga",
    decision,
  ).expect(200);
  const again = await post(
    app,
    created.executor,
    "investigacion",
    created.item.id,
    "solicitar-prorroga",
    { ...body, submissionId: "request-2" },
  ).expect(200);
  const second = again.body.request.items[0].termExtensions.at(-1).id;
  await post(
    app,
    manager,
    "investigacion",
    created.item.id,
    "decidir-prorroga",
    { ...decision, submissionId: "decision-2", extensionId: second },
  ).expect(409);
  const rejected = await post(
    app,
    manager,
    "investigacion",
    created.item.id,
    "decidir-prorroga",
    {
      ...decision,
      submissionId: "decision-3",
      extensionId: second,
      decision: "RECHAZADA",
    },
  ).expect(200);
  assert.equal(rejected.body.request.items[0].dueDate, "2026-11-15");
});

test("remisión regional recibe y reparte sin central, deniega región ajena y conserva vínculo", async (t) => {
  const { open } = setup(t),
    app = open(),
    created = await createMission(app);
  const pag = await login(app, "demo-pag-investigacion");
  const body = {
    submissionId: "referral",
    service: created.item.service,
    region: "ANTIOQUIA",
    reason: "Visita",
    completedActivities: "Entrevista",
    pendingActivities: "Arraigo",
  };
  const response = await post(
    app,
    pag,
    "investigacion",
    created.item.id,
    "remitir-actividad",
    body,
  ).expect(200);
  const child = response.body.request.items.at(-1);
  assert.equal(child.referral.route, "REGIONAL");
  const claims = jwt.decode(pag);
  const wrong = jwt.sign({ ...claims, region: "BOGOTA" }, secret);
  await post(app, wrong, "investigacion", child.id, "enrutar-actividad", {
    submissionId: "route",
    observation: "Recibido",
  }).expect(403);
  const received = await post(
    app,
    pag,
    "investigacion",
    child.id,
    "enrutar-actividad",
    { submissionId: "route", observation: "Recibido" },
  ).expect(200);
  const item = received.body.request.items.at(-1);
  assert.equal(item.status, "ASIGNADA");
  assert.ok(item.assignment.evaluated.length);
  assert.equal(item.originItemId, created.item.id);
  assert.equal(received.body.request.externalId, created.request.externalId);
});

test("continuación Víctimas agrega personas con versión, aprobación previa y mismo perito; no mezcla Investigación", async (t) => {
  const { open } = setup(t),
    app = open(),
    rjv = await login(app, "demo-rjv"),
    pag = await login(app, "demo-pag-victimas");
  const before = app.locals.demoRepository.snapshot();
  const original = before.requests.find((entry) =>
    entry.items.some((item) => item.id === "VIC-ITEM-DEMO-0001"),
  );
  const origin = original.items.find(
    (item) => item.id === "VIC-ITEM-DEMO-0001",
  );
  const body = {
    submissionId: "follow-1",
    kind: "AMPLIACION",
    reason: "Nueva víctima",
    supportReference: "F163 adicional",
    additionalPersons: [
      {
        alias: "ADICIONAL-TEST",
        type: "INDIRECTA",
        relationship: "Hijo",
        familyGroup: "GRUPO-TEST",
        contact: { phone: "0000000000" },
      },
    ],
  };
  const created = await post(
    app,
    rjv,
    "victimas",
    origin.id,
    "continuacion",
    body,
  ).expect(201);
  const child = created.body.request.items.at(-1);
  assert.equal(child.status, "PENDIENTE_APROBACION_PAG");
  assert.equal(child.originProductId, origin.products.at(-1).id);
  await post(app, rjv, "victimas", origin.id, "continuacion", body).expect(201);
  await post(app, rjv, "victimas", origin.id, "continuacion", {
    ...body,
    reason: "Cambio",
  }).expect(409);
  const approved = await post(
    app,
    pag,
    "victimas",
    child.id,
    "aprobar-y-repartir",
  ).expect(200);
  assert.equal(
    approved.body.request.items.at(-1).assigneeId,
    origin.assigneeId,
  );
  assert.ok(approved.body.request.items.at(-1).dueDate);
  const after = app.locals.demoRepository.snapshot();
  assert.deepEqual(
    after.requests.filter((entry) => entry.area === "INVESTIGACION"),
    before.requests.filter((entry) => entry.area === "INVESTIGACION"),
  );
  assert.deepEqual(
    after.requests
      .find((entry) => entry.id === original.id)
      .items.find((item) => item.id === origin.id).products,
    origin.products,
  );
  assert.ok(
    !after.catalogs.services
      .filter((entry) => entry.status === "PUBLICADO")
      .some((entry) => entry.id === "SVC_VIC_DICTAMEN_PSICOLOGICO"),
  );
});

test("SQLite revierte una mutación fallida y protege auditoría, historial y contenido documental", (t) => {
  const { open, filename } = setup(t),
    app = open(),
    repository = app.locals.demoRepository;
  const before = repository.snapshot();
  assert.throws(() =>
    repository.transaction((state) => {
      state.counters.victims++;
      throw new Error("fallo");
    }),
  );
  assert.deepEqual(repository.snapshot(), before);
  assert.throws(() =>
    repository.transaction((state) => {
      state.requests[0].items[0].timeline[0].message = "alterado";
    }),
  );
  assert.throws(() =>
    repository.transaction((state) => {
      const item = state.requests
        .flatMap((entry) => entry.items)
        .find((entry) => entry.products.length);
      item.products[0].reference = "alterado";
    }),
  );
  repository.transaction((state) => state.audit.push({ type: "TEST" }));
  assert.throws(() => repository.transaction((state) => state.audit.pop()));
  const connection = new SqliteRepository(filename);
  assert.throws(() => connection.db.exec("DELETE FROM audit_events"));
  assert.throws(() =>
    connection.db.exec("UPDATE document_versions SET payload='{}'"),
  );
  connection.close();
});

test("radicación y carga documental son idempotentes, descargables y privadas tras reiniciar", async (t) => {
  const { open } = setup(t);
  let app = open();
  const defender = await login(app, "demo-defensor");
  const file = sampleF171Attachment({ id: "DOCUMENTO-TEST" });
  const body = {
    ...intake("000016000049202600701"),
    submissionId: "intake-1",
    documents: [{ type: "SOLICITUD_DEFENSA", reference: file.name, file }],
  };
  const send = () =>
    request(app)
      .post("/api/demo/investigacion/solicitudes")
      .set(auth(defender))
      .send(body);
  const created = await send().expect(201);
  const duplicate = await send().expect(201);
  assert.equal(created.body.request.id, duplicate.body.request.id);
  assert.ok(!JSON.stringify(created.body).includes(file.contentBase64));
  const path = `/api/demo/investigacion/items/${created.body.request.items[0].id}/documentos/0`;
  const downloaded = await request(app)
    .get(path)
    .set(auth(defender))
    .expect(200);
  assert.deepEqual(downloaded.body, Buffer.from(file.contentBase64, "base64"));
  await request(app).get(path).expect(401);
  const victimUser = await login(app, "demo-rjv");
  await request(app).get(path).set(auth(victimUser)).expect(403);
  await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send({ ...body, facts: "Otra solicitud" })
    .expect(409);
  await request(app)
    .post("/api/demo/investigacion/solicitudes")
    .set(auth(defender))
    .send({
      ...body,
      submissionId: "intake-2",
      documents: [
        {
          type: "SOLICITUD_DEFENSA",
          reference: "Malo.pdf",
          file: {
            ...file,
            contentBase64: Buffer.from("contenido inválido").toString("base64"),
          },
        },
      ],
    })
    .expect(400);
  app.locals.demoRepository.close();
  app = open();
  const after = await request(app).get(path).set(auth(defender)).expect(200);
  assert.deepEqual(after.body, downloaded.body);
});

test("Investigación persistente conserva devolución, documento corregido, verificación, envío y cierre", async (t) => {
  const { open } = setup(t),
    app = open(),
    created = await createMission(app);
  const pag = await login(app, "demo-pag-investigacion");
  const id = created.item.id;
  await post(app, created.executor, "investigacion", id, "iniciar").expect(200);
  const deliver = {
    submissionId: "delivery-1",
    deliveryMode: "PDF",
    file: sampleF171Attachment({ id: "INFORME-TEST" }),
  };
  await post(
    app,
    created.executor,
    "investigacion",
    id,
    "entregar",
    deliver,
  ).expect(200);
  await post(app, pag, "investigacion", id, "devolver-entrega", {
    observation: "Corregir conclusión",
  }).expect(200);
  const second = await post(
    app,
    created.executor,
    "investigacion",
    id,
    "entregar",
    { ...deliver, submissionId: "delivery-2" },
  ).expect(200);
  assert.equal(second.body.request.items[0].products.length, 2);
  await post(app, pag, "investigacion", id, "aprobar-entrega", {
    confirmReviewed: true,
    verificationReference: "VERIFICACION",
  }).expect(200);
  const closed = await post(
    app,
    created.executor,
    "investigacion",
    id,
    "registrar-envio",
    { submissionId: "dispatch", evidence: "ENVIO-DEFENSOR" },
  ).expect(200);
  assert.equal(closed.body.request.items[0].status, "CERRADA");
  const rows = app.locals.demoRepository.db
    .prepare("SELECT * FROM document_versions WHERE item_id=?")
    .all(id);
  assert.equal(rows.length, 2);
});

test("Víctimas decide sus prórrogas en días hábiles sin heredar el límite de Investigación y conserva F171 original", async (t) => {
  const { open } = setup(t),
    app = open();
  const rjv = await login(app, "demo-rjv"),
    pag = await login(app, "demo-pag-victimas"),
    perito = await login(app, "demo-perito-financiero"),
    invManager = await login(app, "demo-gestor-regional-investigacion");
  const result = await post(
    app,
    rjv,
    "victimas",
    "VIC-ITEM-DEMO-0001",
    "continuacion",
    {
      submissionId: "financial-update",
      kind: "ACTUALIZACION_F171",
      reason: "Actualizar fecha de corte financiero",
      supportReference: "F163 actualizado",
    },
  ).expect(201);
  const id = result.body.request.items.at(-1).id;
  await post(app, pag, "victimas", id, "aprobar-y-repartir").expect(200);
  await post(app, perito, "victimas", id, "iniciar").expect(200);
  for (let index = 0; index < 2; index++) {
    const requested = await post(
      app,
      perito,
      "victimas",
      id,
      "solicitar-prorroga",
      {
        submissionId: `request-${index}`,
        reason: "Falta soporte",
        supportReference: "SOLICITUD-INSUMO",
      },
    ).expect(200);
    const extensionId = requested.body.request.items
      .at(-1)
      .termExtensions.at(-1).id;
    const decision = {
      submissionId: `decision-${index}`,
      extensionId,
      decision: "APROBADA",
      observation: "Justificada",
      days: 2,
    };
    await post(
      app,
      invManager,
      "victimas",
      id,
      "decidir-prorroga",
      decision,
    ).expect(403);
    const response = await post(
      app,
      pag,
      "victimas",
      id,
      "decidir-prorroga",
      decision,
    ).expect(200);
    assert.equal(
      response.body.request.items.at(-1).termExtensions.at(-1).policySnapshot
        .dayType,
      "HABILES",
    );
  }
  const closed = await post(app, perito, "victimas", id, "finalizar", {
    submissionId: "F171-update",
    deliveryMode: "PDF",
    file: sampleF171Attachment({ id: "ACTUALIZACION" }),
  }).expect(200);
  assert.equal(closed.body.request.items.at(-1).status, "CERRADA");
  const state = app.locals.demoRepository.snapshot();
  assert.equal(
    state.requests.find((entry) => entry.id === "SVP-2026-0001").items[0]
      .products.length,
    1,
  );
});

test("un caso de Víctimas admite solicitudes distintas sin duplicar un reintento ni perder ceros", async (t) => {
  const { open } = setup(t),
    app = open(),
    token = await login(app, "demo-rjv");
  const body = {
    submissionId: "case-request-1",
    externalId: "000000123456789012345",
    law: "LEY_1448",
    region: "BOGOTA",
    service: "SVC_VIC_EVALUACION_PSICOLOGICA",
    caseData: { processReference: "Proceso", facts: "Hechos" },
    persons: [
      {
        alias: "PERSONA-TEST",
        type: "DIRECTA",
        familyGroup: "NUCLEO",
        contact: { phone: "0000000000" },
      },
    ],
    documents: [{ type: "F163", reference: "SOLICITUD" }],
  };
  const send = (payload) =>
    request(app)
      .post("/api/demo/victimas/solicitudes")
      .set(auth(token))
      .send(payload);
  const first = await send(body).expect(201);
  const replay = await send(body).expect(201);
  assert.equal(first.body.request.id, replay.body.request.id);
  const second = await send({ ...body, submissionId: "case-request-2" }).expect(
    201,
  );
  assert.notEqual(first.body.request.id, second.body.request.id);
  const cases = app.locals.demoRepository.db
    .prepare("SELECT id FROM cases WHERE area='VICTIMAS' AND external_id=?")
    .all(body.externalId);
  assert.equal(cases.length, 1);
  await send({ ...body, submissionId: "bad-number", externalId: 12345 }).expect(
    400,
  );
  await send({
    ...body,
    submissionId: "bad-link",
    documents: [
      {
        type: "F163",
        reference: "javascript:alert(1)",
        attachment: { kind: "SHAREPOINT" },
      },
    ],
  }).expect(400);
});

test("deshabilitar reglas provisionales sobre SQLite existente conserva historia e impide nuevas decisiones", async (t) => {
  const { open } = setup(t);
  let app = open();
  const created = await createMission(app);
  await post(
    app,
    created.executor,
    "investigacion",
    created.item.id,
    "iniciar",
  ).expect(200);
  const result = await post(
    app,
    created.executor,
    "investigacion",
    created.item.id,
    "solicitar-prorroga",
    { submissionId: "pending", reason: "Insumo", supportReference: "Soporte" },
  ).expect(200);
  const extensionId = result.body.request.items[0].termExtensions[0].id;
  app.locals.demoRepository.close();
  app = open({ ENABLE_PROVISIONAL_RULES: "false" });
  const manager = await login(app, "demo-gestor-regional-investigacion");
  await post(
    app,
    manager,
    "investigacion",
    created.item.id,
    "decidir-prorroga",
    {
      submissionId: "disabled",
      extensionId,
      decision: "APROBADA",
      days: 2,
      observation: "No debe ejecutarse",
    },
  ).expect(409);
  const item = app.locals.demoRepository
    .snapshot()
    .requests.find((entry) => entry.id === created.request.id).items[0];
  assert.equal(item.dueDate, created.item.dueDate);
  assert.equal(item.termExtensions[0].status, "SOLICITADA");
});
