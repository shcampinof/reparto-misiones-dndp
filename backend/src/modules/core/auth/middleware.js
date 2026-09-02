import jwt from "jsonwebtoken";
import { AppError } from "../../../shared/errors.js";

export function createAuthMiddleware(config) {
  return (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(new AppError(401, "TOKEN_REQUIRED", "Token requerido"));
    }

    try {
      req.auth = jwt.verify(
        authHeader.slice("Bearer ".length),
        config.auth.jwtSecret,
      );
      return next();
    } catch {
      return next(
        new AppError(401, "INVALID_TOKEN", "Token invalido o expirado"),
      );
    }
  };
}

export function ensureRoles(allowed) {
  return (req, _res, next) => {
    if (!allowed.includes(req.auth.role)) {
      return next(
        new AppError(403, "FORBIDDEN", "No tiene permisos para esta accion"),
      );
    }
    return next();
  };
}
