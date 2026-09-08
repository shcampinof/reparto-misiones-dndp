import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import request from "supertest";
import {
  createAssignment,
  createAssignmentHistory,
} from "../../src/modules/assignment/domain/model.js";
import { createAuditEntry } from "../../src/modules/core/audit/service.js";
import { OptimisticLockError } from "../../src/domain/invariants.js";
import { createApp } from "../../src/app/create-app.js";
import { createConfig } from "../../src/config/index.js";
import { SqliteDomainRepository } from "../../src/infrastructure/persistence/sqlite/domain-repository.js";
import {
  applySqliteMigrations,
  openSqliteDatabase,
} from "../../src/infrastructure/persistence/sqlite/migrator.js";
import { createSilentLogger } from "../../src/shared/logger.js";
import {
  persistenceFixture,
  seedPersistence,
  TEST_INSTANT,
} from "../helpers/persistence-fixtures.js";

async function repositoryContext(prefix) {
  const database = openSqliteDatabase(":memory:");
  applySqliteMigrations(database);
  const repository = new SqliteDomainRepository(database);
  const fixture = persistenceFixture(prefix);
  await seedPersistence(repository, fixture);
  return { database, repository, fixture };
}

test("control optimista rechaza una versión obsoleta", async () => {
  const { database, repository, fixture } = await repositoryContext("OPT");
  try {
    const updated = repository.saveRequest(
      { ...fixture.request, status: "ASIGNADA" },
      { expectedVersion: 1 },
    );
    assert.equal(updated.version, 2);
    assert.throws(
      () =>
        repository.saveRequest(
          { ...fixture.request, status: "ANULADA" },
          { expectedVersion: 1 },
        ),
      OptimisticLockError,
    );
    assert.equal(
      repository.findRequestById(fixture.request.id).status,
      "ASIGNADA",
    );
  } finally {
    database.close();
  }
});

test("la restricción de asignación vigente impide doble reparto", async () => {
  const { database, repository, fixture } = await repositoryContext("CON");
  try {
    const assignments = ["A", "B"].map((suffix, index) =>
      createAssignment({
        id: `CON-ASG-${suffix}`,
        itemId: fixture.itemA.id,
        assigneeId:
          index === 0 ? fixture.professional.id : fixture.otherProfessional.id,
        policyVersion: "POLICY-CONCURRENCY-1",
        assignedAt: TEST_INSTANT,
        reason: "Intento concurrente",
      }),
    );
    const outcomes = await Promise.allSettled(
      assignments.map((assignment) =>
        Promise.resolve().then(() => repository.saveAssignment(assignment)),
      ),
    );
    assert.equal(
      outcomes.filter((outcome) => outcome.status === "fulfilled").length,
      1,
    );
    assert.equal(
      outcomes.filter((outcome) => outcome.status === "rejected").length,
      1,
    );
    assert.ok(repository.currentAssignmentForItem(fixture.itemA.id));
  } finally {
    database.close();
  }
});

