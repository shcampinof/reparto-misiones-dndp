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

  const demoEnabled = booleanValue(env.ENABLE_DEMO_ACCOUNTS, false);
  if (demoEnabled && environment === "production") {
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
    coordinador: booleanValue(env.ENABLE_ROLE_COORDINADOR, true),
    pag: booleanValue(env.ENABLE_ROLE_PAG, true),
    administrativo_delegado: booleanValue(
      env.ENABLE_ROLE_ADMINISTRATIVO_DELEGADO,
      true,
    ),
    defensor: booleanValue(env.ENABLE_ROLE_DEFENSOR, true),
    investigador: booleanValue(env.ENABLE_ROLE_INVESTIGADOR, true),
    defensor_regional: booleanValue(env.ENABLE_ROLE_DEFENSOR_REGIONAL, true),
    pag_unidad_operativa: booleanValue(
      env.ENABLE_ROLE_PAG_UNIDAD_OPERATIVA,
      true,
    ),
  };

  const config = {
    environment,
    port: integerValue(env.PORT, 4000, "PORT", issues),
    serviceName: env.SERVICE_NAME || "sigip-dp-api",
    serviceVersion: env.SERVICE_VERSION || "1.0.0",
    logLevel,
    corsOrigins: listValue(env.CORS_ORIGINS, [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]),
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
