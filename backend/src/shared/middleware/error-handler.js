import { AppError } from "../errors.js";

export function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Ruta no encontrada: ${req.method} ${req.path}`,
    ),
  );
}

export function errorHandler(logger) {
  return (error, req, res, _next) => {
    const invalidJson = error?.type === "entity.parse.failed";
    const status =
      error instanceof AppError ? error.status : invalidJson ? 400 : 500;
    const code =
      error instanceof AppError
        ? error.code
        : invalidJson
          ? "INVALID_JSON"
          : "INTERNAL_ERROR";

    logger.error(
      {
        requestId: req.requestId,
        code,
        status,
        errorName: error.name,
        errorMessage: error.message,
      },
      "request_failed",
    );

    const payload = {
      error: {
        code,
        message:
          status === 500
            ? "Error interno del servidor"
            : invalidJson
              ? "El cuerpo JSON no es valido"
              : error.message,
        requestId: req.requestId,
      },
    };
    if (error instanceof AppError && error.details !== undefined) {
      payload.error.details = error.details;
    }
    res.status(status).json(payload);
  };
}
