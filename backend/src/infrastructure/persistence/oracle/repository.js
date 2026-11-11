import oracledb from "oracledb";
import { AppError } from "../../../shared/errors.js";
import { assertStateHistory } from "../state-integrity.js";
import {
  createOraclePool,
  queryOptions,
  withOracleConnection,
} from "./connection.js";
import { verifyMigrations } from "./migrations.js";
import { model } from "./model.js";
import { encodeState, decodeState } from "./codec.js";

export class OracleRepository {
  driver = "oracle";
  constructor(pool, config) {
    this.pool = pool;
    this.config = config;
  }

  static async open(config, seedFactory, configure = () => {}) {
    const pool = await createOraclePool(config);
    const repository = new OracleRepository(pool, config);
    try {
      await withOracleConnection(pool, config, (connection) =>
        verifyMigrations(connection),
      );
      await repository.unit(async (connection, control) => {
        const before = control.INICIALIZADO
          ? await repository.read(connection)
          : null;
        const state = before ? structuredClone(before) : seedFactory();
        configure(state);
        if (before) assertStateHistory(before, state);
        await repository.write(connection, before, state);
        await connection.execute(
          "UPDATE SIGIP_CONTROL SET REVISION=REVISION+1, INICIALIZADO=1 WHERE ID=1",
        );
        await connection.commit();
      });
      return repository;
    } catch (error) {
      await pool.close(0);
      throw error;
    }
  }

  async unit(work) {
    try {
      return await withOracleConnection(
        this.pool,
        this.config,
        async (connection) => {
          const result = await connection.execute(
            "SELECT REVISION, INICIALIZADO FROM SIGIP_CONTROL WHERE ID=1 FOR UPDATE WAIT 15",
            {},
            queryOptions,
          );
          if (!result.rows.length)
            throw new Error("Falta SIGIP_CONTROL; ejecute las migraciones");
          return work(connection, result.rows[0]);
        },
      );
    } catch (error) {
      if ([54, 60, 30006].includes(error.errorNum))
        throw new AppError(
          409,
          "ORACLE_WRITE_BUSY",
          "Existe otra operación en curso. Reintente con el mismo identificador de envío.",
        );
      throw error;
    }
  }

  async read(connection) {
    const tables = {};
    // A single connection is used sequentially; no overlapping Oracle calls.
    for (const { table, columns } of model) {
      const selected = ["ID", "ORDEN", "DATOS", ...Object.keys(columns)].join(
        ",",
      );
      const result = await connection.execute(
        `SELECT ${selected} FROM ${table} ORDER BY ORDEN`,
        {},
        queryOptions,
      );
      tables[table] = result.rows;
    }
    return decodeState(tables);
  }

  async snapshot() {
    return withOracleConnection(this.pool, this.config, async (connection) => {
      // Consistent SCN across entity tables while other sessions commit writes.
      await connection.execute("SET TRANSACTION READ ONLY");
      const state = await this.read(connection);
      if (!state) throw new Error("Oracle no ha sido inicializado");
      return state;
    });
  }

  async transaction(work) {
    return this.unit(async (connection) => {
      const before = await this.read(connection);
      const draft = structuredClone(before);
      const result = await work(draft);
      assertStateHistory(before, draft);
      // Results are returned only after all domain rows + outbox + audit commit.
      const response = structuredClone(result);
      await this.write(connection, before, draft);
      await connection.execute(
        "UPDATE SIGIP_CONTROL SET REVISION=REVISION+1 WHERE ID=1",
      );
      await connection.commit();
      return response;
    });
  }

  async write(connection, before, after) {
    const old = before ? encodeState(before) : {};
    const next = encodeState(after);
    for (const entry of model) {
      const previous = new Map((old[entry.table] || []).map((r) => [r.ID, r]));
      const columns = ["ID", "ORDEN", "DATOS", ...Object.keys(entry.columns)];
      for (const row of next[entry.table]) {
        const existing = previous.get(row.ID);
        if (JSON.stringify(existing) === JSON.stringify(row)) continue;
        if (entry.immutable && existing)
          throw new Error(`No se modifica historial en ${entry.table}`);
        const binds = Object.fromEntries(
          columns.map((key) => [
            key,
            ["DATOS", "CONTENIDO"].includes(key)
              ? { val: row[key], type: oracledb.DB_TYPE_CLOB }
              : (row[key] ?? null),
          ]),
        );
        const insert = `INSERT (${columns.join(",")}) VALUES (${columns.map((k) => `:${k}`).join(",")})`;
        if (entry.immutable) {
          const result = await connection.execute(
            `MERGE INTO ${entry.table} t USING (SELECT :ID ID FROM DUAL) s ON (t.ID=s.ID) WHEN NOT MATCHED THEN ${insert}`,
            binds,
            queryOptions,
          );
          if (result.rowsAffected === 0) {
            const stored = await connection.execute(
              `SELECT ${columns.join(",")} FROM ${entry.table} WHERE ID=:ID`,
              { ID: row.ID },
              queryOptions,
            );
            if (
              !stored.rows[0] ||
              columns.some((key) => stored.rows[0][key] !== (row[key] ?? null))
            )
              throw new Error(
                `Identificador histórico reutilizado en ${entry.table}`,
              );
          }
        } else {
          const updates = columns
            .filter((k) => k !== "ID")
            .map((k) => `t.${k}=:${k}`)
            .join(",");
          await connection.execute(
            `MERGE INTO ${entry.table} t USING (SELECT :ID ID FROM DUAL) s ON (t.ID=s.ID) WHEN MATCHED THEN UPDATE SET ${updates} WHEN NOT MATCHED THEN ${insert}`,
            binds,
            queryOptions,
          );
        }
      }
    }
  }

  reset() {
    throw new AppError(
      409,
      "PERSISTENT_RESET_DISABLED",
      "Oracle conserva los registros. Use un esquema independiente para otro ciclo.",
    );
  }
  async check() {
    return withOracleConnection(this.pool, this.config, async (connection) => {
      const result = await connection.execute(
        "SELECT REVISION, INICIALIZADO FROM SIGIP_CONTROL WHERE ID=1",
        {},
        queryOptions,
      );
      if (!result.rows[0]?.INICIALIZADO)
        throw new Error("Oracle no inicializado");
      return result.rows[0];
    });
  }
  async close() {
    await this.pool.close(10);
  }
}
