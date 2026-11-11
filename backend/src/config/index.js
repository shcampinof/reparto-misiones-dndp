import crypto from "node:crypto";

const ENVIRONMENTS = new Set(["development", "test", "production"]);
const LOG_LEVELS = new Set(["debug", "info", "warn", "error", "silent"]);

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

  const productionDemoMode = booleanValue(env.DEMO_MODE, false);
  const demoEnabled =
    productionDemoMode || booleanValue(env.ENABLE_DEMO_ACCOUNTS, false);
  if (demoEnabled && environment === "production" && !productionDemoMode) {
    issues.push("ENABLE_DEMO_ACCOUNTS no puede habilitarse en produccion");
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
    gestor_operativo_regional: booleanValue(
      env.ENABLE_ROLE_GESTOR_OPERATIVO_REGIONAL,
      true,
    ),
    gestor_central_excepciones: booleanValue(
      env.ENABLE_ROLE_GESTOR_CENTRAL_EXCEPCIONES,
      true,
    ),
    defensor_regional: booleanValue(env.ENABLE_ROLE_DEFENSOR_REGIONAL, true),
  };

  const config = {
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
    storage: {
      driver:
        env.STORAGE_DRIVER || (environment === "test" ? "memory" : "sqlite"),
      filename: env.SQLITE_PATH || "./data/sigip.sqlite",
    },
    oracle: {
      user: String(env.ORACLE_USER || "").trim(),
      password: String(env.ORACLE_PASSWORD || ""),
      connectString: String(env.ORACLE_CONNECT_STRING || "").trim(),
      poolMin: Number(env.ORACLE_POOL_MIN || 0),
      poolMax: Number(env.ORACLE_POOL_MAX || 4),
      queueTimeout: Number(env.ORACLE_QUEUE_TIMEOUT_MS || 15000),
      callTimeout: Number(env.ORACLE_CALL_TIMEOUT_MS || 30000),
      configDir: String(env.ORACLE_CONFIG_DIR || "").trim(),
      walletLocation: String(env.ORACLE_WALLET_LOCATION || "").trim(),
      walletPassword: String(env.ORACLE_WALLET_PASSWORD || ""),
      seedDemo: booleanValue(env.ORACLE_SEED_DEMO, false),
      allowExistingSchema: booleanValue(
        env.ORACLE_ALLOW_EXISTING_SCHEMA,
        false,
      ),
    },
    files: {
      version: env.FILE_POLICY_VERSION || "TECHNICAL-2026-10-19-v1",
      maxFileBytes: Number(env.FILE_MAX_MB || 2) * 1024 * 1024,
      maxIntakeBytes: Number(env.INTAKE_MAX_MB || 4) * 1024 * 1024,
      maxItemBytes: Number(env.ITEM_FILES_MAX_MB || 50) * 1024 * 1024,
      maxRequestBytes: Number(env.JSON_MAX_MB || 48) * 1024 * 1024,
      antimalwareCommand: String(env.ANTIMALWARE_COMMAND || "").trim(),
      requireAntimalware: booleanValue(env.REQUIRE_ANTIMALWARE, false),
    },
    backups: {
      directory: String(env.BACKUP_DIRECTORY || "").trim(),
      intervalMinutes: Number(env.BACKUP_INTERVAL_MINUTES || 360),
      keep: Number(env.BACKUP_KEEP || 3),
    },
    provisionalRules: booleanValue(
      env.ENABLE_PROVISIONAL_RULES,
      environment !== "test",
    ),
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

  if (!["sqlite", "memory", "oracle"].includes(config.storage.driver))
    issues.push("STORAGE_DRIVER debe ser sqlite, memory u oracle");
  if (config.storage.driver === "oracle") {
    if (["SYS", "SYSTEM"].includes(config.oracle.user.toUpperCase()))
      issues.push(
        "Use un usuario de aplicación; SYS y SYSTEM no están permitidos",
      );
    for (const [key, value] of Object.entries({
      ORACLE_USER: config.oracle.user,
      ORACLE_PASSWORD: config.oracle.password,
      ORACLE_CONNECT_STRING: config.oracle.connectString,
    })) {
      if (!value) issues.push(`${key} es obligatorio para Oracle`);
    }
    if (
      !Number.isInteger(config.oracle.poolMin) ||
      !Number.isInteger(config.oracle.poolMax) ||
      config.oracle.poolMin < 0 ||
      config.oracle.poolMax < 1 ||
      config.oracle.poolMax > 32 ||
      config.oracle.poolMin > config.oracle.poolMax
    )
      issues.push("Pool Oracle no válido");
    for (const value of [
      config.oracle.queueTimeout,
      config.oracle.callTimeout,
    ]) {
      if (!Number.isInteger(value) || value < 1000 || value > 120000)
        issues.push("Timeout Oracle no válido");
    }
    if (config.oracle.seedDemo && environment === "production")
      issues.push("ORACLE_SEED_DEMO sólo se permite en desarrollo/pruebas");
    if (config.oracle.seedDemo !== config.auth.demoEnabled)
      issues.push(
        "Oracle de desarrollo requiere habilitar juntos ORACLE_SEED_DEMO y ENABLE_DEMO_ACCOUNTS",
      );
  }
  if (
    !Number.isInteger(config.backups.intervalMinutes) ||
    config.backups.intervalMinutes < 1 ||
    !Number.isInteger(config.backups.keep) ||
    config.backups.keep < 1 ||
    config.backups.keep > 30
  )
    issues.push("Configuración de copias no válida");
  for (const key of [
    "maxFileBytes",
    "maxIntakeBytes",
    "maxItemBytes",
    "maxRequestBytes",
  ]) {
    if (
      !Number.isSafeInteger(config.files[key]) ||
      config.files[key] < 1024 ||
      config.files[key] > 128 * 1024 * 1024
    )
      issues.push(`Límite documental no válido: ${key}`);
  }
  if (
    config.files.maxIntakeBytes < config.files.maxFileBytes ||
    config.files.maxItemBytes < config.files.maxFileBytes ||
    config.files.maxRequestBytes <
      Math.ceil((config.files.maxIntakeBytes * 4) / 3) + 65536
  )
    issues.push("Los límites de archivo, radicación y JSON no son coherentes");
  if (
    config.storage.driver === "memory" &&
    environment !== "test" &&
    !productionDemoMode
  )
    issues.push(
      "La persistencia en memoria sólo se admite en pruebas o demostración explícita",
    );
  if (issues.length) throw new ConfigurationError(issues);
  return Object.freeze(config);
}