test("una reasignación conserva ambos responsables y su historial", async () => {
  const { database, repository, fixture } = await repositoryContext("REA");
  try {
    const first = createAssignment({
      id: "REA-ASG-1",
      itemId: fixture.itemA.id,
      assigneeId: fixture.professional.id,
      policyVersion: "POLICY-1",
      assignedAt: TEST_INSTANT,
      reason: "Asignación original",
    });
    await repository.transaction(async (unit) => {
      await unit.saveAssignment(first);
      await unit.appendAssignmentHistory(
        createAssignmentHistory({
          id: "REA-H-1",
          assignmentId: first.id,
          itemId: first.itemId,
          action: "ASIGNADA",
          assigneeId: first.assigneeId,
          actorId: fixture.requester.id,
          reason: first.reason,
          occurredAt: TEST_INSTANT,
        }),
      );
    });
    const endedAt = "2026-09-08T13:00:00.000Z";
    const second = createAssignment({
      id: "REA-ASG-2",
      itemId: fixture.itemA.id,
      assigneeId: fixture.otherProfessional.id,
      policyVersion: "POLICY-1",
      assignedAt: endedAt,
      reason: "Reasignación autorizada",
      authorizedBy: fixture.requester.id,
    });
    await repository.transaction(async (unit) => {
      await unit.saveAssignment(
        { ...first, current: false, endedAt },
        { expectedVersion: 1 },
      );
      await unit.saveAssignment(second);
      await unit.appendAssignmentHistory(
        createAssignmentHistory({
          id: "REA-H-2",
          assignmentId: second.id,
          itemId: second.itemId,
          action: "REASIGNADA",
          assigneeId: second.assigneeId,
          previousAssigneeId: first.assigneeId,
          actorId: fixture.requester.id,
          reason: second.reason,
          occurredAt: endedAt,
        }),
      );
    });
    assert.equal(
      repository.currentAssignmentForItem(fixture.itemA.id).assigneeId,
      fixture.otherProfessional.id,
    );
    assert.deepEqual(
      repository
        .assignmentHistoryForItem(fixture.itemA.id)
        .map((entry) => entry.assigneeId),
      [fixture.professional.id, fixture.otherProfessional.id],
    );
  } finally {
    database.close();
  }
});

test("auditoría persiste metadatos saneados y no admite actualización", async () => {
  const { database, repository, fixture } = await repositoryContext("AUD");
  try {
    const entry = createAuditEntry({
      id: "AUD-ENTRY-1",
      entityType: "ITEM_SOLICITUD",
      entityId: fixture.itemA.id,
      operation: "TRANSICION_ESTADO",
      actorId: fixture.requester.id,
      actorRole: "defensor",
      previousState: "RADICADA",
      newState: "ASIGNADA",
      reason: "Prueba de auditoría",
      occurredAt: TEST_INSTANT,
      metadata: { requestId: fixture.request.id, token: "no guardar" },
    });
    repository.appendAudit(entry);
    assert.equal(
      repository.listAudit({ entityId: fixture.itemA.id }).length,
      1,
    );
    assert.equal(repository.listAudit()[0].metadata.token, undefined);
    assert.throws(() =>
      database
        .prepare("UPDATE sigip_audit SET reason='alterado' WHERE audit_id=?")
        .run(entry.id),
    );
  } finally {
    database.close();
  }
});

test("el perfil de presentación sobrevive un reinicio cuando no se solicita restablecer", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigip-state-"));
  const sqlitePath = path.join(directory, "presentation.sqlite");
  const config = createConfig({
    NODE_ENV: "test",
    APP_PROFILE: "presentation",
    PERSISTENCE_DRIVER: "sqlite",
    SQLITE_PATH: sqlitePath,
    DEMO_RESET_ON_START: "false",
    ENABLE_DEMO_ACCOUNTS: "true",
    JWT_SECRET: "test-secret-with-at-least-thirty-two-characters",
  });
  let firstApp;
  let secondApp;
  try {
    firstApp = await createApp({ config, logger: createSilentLogger() });
    const login = await request(firstApp)
      .post("/api/auth/demo-login")
      .send({ userId: "demo-defensor" })
      .expect(200);
    await request(firstApp)
      .post("/api/demo/investigacion/solicitudes")
      .set("authorization", `Bearer ${login.body.accessToken}`)
      .send({
        spoa: "110016000049202699999",
        delito: "Persistencia local",
        service: "BALISTICA",
        region: "BOGOTA",
      })
      .expect(201);
    await firstApp.locals.persistence.close();
    firstApp = null;

    secondApp = await createApp({ config, logger: createSilentLogger() });
    const secondLogin = await request(secondApp)
      .post("/api/auth/demo-login")
      .send({ userId: "demo-defensor" })
      .expect(200);
    const bootstrap = await request(secondApp)
      .get("/api/demo/bootstrap")
      .set("authorization", `Bearer ${secondLogin.body.accessToken}`)
      .expect(200);
    assert.ok(
      bootstrap.body.requests.some(
        (entry) => entry.externalId === "110016000049202699999",
      ),
    );
  } finally {
    await firstApp?.locals.persistence.close();
    await secondApp?.locals.persistence.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
