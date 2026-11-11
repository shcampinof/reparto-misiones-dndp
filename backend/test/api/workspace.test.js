import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { createSilentLogger } from "../../src/shared/logger.js";
import {
  createBackup,
  restoreBackup,
  verifyBackup,
} from "../../src/infrastructure/persistence/backup.js";
import { dispatchOutbox } from "../../src/modules/core/notifications/outbox.js";
import { scanPayload } from "../../src/infrastructure/documents/antimalware.js";
import { createBackupSchedule } from "../../src/infrastructure/persistence/backup-schedule.js";

const secret = "workspace-tests-secret-more-than-thirty-two-characters";
const bytes = Buffer.from(
  "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF",
);
const file = {
  name: "soporte.pdf",
  mimeType: "application/pdf",
  contentBase64: bytes.toString("base64"),
};
const headers = (token) => ({ Authorization: `Bearer ${token}` });
function setup(t, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "sigip-workspace-")),
    filename = join(dir, "test.sqlite"),
    apps = [];
  function open() {
    const app = createApp({
      config: createConfig({
        NODE_ENV: "test",
        ENABLE_DEMO_ACCOUNTS: "true",
        STORAGE_DRIVER: "sqlite",
        SQLITE_PATH: filename,
        JWT_SECRET: secret,
        ...overrides,
      }),
      logger: createSilentLogger(),
    });
    apps.push(app);
    return app;
  }
  t.after(() => {
    for (const app of apps) {
      try {
        app.locals.demoRepository.close();
      } catch {
        /* closed */
      }
    }
    rmSync(dir, { recursive: true, force: true });
  });
  return { dir, filename, open };
}
async function login(app, id) {
  return (
    await request(app)
      .post("/api/auth/demo-login")
      .send({ userId: id })
      .expect(200)
  ).body.accessToken;
}
function actorFor(app, predicate) {
  const state = app.locals.demoRepository.snapshot();
  for (const user of state.users)
    for (const account of user.accounts)
      if (predicate(account, user))
        return jwt.sign(
          {
            sub: user.id,
            ...account,
            accountId: account.id,
            fullName: user.fullName,
          },
          secret,
        );
  throw new Error("Actor not found");
}
function activeItem(app, area) {
  const state = app.locals.demoRepository.snapshot();
  for (const r of state.requests)
    if (r.area === area)
      for (const i of r.items)
        if (i.assigneeId && !["CERRADA", "IMPROCEDENTE"].includes(i.status))
          return { r, i };
  throw new Error("Fixture not found");
}

test("borradores privados persistentes, conflicto de revisión y archivo lógico", async (t) => {
  const { open } = setup(t);
  let app = open();
  const token = await login(app, "demo-defensor"),
    id = randomUUID(),
    path = `/api/workspace/INVESTIGACION/drafts/${id}`;
  const saved = await request(app)
    .put(path)
    .set(headers(token))
    .send({
      revision: 0,
      data: {
        form: { spoa: "000000000000000000001" },
        documents: [{ file }],
        grants: ["ADMIN"],
      },
    })
    .expect(200);
  assert.equal(saved.body.revision, 1);
  assert.equal(saved.body.data.grants, undefined);
  await request(app)
    .put(path)
    .set(headers(token))
    .send({ revision: 0, data: { form: { spoa: "changed" } } })
    .expect(409);
  const admin = await login(app, "demo-admin");
  await request(app).get(path).set(headers(admin)).expect(403);
  const rjv = await login(app, "demo-rjv");
  await request(app).get(path).set(headers(rjv)).expect(403);
  app.locals.demoRepository.close();
  app = open();
  const restored = await request(app).get(path).set(headers(token)).expect(200);
  assert.equal(
    restored.body.data.documents[0].file.contentBase64,
    file.contentBase64,
  );
  await request(app)
    .delete(path)
    .set(headers(token))
    .send({ revision: 1 })
    .expect(200);
  await request(app).get(path).set(headers(token)).expect(404);
});

