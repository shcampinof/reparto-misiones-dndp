import crypto from "node:crypto";

const ENVIRONMENTS = new Set(["development", "test", "production"]);
const LOG_LEVELS = new Set(["debug", "info", "warn", "error", "silent"]);
const APP_PROFILES = new Set(["presentation", "institutional"]);
const PERSISTENCE_DRIVERS = new Set(["sqlite", "oracle"]);

export class ConfigurationError extends Error {
  constructor(issues) {
    super(`Configuracion invalida: ${issues.join("; ")}`);
    this.name = "ConfigurationError";
    this.issues = issues;
  }
}

function booleanValue(value, defaultValue = false) {
  if (value === undefined || value === "") return defaultValue;
  return ["1", "true", "yes", "on", "si"].includes(String(value).toLowerCase());
}

function integerValue(value, fallback, name, issues) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    issues.push(`${name} debe ser un puerto valido`);
    return fallback;
  }
  return parsed;
}

function boundedInteger(value, fallback, name, issues, { minimum = 0 } = {}) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    issues.push(`${name} debe ser un entero mayor o igual a ${minimum}`);
    return fallback;
  }
  return parsed;
}

function listValue(value, fallback = []) {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createConfig(env = process.env) {
  const issues = [];
  const environment = env.NODE_ENV || "development";
  if (!ENVIRONMENTS.has(environment)) issues.push("NODE_ENV no es valido");

  const logLevel = env.LOG_LEVEL || "info";
  if (!LOG_LEVELS.has(logLevel)) issues.push("LOG_LEVEL no es valido");

  const appProfile = env.APP_PROFILE || "presentation";
  if (!APP_PROFILES.has(appProfile)) issues.push("APP_PROFILE no es valido");
  const expectedDriver = appProfile === "institutional" ? "oracle" : "sqlite";
  const persistenceDriver = env.PERSISTENCE_DRIVER || expectedDriver;
  if (!PERSISTENCE_DRIVERS.has(persistenceDriver)) {
    issues.push("PERSISTENCE_DRIVER no es valido");
  }
  if (persistenceDriver !== expectedDriver) {
    issues.push(
      `APP_PROFILE=${appProfile} requiere PERSISTENCE_DRIVER=${expectedDriver}`,
    );
  }

  const productionDemoMode = booleanValue(env.DEMO_MODE, false);
  const demoEnabled =
    productionDemoMode || booleanValue(env.ENABLE_DEMO_ACCOUNTS, false);
  if (demoEnabled && environment === "production" && !productionDemoMode) {
    issues.push("ENABLE_DEMO_ACCOUNTS no puede habilitarse en produccion");
  }
  if (demoEnabled && appProfile === "institutional") {
    issues.push(
      "Las cuentas de presentación no pueden habilitarse en el perfil institucional",
    );
  }

  let jwtSecret = String(env.JWT_SECRET || "").trim();
  let ephemeralJwtSecret = false;
  if (!jwtSecret) {
    if (environment === "production") {
      issues.push("JWT_SECRET es obligatorio en produccion");
    } else {
      jwtSecret = crypto.randomBytes(32).toString("hex");
      ephemeralJwtSecret = true;
    }
  }
  if (environment === "production" && jwtSecret.length < 32) {
    issues.push("JWT_SECRET debe tener al menos 32 caracteres en produccion");
  }

  const roleFlags = {
    administrador: booleanValue(env.ENABLE_ROLE_ADMINISTRADOR, true),
    defensor: booleanValue(env.ENABLE_ROLE_DEFENSOR, true),
    investigador: booleanValue(env.ENABLE_ROLE_INVESTIGADOR, true),
    pag_investigacion: booleanValue(env.ENABLE_ROLE_PAG_INVESTIGACION, true),
    rjv: booleanValue(env.ENABLE_ROLE_RJV, true),
    pag_victimas: booleanValue(env.ENABLE_ROLE_PAG_VICTIMAS, true),
    perito: booleanValue(env.ENABLE_ROLE_PERITO, true),
    pag_central: false,
    administrador_regional: false,
    defensor_regional: false,
  };

  const oracle = {
    user: String(env.ORACLE_USER || "").trim(),
    password: String(env.ORACLE_PASSWORD || ""),
    connectString: String(env.ORACLE_CONNECT_STRING || "").trim(),
    poolMin: boundedInteger(env.ORACLE_POOL_MIN, 1, "ORACLE_POOL_MIN", issues),
    poolMax: boundedInteger(env.ORACLE_POOL_MAX, 8, "ORACLE_POOL_MAX", issues, {
      minimum: 1,
    }),
    poolIncrement: boundedInteger(
      env.ORACLE_POOL_INCREMENT,
      1,
      "ORACLE_POOL_INCREMENT",
      issues,
      { minimum: 1 },
    ),
    poolTimeout: boundedInteger(
      env.ORACLE_POOL_TIMEOUT,
      60,
      "ORACLE_POOL_TIMEOUT",
      issues,
    ),
    queueTimeout: boundedInteger(
      env.ORACLE_QUEUE_TIMEOUT,
      15000,
      "ORACLE_QUEUE_TIMEOUT",
      issues,
    ),
    statementCacheSize: boundedInteger(
      env.ORACLE_STATEMENT_CACHE_SIZE,
      30,
      "ORACLE_STATEMENT_CACHE_SIZE",
      issues,
    ),
    allowMigration: booleanValue(env.ALLOW_ORACLE_MIGRATION, false),
  };
  if (appProfile === "institutional") {
    if (!oracle.user) issues.push("ORACLE_USER es obligatorio");
    if (!oracle.password) issues.push("ORACLE_PASSWORD es obligatorio");
    if (!oracle.connectString)
      issues.push("ORACLE_CONNECT_STRING es obligatorio");
    if (["SYS", "SYSTEM"].includes(oracle.user.toUpperCase())) {
      issues.push("ORACLE_USER no puede ser SYS ni SYSTEM");
    }
    if (oracle.poolMin > oracle.poolMax) {
      issues.push("ORACLE_POOL_MIN no puede superar ORACLE_POOL_MAX");
    }
  }

  const config = {
    appProfile,
    persistence: {
      driver: persistenceDriver,
      sqlitePath:
        String(env.SQLITE_PATH || "").trim() ||
        (environment === "test"
          ? ":memory:"
          : "data/sigip-presentation.sqlite"),
      oracle,
    },
    environment,
    host: env.HOST || "0.0.0.0",
    port: integerValue(
      env.PORT,
      environment === "production" ? 7860 : 4000,
      "PORT",
      issues,
    ),
    serviceName: env.SERVICE_NAME || "sigip-dp-api",
    serviceVersion: env.SERVICE_VERSION || "1.0.0",
    logLevel,
    staticDir: String(env.STATIC_DIR || "").trim() || null,
    demoResetOnStart: booleanValue(env.DEMO_RESET_ON_START, true),
    corsOrigins: listValue(
      env.CORS_ORIGINS,
      environment === "production"
        ? []
        : ["http://localhost:5173", "http://127.0.0.1:5173"],
    ),
    auth: {
      jwtSecret,
      ephemeralJwtSecret,
      demoEnabled,
      roleFlags,
    },
  };

  if (issues.length) throw new ConfigurationError(issues);
  return Object.freeze(config);
}
