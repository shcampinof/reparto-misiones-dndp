import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { readMigrationFiles } from "../migration-files.js";

export const SQLITE_MIGRATIONS_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../migrations/sqlite",
);

export function openSqliteDatabase(databasePath) {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const database = new DatabaseSync(databasePath, { timeout: 5000 });
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");
  if (databasePath !== ":memory:") database.exec("PRAGMA journal_mode = WAL");
  return database;
}

export function applySqliteMigrations(
  database,
  { directory = SQLITE_MIGRATIONS_DIRECTORY, appliedBy = "sigip-dp" } = {},
) {
  const applied = [];
  for (const migration of readMigrationFiles(directory)) {
    const hasVersionTable = Boolean(
      database
        .prepare(
          "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'sigip_schema_version'",
        )
        .get(),
    );
    const existing = hasVersionTable
      ? database
          .prepare(
            "SELECT checksum FROM sigip_schema_version WHERE version_id = ?",
          )
          .get(migration.version)
      : null;
    if (existing) {
      if (existing.checksum !== migration.checksum) {
        throw new Error(
          `Checksum distinto para migración SQLite ${migration.version}`,
        );
      }
      continue;
    }

    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration.source);
      database
        .prepare(
          `INSERT INTO sigip_schema_version
           (version_id, description, checksum, applied_at, applied_by)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          migration.version,
          migration.description,
          migration.checksum,
          new Date().toISOString(),
          appliedBy,
        );
      database.exec("COMMIT");
      applied.push(migration.version);
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  return applied;
}
