import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  readMigrationFiles,
  splitOracleStatements,
} from "../../src/infrastructure/persistence/migration-files.js";
import {
  ORACLE_MIGRATIONS_DIRECTORY,
  applyOracleMigrations,
} from "../../src/infrastructure/persistence/oracle/migrator.js";
import {
  SQLITE_MIGRATIONS_DIRECTORY,
  applySqliteMigrations,
  openSqliteDatabase,
} from "../../src/infrastructure/persistence/sqlite/migrator.js";

const DOMAIN_TABLES = [
  ["sigip_area", "SIGIP_AREA"],
  ["sigip_role", "SIGIP_ROL"],
  ["sigip_user", "SIGIP_USUARIO"],
  ["sigip_user_role", "SIGIP_USUARIO_ROL"],
  ["sigip_regional", "SIGIP_REGIONAL"],
  ["sigip_geography", "SIGIP_GEOGRAFIA"],
  ["sigip_regional_geography", "SIGIP_REGIONAL_GEOGRAFIA"],
  ["sigip_service_specialty", "SIGIP_ESPECIALIDAD_SERVICIO"],
  ["sigip_territorial_coverage", "SIGIP_COBERTURA_TERRITORIAL"],
  ["sigip_case", "SIGIP_CASO"],
  ["sigip_request", "SIGIP_SOLICITUD"],
  ["sigip_request_item", "SIGIP_ITEM_SOLICITUD"],
  ["sigip_request_person", "SIGIP_PERSONA_SOLICITUD"],
  ["sigip_person_relationship", "SIGIP_RELACION_PERSONA"],
  ["sigip_assignment_decision", "SIGIP_DECISION_ASIGNACION"],
  ["sigip_decision_candidate", "SIGIP_CANDIDATO_DECISION"],
  ["sigip_candidate_exclusion", "SIGIP_EXCLUSION_CANDIDATO"],
  ["sigip_assignment", "SIGIP_ASIGNACION"],
  ["sigip_assignment_history", "SIGIP_HISTORIAL_ASIGNACION"],
  ["sigip_state_transition", "SIGIP_TRANSICION_ESTADO"],
  ["sigip_document", "SIGIP_DOCUMENTO"],
  ["sigip_document_version", "SIGIP_VERSION_DOCUMENTO"],
  ["sigip_product", "SIGIP_PRODUCTO"],
  ["sigip_extension", "SIGIP_AMPLIACION"],
  ["sigip_defender_transfer", "SIGIP_TRANSFERENCIA_DEFENSOR"],
  ["sigip_parameter", "SIGIP_PARAMETRO"],
  ["sigip_novelty", "SIGIP_NOVEDAD"],
  ["sigip_audit", "SIGIP_AUDITORIA"],
  ["sigip_outbox", "SIGIP_OUTBOX"],
];

test("SQLite aplica migraciones ordenadas, equivalentes y reproducibles", () => {
  const database = openSqliteDatabase(":memory:");
  try {
    assert.deepEqual(applySqliteMigrations(database), [
      "000",
      "001",
      "002",
      "003",
      "004",
      "005",
      "900",
    ]);
    assert.deepEqual(applySqliteMigrations(database), []);
    const tables = new Set(
      database
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((row) => row.name),
    );
    for (const [sqliteTable] of DOMAIN_TABLES) {
      assert.ok(tables.has(sqliteTable), `falta ${sqliteTable}`);
    }
    assert.equal(
      database
        .prepare("SELECT COUNT(*) AS total FROM sigip_schema_version")
        .get().total,
      7,
    );
  } finally {
    database.close();
  }
});

