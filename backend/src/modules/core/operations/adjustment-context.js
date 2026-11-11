import { createHash } from "node:crypto";
import { AppError } from "../../../shared/errors.js";
import { assertCapability } from "../auth/capabilities.js";

const required = (value, label) => {
  if (typeof value !== "string" || !value.trim() || value.length > 10000)
    throw new AppError(
      400,
      "INVALID_ADJUSTMENT",
      `${label} es obligatorio y admite hasta 10.000 caracteres`,
    );
  return value.trim();
};

export function createAdjustmentContext({
  repository,
  clock,
  findItem,
  present,
  area,
}) {
  function execute(auth, itemId, capability, payload, work) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, area);
      assertCapability(auth, capability, {
        area: request.area,
        region: item.region,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
      });
      const id = required(payload.submissionId, "Identificador de envío");
      if (id.length > 100)
        throw new AppError(
          400,
          "INVALID_SUBMISSION",
          "Identificador demasiado largo",
        );
      const fingerprint = createHash("sha256")
        .update(JSON.stringify({ capability, payload }))
        .digest("hex");
      item.adjustmentSubmissions ||= [];
      const previous = item.adjustmentSubmissions.find(
        (entry) => entry.id === id && entry.actor === auth.sub,
      );
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new AppError(
            409,
            "SUBMISSION_CONFLICT",
            "El envío ya corresponde a otra operación",
          );
        return present(state, request, auth);
      }
      const at = clock();
      work({ state, request, item, at });
      item.adjustmentSubmissions.push({ id, actor: auth.sub, fingerprint });
      return present(state, request, auth);
    });
  }
  const event = (item, at, auth, message) =>
    item.timeline.push({
      at,
      from: item.status,
      to: item.status,
      actor: auth.sub,
      message,
    });
  const stateIs = (item, statuses) => {
    if (!statuses.includes(item.status))
      throw new AppError(
        409,
        "INVALID_TRANSITION",
        "La operación no está disponible en este estado",
      );
  };
  return { execute, event, stateIs, required };
}
