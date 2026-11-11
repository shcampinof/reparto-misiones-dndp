import test from "node:test";
import assert from "node:assert/strict";
import { createDemoSeed } from "../../src/infrastructure/demo/seeds.js";
import { applyProvisionalRules } from "../../src/modules/core/policies/provisional.js";
import {
  encodeState,
  decodeState,
} from "../../src/infrastructure/persistence/oracle/codec.js";
import { OracleRepository } from "../../src/infrastructure/persistence/oracle/repository.js";
import {
  migrationDefinition,
  migrateOracle,
} from "../../src/infrastructure/persistence/oracle/migrations.js";
import { schemaStatements } from "../../src/infrastructure/persistence/oracle/model.js";
import { createConfig } from "../../src/config/index.js";
import { createSeedFactory } from "../../src/app/create-app.js";
import { fakeOraclePool } from "../../test-support/fake-oracle.js";

const configuration = { callTimeout: 30000 };

test("Oracle: migración se detiene antes del DDL si el esquema contiene tablas ajenas", async () => {
  const statements = [];
  const connection = {
    async execute(sql) {
      statements.push(sql);
      return { rows: [{ TABLE_NAME: "OTRO_SISTEMA" }] };
    },
    async rollback() {},
    async close() {},
  };
  await assert.rejects(
    migrateOracle({ getConnection: async () => connection }, configuration),
    (e) => e.code === "ORACLE_SCHEMA_REQUIRES_REVIEW",
  );
  assert.ok(statements.every((s) => !s.startsWith("CREATE ")));
});

test("Oracle: corrección conserva las filas antiguas y reconstruye sólo la versión vigente", async () => {
  const pool = fakeOraclePool(createDemoSeed());
  const repo = new OracleRepository(pool, configuration);
  const oldPeople = pool.tables.SIGIP_PERSONA_SOLICITUD.length;
  let expected;
  await repo.transaction((state) => {
    const r = state.requests.find((r) => r.versions?.length);
    r.persons = [{ alias: "Persona nueva", type: "DIRECTA" }];
    r.documents = [{ type: "F163", reference: "CORREGIDO" }];
    const v = structuredClone(r.versions.at(-1));
    v.version++;
    v.data.persons = r.persons;
    v.data.documents = r.documents;
    r.versions.push(v);
    expected = structuredClone(r);
  });
  const result = (await repo.snapshot()).requests.find(
    (r) => r.id === expected.id,
  );
  assert.deepEqual(result, expected);
  assert.ok(pool.tables.SIGIP_PERSONA_SOLICITUD.length > oldPeople);
});

test("Oracle: descomposición relacional conserva ambas áreas, snapshots, PDF y ceros iniciales", () => {
  const state = applyProvisionalRules(createDemoSeed());
  const tables = encodeState(state);
  assert.deepEqual(decodeState(tables), state);
  assert.ok(tables.SIGIP_CASO.length < tables.SIGIP_ITEM_SOLICITUD.length);
  assert.ok(tables.SIGIP_PERSONA_SOLICITUD.length > 0);
  assert.ok(
    tables.SIGIP_VERSION_DOCUMENTO.some((r) =>
      r.CONTENIDO.includes("contentBase64"),
    ),
  );
  assert.ok(
    tables.SIGIP_AUXILIAR.every((r) => !r.DATOS.includes('"requests":')),
  );
});

test("Oracle: nuevas personas/documentos no sobrescriben versiones anteriores de radicación", () => {
  const state = createDemoSeed();
  const request = state.requests.find((r) => r.versions?.length);
  const previous = structuredClone(request.versions[0]);
  request.persons = [{ alias: "Persona adicional", type: "INDIRECTA" }];
  request.documents = [{ type: "F163", reference: "VERSION-2" }];
  request.versions.push({
    ...structuredClone(previous),
    version: 2,
    data: {
      ...structuredClone(previous.data),
      persons: request.persons,
      documents: request.documents,
    },
  });
  const decoded = decodeState(encodeState(state));
  assert.deepEqual(
    decoded.requests.find((r) => r.id === request.id),
    request,
  );
  assert.deepEqual(request.versions[0], previous);
});

