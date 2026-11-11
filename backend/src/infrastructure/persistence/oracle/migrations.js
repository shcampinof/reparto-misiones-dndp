import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { queryOptions, withOracleConnection } from "./connection.js";

export const migrationId = "001-oracle-domain";
export async function migrationDefinition() {
  const sql = await readFile(
    new URL("./migrations/001-domain.sql", import.meta.url),
    "utf8",
  );
  return {
    sql,
    checksum: createHash("sha256")
      .update(sql.replace(/\r\n/g, "\n"))
      .digest("hex"),
    statements: sql
      .split(/^\/\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export async function verifyMigrations(connection) {
  const { checksum } = await migrationDefinition();
  let result;
  try {
    result = await connection.execute(
      "SELECT CHECKSUM FROM SIGIP_MIGRACION WHERE ID = :id",
      { id: migrationId },
      queryOptions,
    );
  } catch (error) {
    if (error.errorNum === 942)
      throw new Error(
        "ORACLE_MIGRATIONS_REQUIRED: ejecute npm run oracle:migrate",
      );
    throw error;
  }
  if (result.rows[0]?.CHECKSUM !== checksum)
    throw new Error(
      "ORACLE_MIGRATION_MISMATCH: falta migración o cambió su checksum",
    );
}

export async function migrateOracle(pool, config) {
  const { checksum, statements } = await migrationDefinition();
  return withOracleConnection(pool, config, async (connection) => {
    if (!config.allowExistingSchema) {
      const existing = await connection.execute(
        "SELECT TABLE_NAME FROM USER_TABLES WHERE SUBSTR(TABLE_NAME,1,6) <> 'SIGIP_' AND ROWNUM <= 1",
        {},
        queryOptions,
      );
      if (existing.rows.length) {
        const error = new Error(
          "Esquema con tablas ajenas: requiere mapeo y revisión del DBA antes de migrar",
        );
        error.code = "ORACLE_SCHEMA_REQUIRES_REVIEW";
        throw error;
      }
    }
    try {
      await connection.execute(
        "CREATE TABLE SIGIP_MIGRACION (ID VARCHAR2(80) PRIMARY KEY, CHECKSUM VARCHAR2(64) NOT NULL, APLICADA_EN TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL)",
      );
    } catch (error) {
      if (error.errorNum !== 955) throw error;
    }
    const applied = await connection.execute(
      "SELECT CHECKSUM FROM SIGIP_MIGRACION WHERE ID = :id",
      { id: migrationId },
      queryOptions,
    );
    if (applied.rows.length) {
      if (applied.rows[0].CHECKSUM !== checksum)
        throw new Error("No se permite modificar una migración ya aplicada");
      return { migration: migrationId, status: "YA_APLICADA" };
    }
    // Oracle DDL commits implicitly. Run ONE migration process per schema.
    // A failed migration can be resumed; no DROP, TRUNCATE or data deletion.
    for (const statement of statements) {
      try {
        await connection.execute(statement);
      } catch (error) {
        if (error.errorNum !== 955) throw error;
      }
    }
    await connection.execute(
      "MERGE INTO SIGIP_CONTROL c USING (SELECT 1 ID FROM DUAL) s ON (c.ID=s.ID) WHEN NOT MATCHED THEN INSERT (ID,REVISION,INICIALIZADO) VALUES (1,0,0)",
    );
    await connection.execute(
      "INSERT INTO SIGIP_MIGRACION(ID,CHECKSUM) VALUES (:id,:checksum)",
      { id: migrationId, checksum },
    );
    await connection.commit();
    return { migration: migrationId, status: "APLICADA" };
  });
}