test("Oracle declara el mismo núcleo normalizado y scripts separables", () => {
  const source = readMigrationFiles(ORACLE_MIGRATIONS_DIRECTORY)
    .map((migration) => migration.source)
    .join("\n")
    .toUpperCase();
  for (const [, oracleTable] of DOMAIN_TABLES) {
    assert.match(source, new RegExp(`CREATE TABLE ${oracleTable}\\s*\\(`));
  }
  for (const migration of readMigrationFiles(ORACLE_MIGRATIONS_DIRECTORY)) {
    const statements = splitOracleStatements(migration.source);
    assert.ok(statements.length > 0);
    assert.ok(statements.every((statement) => !/^\s*\/\s*$/m.test(statement)));
    for (const trigger of statements.filter((statement) =>
      /^CREATE OR REPLACE TRIGGER/i.test(statement),
    )) {
      assert.match(trigger, /END;$/);
    }
  }
  assert.doesNotMatch(source, /CREATE TABLE SOLICITUDES\b/);
  assert.doesNotMatch(
    source,
    /INSERT INTO SIGIP_(REGIONAL|PARAMETRO|ESPECIALIDAD_SERVICIO)/,
  );
  const oversizedIdentifiers = [
    ...new Set(source.match(/\b[A-Z][A-Z0-9_]{30,}\b/g) ?? []),
  ];
  assert.deepEqual(
    oversizedIdentifiers,
    [],
    "Oracle 12.1 admite identificadores de máximo 30 bytes",
  );
});

test("las migraciones SQLite revierten DDL y versión si una unidad falla", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sigip-migrations-"));
  const database = openSqliteDatabase(":memory:");
  try {
    fs.copyFileSync(
      path.join(SQLITE_MIGRATIONS_DIRECTORY, "000_schema_version.sql"),
      path.join(directory, "000_schema_version.sql"),
    );
    fs.writeFileSync(
      path.join(directory, "001_failing.sql"),
      "CREATE TABLE should_rollback (id TEXT PRIMARY KEY) STRICT;\nINSERT INTO missing_table VALUES (1);\n",
      "utf8",
    );
    assert.throws(() => applySqliteMigrations(database, { directory }));
    assert.equal(
      database
        .prepare(
          "SELECT COUNT(*) AS total FROM sqlite_master WHERE name='should_rollback'",
        )
        .get().total,
      0,
    );
    assert.equal(
      database
        .prepare("SELECT COUNT(*) AS total FROM sigip_schema_version")
        .get().total,
      1,
    );
  } finally {
    database.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("historial, transiciones, versiones y auditoría son append-only en SQLite", () => {
  const source = readMigrationFiles(SQLITE_MIGRATIONS_DIRECTORY)
    .map((migration) => migration.source)
    .join("\n");
  for (const table of [
    "sigip_assignment_history",
    "sigip_assignment_decision",
    "sigip_decision_candidate",
    "sigip_candidate_exclusion",
    "sigip_state_transition",
    "sigip_document_version",
    "sigip_audit",
  ]) {
    assert.match(source, new RegExp(`BEFORE UPDATE ON ${table}`));
    assert.match(source, new RegExp(`BEFORE DELETE ON ${table}`));
  }
});

test("el ejecutor Oracle exige habilitación expresa antes de obtener conexión", async () => {
  let requestedConnection = false;
  const pool = {
    async getConnection() {
      requestedConnection = true;
      throw new Error("no debe conectarse");
    },
  };
  await assert.rejects(
    applyOracleMigrations(pool, { allowMigration: false }),
    /ALLOW_ORACLE_MIGRATION=true/,
  );
  assert.equal(requestedConnection, false);
});

test("el ejecutor Oracle se detiene ante objetos SIGIP_ sin historial", async () => {
  const executed = [];
  const connection = {
    async execute(sql) {
      executed.push(sql);
      if (/SELECT USER AS USER_NAME/.test(sql)) {
        return { rows: [{ USER_NAME: "SIGIP_TEST" }] };
      }
      if (/FROM USER_TABLES ORDER BY/.test(sql)) {
        return { rows: [{ TABLE_NAME: "SIGIP_AREA" }] };
      }
      throw new Error("No debe ejecutar DDL");
    },
    async close() {},
  };
  const pool = {
    async getConnection() {
      return connection;
    },
  };
  await assert.rejects(
    applyOracleMigrations(pool, { allowMigration: true }),
    /objetos SIGIP_ sin historial/,
  );
  assert.equal(
    executed.some((sql) => /^CREATE/i.test(sql)),
    false,
  );
});
