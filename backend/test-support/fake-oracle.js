import { encodeState } from "../src/infrastructure/persistence/oracle/codec.js";

// Contract double: verifies transaction boundaries, not Oracle SQL compatibility.
export function fakeOraclePool(seed) {
  const pool = {
    tables: encodeState(seed),
    control: { REVISION: 0, INICIALIZADO: 1 },
    events: [],
    failCommit: false,
    closed: 0,
    tail: Promise.resolve(),
    acquire() {
      const previous = this.tail;
      let unlock;
      this.tail = new Promise((resolve) => {
        unlock = resolve;
      });
      return previous.then(() => unlock);
    },
    async getConnection() {
      let view, control, unlock;
      return {
        async execute(sql, bindings = {}) {
          pool.events.push(sql);
          if (sql.includes("FOR UPDATE")) {
            unlock = await pool.acquire();
            view = structuredClone(pool.tables);
            control = structuredClone(pool.control);
            return { rows: [control] };
          }
          if (sql.startsWith("ALTER SESSION")) return {};
          if (sql === "SET TRANSACTION READ ONLY") {
            view = structuredClone(pool.tables);
            return {};
          }
          if (sql.startsWith("UPDATE SIGIP_CONTROL")) {
            control.REVISION++;
            return { rowsAffected: 1 };
          }
          if (sql.includes("FROM SIGIP_CONTROL"))
            return { rows: [pool.control] };
          if (sql.startsWith("SELECT ")) {
            const table = sql.match(/FROM (SIGIP_[A-Z_]+)/)[1];
            return {
              rows: structuredClone(
                (view || pool.tables)[table].filter(
                  (r) => !sql.includes("WHERE ID=") || r.ID === bindings.ID,
                ),
              ),
            };
          }
          if (sql.startsWith("MERGE INTO ")) {
            const table = sql.match(/MERGE INTO (SIGIP_[A-Z_]+)/)[1];
            const row = Object.fromEntries(
              Object.entries(bindings).map(([k, v]) => [
                k,
                v && typeof v === "object" ? v.val : v,
              ]),
            );
            const index = view[table].findIndex((r) => r.ID === row.ID);
            if (index >= 0 && !sql.includes("WHEN MATCHED"))
              return { rowsAffected: 0 };
            if (index < 0) view[table].push(row);
            else view[table][index] = row;
            return { rowsAffected: 1 };
          }
          throw new Error(`Unexpected contract SQL: ${sql}`);
        },
        async commit() {
          pool.events.push("COMMIT");
          if (pool.failCommit) throw new Error("COMMIT_FAILED");
          pool.tables = view;
          pool.control = control;
          unlock?.();
          unlock = undefined;
        },
        async rollback() {
          pool.events.push("ROLLBACK");
          unlock?.();
          unlock = undefined;
        },
        async close() {
          pool.closed++;
        },
      };
    },
    async close() {},
  };
  return pool;
}
