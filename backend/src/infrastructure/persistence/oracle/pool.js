import oracledb from "oracledb";

const MINIMUM_THIN_DATABASE_VERSION = 1201000000;
oracledb.fetchAsString = [oracledb.CLOB];

export async function createOraclePool(config) {
  const pool = await oracledb.createPool({
    user: config.user,
    password: config.password,
    connectString: config.connectString,
    poolMin: config.poolMin,
    poolMax: config.poolMax,
    poolIncrement: config.poolIncrement,
    poolTimeout: config.poolTimeout,
    queueTimeout: config.queueTimeout,
    stmtCacheSize: config.statementCacheSize,
  });
  let connection;
  let ready = false;
  try {
    connection = await pool.getConnection();
    if (connection.oracleServerVersion < MINIMUM_THIN_DATABASE_VERSION) {
      throw new Error("Oracle Thin requiere Oracle Database 12.1 o posterior");
    }
    await connection.execute("SELECT 1 FROM DUAL");
    ready = true;
    return pool;
  } finally {
    await connection?.close().catch(() => {});
    if (!ready) await pool.close(0).catch(() => {});
  }
}

export async function oracleHealth(pool) {
  if (!pool) return { ok: false, status: "not_initialized" };
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute("SELECT 1 FROM DUAL");
    return { ok: true, status: "ready", mode: "thin" };
  } catch (error) {
    return {
      ok: false,
      status: "unavailable",
      error: error.code || error.name || "ORACLE_ERROR",
    };
  } finally {
    await connection?.close().catch(() => {});
  }
}