test("Oracle: dos conexiones releen carga y consecutivo después de obtener el bloqueo", async () => {
  const pool = fakeOraclePool(createDemoSeed());
  const one = new OracleRepository(pool, configuration),
    two = new OracleRepository(pool, configuration);
  await Promise.all(
    [one, two].map((repo) =>
      repo.transaction(async (state) => {
        const current = state.counters.contract || 0;
        await new Promise((resolve) => setTimeout(resolve, 5));
        state.counters.contract = current + 1;
        state.audit.push({
          type: "CONTRACT_CONCURRENCY",
          at: new Date().toISOString(),
        });
      }),
    ),
  );
  const result = await one.snapshot();
  assert.equal(result.counters.contract, 2);
  assert.equal(result.audit.length, 2);
  assert.equal(pool.control.REVISION, 2);
  assert.ok(pool.events.some((sql) => sql.includes("FOR UPDATE WAIT")));
  assert.ok(pool.events.includes("SET TRANSACTION READ ONLY"));
});

test("Oracle: rollback y fallo de commit no confirman operación ni outbox", async () => {
  const pool = fakeOraclePool(createDemoSeed());
  const repo = new OracleRepository(pool, configuration);
  const before = await repo.snapshot();
  await assert.rejects(
    repo.transaction((state) => {
      state.counters.contract = 7;
      throw new Error("ABORT");
    }),
    /ABORT/,
  );
  pool.failCommit = true;
  await assert.rejects(
    repo.transaction((state) => {
      state.audit.push({ type: "PENDING" });
      state.outbox[0].status = "PENDIENTE";
      return { success: true };
    }),
    /COMMIT_FAILED/,
  );
  assert.deepEqual(await repo.snapshot(), before);
  assert.ok(pool.events.includes("ROLLBACK"));
  assert.equal(pool.closed, 4);
});

test("Oracle: auditoría y PDF permanecen inmutables; reset persistente se deniega", async () => {
  const pool = fakeOraclePool(createDemoSeed());
  const repo = new OracleRepository(pool, configuration);
  await repo.transaction((state) => state.audit.push({ type: "ORIGINAL" }));
  await assert.rejects(
    repo.transaction((state) => {
      state.audit[0].type = "CHANGED";
    }),
    /append only/,
  );
  await assert.rejects(
    repo.transaction((state) => {
      const p = state.requests
        .flatMap((r) => r.items)
        .find((i) => i.products?.length).products[0];
      p.attachment.contentBase64 = "changed";
    }),
    /immutable/,
  );
  assert.throws(
    () => repo.reset(),
    (e) => e.code === "PERSISTENT_RESET_DISABLED",
  );
});

test("Oracle: migración reproducible, sin borrados y con restricciones/versiones inmutables", async () => {
  const { sql, statements, checksum } = await migrationDefinition();
  assert.deepEqual(statements, schemaStatements());
  assert.match(checksum, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE)\b/i);
  assert.match(sql, /TIMESTAMP\(6\) WITH TIME ZONE/);
  assert.match(sql, /DBMS_LOB.COMPARE/);
  for (const match of sql.matchAll(
    /CREATE (?:OR REPLACE )?(?:TABLE|TRIGGER|INDEX) ([A-Z_]+)/g,
  ))
    assert.ok(match[1].length <= 30);
});

test("Oracle: faltantes son explícitos y nunca habilita semillas por omisión", () => {
  assert.throws(
    () => createConfig({ STORAGE_DRIVER: "oracle", NODE_ENV: "test" }),
    (e) => e.issues.includes("ORACLE_PASSWORD es obligatorio para Oracle"),
  );
  const config = createConfig({
    STORAGE_DRIVER: "oracle",
    NODE_ENV: "test",
    ORACLE_USER: "SIGIP_TEST",
    ORACLE_PASSWORD: "synthetic-only",
    ORACLE_CONNECT_STRING: "example.invalid:1531/test",
  });
  const state = createSeedFactory(config)();
  assert.deepEqual(state.requests, []);
  assert.deepEqual(state.users, []);
  assert.deepEqual(state.professionals, []);
  assert.equal(config.oracle.seedDemo, false);
  assert.throws(
    () =>
      createConfig({
        NODE_ENV: "test",
        STORAGE_DRIVER: "oracle",
        ORACLE_USER: "x",
        ORACLE_PASSWORD: "x",
        ORACLE_CONNECT_STRING: "example.invalid/test",
        ORACLE_POOL_MIN: "5",
        ORACLE_POOL_MAX: "2",
      }),
    /Pool Oracle/,
  );
});