test("soportes por ítem con versiones, idempotencia, integridad y denegación sin mutación", async (t) => {
  const { open } = setup(t);
  const app = open(),
    { i, r } = activeItem(app, "INVESTIGACION"),
    token = actorFor(app, (_a, u) => u.id === r.ownerUserId),
    path = `/api/workspace/INVESTIGACION/items/${i.id}/documents`;
  const payload = {
    submissionId: randomUUID(),
    file,
    type: "ACTUACION",
    reason: "Soporte de visita",
  };
  const first = (
    await request(app).post(path).set(headers(token)).send(payload).expect(201)
  ).body;
  assert.equal(first.version, 1);
  assert.equal(first.contentBase64, undefined);
  assert.equal(
    (
      await request(app)
        .post(path)
        .set(headers(token))
        .send(payload)
        .expect(201)
    ).body.id,
    first.id,
  );
  await request(app)
    .post(path)
    .set(headers(token))
    .send({ ...payload, reason: "changed" })
    .expect(409);
  const second = (
    await request(app)
      .post(path)
      .set(headers(token))
      .send({
        ...payload,
        submissionId: randomUUID(),
        documentId: first.documentId,
        previousVersion: 1,
      })
      .expect(201)
  ).body;
  assert.equal(second.version, 2);
  await request(app)
    .post(path)
    .set(headers(token))
    .send({
      ...payload,
      submissionId: randomUUID(),
      documentId: first.documentId,
      previousVersion: 1,
    })
    .expect(409);
  const response = await request(app)
    .get(`${path}/${first.id}`)
    .set(headers(token))
    .expect(200);
  assert.deepEqual(response.body, bytes);
  const denied = await login(app, "demo-investigador");
  const state = app.locals.demoRepository.snapshot();
  // A foreign-area token must never learn or mutate these documents.
  const foreign = await login(app, "demo-rjv");
  await request(app)
    .post(path)
    .set(headers(foreign))
    .send({ ...payload, submissionId: randomUUID() })
    .expect(403);
  assert.equal(
    app.locals.demoRepository.snapshot().workspaceDocuments.length,
    state.workspaceDocuments.length,
  );
  assert.ok(denied);
  assert.throws(
    () =>
      app.locals.demoRepository.transaction((s) => {
        s.workspaceDocuments[0].name = "overwrite.pdf";
      }),
    /immutable/,
  );
  const listing = (await request(app).get(path).set(headers(token)).expect(200))
    .body;
  assert.equal(listing.documents.length, 2);
  assert.equal(JSON.stringify(listing).includes("contentBase64"), false);
});

test("Víctimas reserva contenido y nombre de soporte al titular y perito", async (t) => {
  const { open } = setup(t);
  const app = open(),
    { i, r } = activeItem(app, "VICTIMAS"),
    owner = actorFor(app, (_a, u) => u.id === r.ownerUserId),
    pag = await login(app, "demo-pag-victimas"),
    path = `/api/workspace/VICTIMAS/items/${i.id}/documents`;
  const saved = (
    await request(app)
      .post(path)
      .set(headers(owner))
      .send({
        submissionId: randomUUID(),
        type: "ANEXO",
        reason: "Soporte reservado",
        file,
      })
      .expect(201)
  ).body;
  const listing = (await request(app).get(path).set(headers(pag)).expect(200))
    .body;
  assert.equal(listing.canRead, false);
  assert.equal(listing.documents[0].name, undefined);
  assert.equal(listing.documents[0].reason, undefined);
  await request(app).get(`${path}/${saved.id}`).set(headers(pag)).expect(403);
  const executor = actorFor(app, (a) => a.executorId === i.assigneeId);
  await request(app)
    .get(`${path}/${saved.id}`)
    .set(headers(executor))
    .expect(200);
});

test("política técnica, carga inválida y escáner obligatorio no disponible", async (t) => {
  const { open } = setup(t, { REQUIRE_ANTIMALWARE: "true" });
  const app = open(),
    token = await login(app, "demo-defensor"),
    { i } = activeItem(app, "INVESTIGACION");
  await request(app)
    .post(`/api/workspace/INVESTIGACION/items/${i.id}/documents`)
    .set(headers(token))
    .send({ submissionId: randomUUID(), file, type: "ANEXO", reason: "test" })
    .expect(503);
  assert.equal(
    app.locals.demoRepository.snapshot().workspaceDocuments,
    undefined,
  );
  assert.throws(() => createConfig({ FILE_MAX_MB: "-1" }));
  await request(app).get("/api/workspace/VICTIMAS/drafts").expect(401);
});

