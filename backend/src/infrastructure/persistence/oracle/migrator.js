import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readMigrationFiles,
  splitOracleStatements,
} from "../migration-files.js";

export const ORACLE_MIGRATIONS_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../migrations/oracle",
);

export async function applyOracleMigrations(
  pool,
  { allowMigration = false, directory = ORACLE_MIGRATIONS_DIRECTORY } = {},
) {
  if (!allowMigration) {
    throw new Error(
      "DDL Oracle bloqueado: defina ALLOW_ORACLE_MIGRATION=true de forma explícita",
    );
  }
  const connection = await pool.getConnection();
  try {
    const migrations = readMigrationFiles(directory);
    const expectedTables = new Set(
      migrations.flatMap((migration) =>
        [...migration.source.matchAll(/CREATE TABLE (SIGIP_[A-Z_]+)/gi)].map(
          (match) => match[1].toUpperCase(),
        ),
      ),
    );
    const identity = await connection.execute(
      "SELECT USER AS USER_NAME FROM DUAL",
      [],
      {
        outFormat: 4002,
      },
    );
    const userName = String(identity.rows?.[0]?.USER_NAME || "").toUpperCase();
    if (["SYS", "SYSTEM"].includes(userName)) {
      throw new Error(`Cuenta Oracle prohibida para migraciones: ${userName}`);
    }

    const inventory = await connection.execute(
      "SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME",
      [],
      { outFormat: 4002 },
    );
    const existingNames = (inventory.rows ?? []).map((row) => row.TABLE_NAME);
    const unexpectedNames = existingNames.filter(
      (name) => !expectedTables.has(name),
    );
    if (unexpectedNames.length > 0) {
      throw new Error(
        "El propietario Oracle contiene tablas ajenas a SIGIP-DP; se requiere un esquema dedicado",
      );
    }
    if (
      existingNames.length > 0 &&
      !existingNames.includes("SIGIP_SCHEMA_VERSION")
    ) {
      throw new Error(
        "Se encontraron objetos SIGIP_ sin historial de migración; se requiere inventario y aprobación DBA",
      );
    }

    const applied = [];
    for (const migration of migrations) {
      const tableResult = await connection.execute(
        "SELECT COUNT(*) AS TOTAL FROM USER_TABLES WHERE TABLE_NAME = 'SIGIP_SCHEMA_VERSION'",
        [],
        { outFormat: 4002 },
      );
      const versionTableExists = Number(tableResult.rows?.[0]?.TOTAL || 0) > 0;
      let existing = null;
      if (versionTableExists) {
        const result = await connection.execute(
          "SELECT CHECKSUM FROM SIGIP_SCHEMA_VERSION WHERE VERSION_ID = :versionId",
          { versionId: migration.version },
          { outFormat: 4002 },
        );
        existing = result.rows?.[0] || null;
      }
      if (existing) {
        if (existing.CHECKSUM !== migration.checksum) {
          throw new Error(
            `Checksum distinto para migración Oracle ${migration.version}`,
          );
        }
        continue;
      }

      for (const statement of splitOracleStatements(migration.source)) {
        await connection.execute(statement);
      }
      await connection.execute(
        `INSERT INTO SIGIP_SCHEMA_VERSION
         (VERSION_ID, DESCRIPTION, CHECKSUM, APPLIED_AT, APPLIED_BY)
         VALUES (:versionId, :description, :checksum, SYSTIMESTAMP, USER)`,
        {
          versionId: migration.version,
          description: migration.description,
          checksum: migration.checksum,
        },
        { autoCommit: true },
      );
      applied.push(migration.version);
    }
    return applied;
  } finally {
    await connection.close();
  }
}
