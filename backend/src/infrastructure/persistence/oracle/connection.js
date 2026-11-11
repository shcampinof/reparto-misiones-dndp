import oracledb from "oracledb";

export function oraclePoolOptions(config) {
  const options = {
    user: config.user,
    password: config.password,
    connectString: config.connectString,
    poolMin: config.poolMin,
    poolMax: config.poolMax,
    poolIncrement: 1,
    queueTimeout: config.queueTimeout,
    connectTimeout: Math.ceil(config.callTimeout / 1000),
    retryCount: 0,
  };
  if (config.configDir) options.configDir = config.configDir;
  if (config.walletLocation) options.walletLocation = config.walletLocation;
  if (config.walletPassword) options.walletPassword = config.walletPassword;
  return options;
}

export async function createOraclePool(config) {
  return oracledb.createPool(oraclePoolOptions(config));
}

export async function withOracleConnection(pool, config, work) {
  const connection = await pool.getConnection();
  connection.callTimeout = config.callTimeout;
  try {
    await connection.execute("ALTER SESSION SET TIME_ZONE = '+00:00'");
    return await work(connection);
  } finally {
    // Pending DML must never leak into a subsequent borrower of the pool.
    try {
      await connection.rollback();
    } finally {
      await connection.close();
    }
  }
}

export const queryOptions = {
  autoCommit: false,
  outFormat: oracledb.OUT_FORMAT_OBJECT,
  fetchTypeHandler(metadata) {
    if (metadata.dbType === oracledb.DB_TYPE_CLOB)
      return { type: oracledb.STRING };
  },
};