test("copia consistente, restauración nueva y conservación de documentos/borradores", async (t) => {
  const { open, dir, filename } = setup(t);
  const app = open(),
    token = await login(app, "demo-defensor");
  await request(app)
    .put(`/api/workspace/INVESTIGACION/drafts/${randomUUID()}`)
    .set(headers(token))
    .send({
      revision: 0,
      data: { form: { spoa: "TEST" }, documents: [{ file }] },
    })
    .expect(200);
  const destination = join(dir, "backup.sqlite");
  const summary = await createBackup(filename, destination);
  assert.ok(summary.requests > 0);
  restoreBackup(destination, join(dir, "restored.sqlite"));
  assert.deepEqual(verifyBackup(join(dir, "restored.sqlite")), summary);
  await assert.rejects(() => createBackup(filename, destination));
  assert.throws(() => restoreBackup(destination, filename));
});

test("constancia autorizada y lectura personal del aviso", async (t) => {
  const { open } = setup(t);
  const app = open(),
    { i, r } = activeItem(app, "INVESTIGACION"),
    token = actorFor(app, (_a, u) => u.id === r.ownerUserId);
  const receipt = await request(app)
    .get(`/api/workspace/INVESTIGACION/items/${i.id}/receipt`)
    .set(headers(token))
    .expect(200);
  assert.match(receipt.text, /Constancia de seguimiento/);
  assert.doesNotMatch(receipt.text, /entorno de pruebas|datos sintéticos/i);
  assert.match(receipt.headers["cache-control"], /no-store/);
  const foreign = await login(app, "demo-rjv");
  await request(app)
    .get(`/api/workspace/INVESTIGACION/items/${i.id}/receipt`)
    .set(headers(foreign))
    .expect(403);
  app.locals.demoRepository.transaction((s) => {
    s.outbox.push({
      id: "NOTICE-TEST",
      recipientUserId: r.ownerUserId,
      itemId: i.id,
      area: r.area,
      status: "PENDIENTE_CONFIGURACION",
    });
  });
  await request(app)
    .post("/api/workspace/notifications/NOTICE-TEST/read")
    .set(headers(token))
    .expect(200);
  await request(app)
    .post("/api/workspace/notifications/NOTICE-TEST/read")
    .set(headers(foreign))
    .expect(404);
  await request(app)
    .post("/api/workspace/notifications/NOTICE-TEST/retry")
    .set(headers(token))
    .expect(409);
});

test("outbox recupera worker interrumpido y no duplica un envío confirmado", async (t) => {
  const { open } = setup(t);
  const app = open(),
    repository = app.locals.demoRepository;
  const { i } = activeItem(app, "INVESTIGACION");
  repository.transaction((s) =>
    s.outbox.push({
      id: "LEASE-TEST",
      itemId: i.id,
      key: "lease-key",
      status: "EN_PROCESO",
      attempts: 1,
      leaseUntil: "2026-01-01T00:00:00Z",
    }),
  );
  let sends = 0;
  const options = {
    repository,
    sender: {
      send: async () => {
        sends++;
        return { id: "sent" };
      },
    },
    clock: () => "2026-10-19T12:00:00Z",
  };
  await dispatchOutbox(options);
  await dispatchOutbox(options);
  assert.equal(sends, 1);
  assert.equal(
    repository.snapshot().outbox.find((e) => e.id === "LEASE-TEST").status,
    "ENVIADA",
  );
});

test("dos guardados o reemplazos simultáneos no sobrescriben una revisión", async (t) => {
  const { open } = setup(t),
    app = open(),
    token = await login(app, "demo-defensor"),
    id = randomUUID(),
    draftPath = `/api/workspace/INVESTIGACION/drafts/${id}`;
  const results = await Promise.all(
    ["A", "B"].map((text) =>
      request(app)
        .put(draftPath)
        .set(headers(token))
        .send({ revision: 0, data: { form: { spoa: text } } }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const { i, r } = activeItem(app, "INVESTIGACION"),
    owner = actorFor(app, (_a, u) => u.id === r.ownerUserId),
    path = `/api/workspace/INVESTIGACION/items/${i.id}/documents`;
  const payload = {
    file,
    type: "ANEXO",
    reason: "Versión inicial",
    submissionId: randomUUID(),
  };
  const initial = (
    await request(app).post(path).set(headers(owner)).send(payload).expect(201)
  ).body;
  const replacements = await Promise.all(
    ["A", "B"].map((reason) =>
      request(app)
        .post(path)
        .set(headers(owner))
        .send({
          ...payload,
          reason,
          submissionId: randomUUID(),
          documentId: initial.documentId,
          previousVersion: 1,
        }),
    ),
  );
  assert.deepEqual(replacements.map((r) => r.status).sort(), [201, 409]);
});

test("validación y cuota documental rechazan sin perder el historial; cierre admite reintento confirmado", async (t) => {
  const { open } = setup(t, {
      FILE_MAX_MB: "0.0009765625",
      INTAKE_MAX_MB: "0.0009765625",
      ITEM_FILES_MAX_MB: "0.0009765625",
    }),
    app = open(),
    { i, r } = activeItem(app, "INVESTIGACION"),
    token = actorFor(app, (_a, u) => u.id === r.ownerUserId),
    path = `/api/workspace/INVESTIGACION/items/${i.id}/documents`;
  await request(app)
    .post(path)
    .set(headers(token))
    .send({
      submissionId: randomUUID(),
      type: "ANEXO",
      reason: "Invalid",
      file: {
        ...file,
        contentBase64: Buffer.from("not pdf").toString("base64"),
      },
    })
    .expect(400);
  const payload = {
    submissionId: randomUUID(),
    type: "ANEXO",
    reason: "Soporte",
    file,
  };
  await request(app).post(path).set(headers(token)).send(payload).expect(201);
  const padded = {
    ...file,
    contentBase64: Buffer.from(
      "%PDF-1.4\n" + " ".repeat(880) + "\n%%EOF",
    ).toString("base64"),
  };
  await request(app)
    .post(path)
    .set(headers(token))
    .send({ ...payload, submissionId: randomUUID(), file: padded })
    .expect(201);
  await request(app)
    .post(path)
    .set(headers(token))
    .send({ ...payload, submissionId: randomUUID(), file: padded })
    .expect(413);
  app.locals.demoRepository.transaction((s) => {
    s.requests
      .find((q) => q.id === r.id)
      .items.find((q) => q.id === i.id).status = "CERRADA";
  });
  await request(app).post(path).set(headers(token)).send(payload).expect(201);
  await request(app)
    .post(path)
    .set(headers(token))
    .send({ ...payload, submissionId: randomUUID() })
    .expect(403);
});

test("contrato de antimalware distingue limpio, infectado e indisponible sin publicar archivos", async () => {
  const config = createConfig({
    ANTIMALWARE_COMMAND: "scanner-test",
    REQUIRE_ANTIMALWARE: "true",
  });
  let calls = 0;
  assert.equal(
    await scanPayload({ file }, config, async (command, args) => {
      calls++;
      assert.equal(command, "scanner-test");
      assert.equal(args[0], "--no-summary");
    }),
    "ANTIMALWARE_VERIFICADO",
  );
  assert.equal(calls, 1);
  await assert.rejects(
    () =>
      scanPayload({ file }, config, async () => {
        throw Object.assign(new Error(), { code: 1 });
      }),
    { code: "MALWARE_DETECTED" },
  );
  await assert.rejects(
    () =>
      scanPayload({ file }, config, async () => {
        throw Object.assign(new Error(), { code: 2 });
      }),
    { code: "SCANNER_UNAVAILABLE" },
  );
  assert.equal(
    await scanPayload(
      { reason: "sin archivo" },
      createConfig({ REQUIRE_ANTIMALWARE: "true" }),
    ),
    "SIN_ARCHIVO",
  );
});

test("copias programadas rotan sólo sus propios archivos y mantenimiento exige administración", async (t) => {
  const { open, dir, filename } = setup(t),
    app = open(),
    directory = join(dir, "backups");
  let instant = "2026-10-19T12:00:00Z";
  const schedule = createBackupSchedule({
    filename,
    directory,
    keep: 1,
    clock: () => instant,
  });
  assert.equal((await schedule.run()).failureCode, null);
  writeFileSync(join(directory, "conservar.txt"), "unrelated");
  instant = "2026-10-19T12:02:00Z";
  assert.equal((await schedule.run()).lastSuccessAt, instant);
  assert.equal(
    readdirSync(directory).filter((n) => n.endsWith(".sqlite")).length,
    1,
  );
  assert.ok(readdirSync(directory).includes("conservar.txt"));
  const admin = await login(app, "demo-admin"),
    owner = await login(app, "demo-defensor");
  await request(app)
    .get("/api/workspace/maintenance")
    .set(headers(admin))
    .expect(200);
  await request(app)
    .get("/api/workspace/maintenance")
    .set(headers(owner))
    .expect(403);
  await request(app)
    .post("/api/workspace/maintenance/backup")
    .set(headers(admin))
    .expect(409);
});
