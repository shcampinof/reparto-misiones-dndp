import { AppError } from "../../../shared/errors.js";
import { CAPABILITIES } from "../auth/capabilities.js";
import {
  activePolicy,
  addTermDays,
  institutionalDate,
  validDate,
  operationalPolicy,
} from "../calendars/terms.js";

export function createTermExtensions({
  execute,
  event,
  stateIs,
  area,
  required,
}) {
  return {
    requestExtension(auth, id, payload) {
      return execute(
        auth,
        id,
        CAPABILITIES.SOLICITAR_PRORROGA,
        payload,
        ({ state, request, item, at }) => {
          stateIs(item, ["EN_EJECUCION"]);
          if (
            item.termExtensions?.some((entry) => entry.status === "SOLICITADA")
          )
            throw new AppError(
              409,
              "EXTENSION_PENDING",
              "Ya hay una ampliación de términos pendiente",
            );
          if (item.dueDate && institutionalDate(at) > item.dueDate)
            throw new AppError(
              409,
              "TERM_EXPIRED",
              "La solicitud debe presentarse antes del vencimiento",
            );
          const extension = {
            id: `PR-${item.id}-${(item.termExtensions?.length || 0) + 1}`,
            status: "SOLICITADA",
            reason: required(payload.reason, "Motivo"),
            supportReference: required(payload.supportReference, "Soporte"),
            requestedBy: auth.sub,
            requestedAt: at,
            originalDueDate: item.dueDate,
          };
          item.termExtensions ||= [];
          item.termExtensions.push(extension);
          state.operations.push({
            ...extension,
            type: "SOLICITUD_PRORROGA",
            area: request.area,
            requestId: request.id,
            itemId: item.id,
            actor: auth.sub,
          });
          event(
            item,
            at,
            auth,
            "Ampliación de términos solicitada; no modifica el vencimiento hasta aprobación con política vigente",
          );
        },
      );
    },
    decideExtension(auth, id, payload) {
      return execute(
        auth,
        id,
        area === "VICTIMAS"
          ? CAPABILITIES.DECIDIR_PRORROGA_VICTIMAS
          : CAPABILITIES.DECIDIR_PRORROGA_INVESTIGACION,
        payload,
        ({ state, item, at }) => {
          stateIs(item, ["EN_EJECUCION"]);
          const extension = item.termExtensions?.find(
            (entry) =>
              entry.id === payload.extensionId && entry.status === "SOLICITADA",
          );
          if (!extension)
            throw new AppError(
              409,
              "EXTENSION_NOT_PENDING",
              "No existe la solicitud pendiente",
            );
          const observation = required(
            payload.observation,
            "Observación de decisión",
          );
          if (!["APROBADA", "RECHAZADA"].includes(payload.decision))
            throw new AppError(400, "INVALID_DECISION", "Decisión no válida");
          // The source still leaves regional approval pending. Both decisions need RACI evidence.
          const policy = activePolicy(
            state,
            "PRORROGA",
            at,
            item.service,
            area,
          );
          if (policy.approverRole !== auth.role)
            throw new AppError(
              403,
              "POLICY_APPROVER_FORBIDDEN",
              "El rol no corresponde al aprobador de la política",
            );
          if (
            payload.decision === "APROBADA" &&
            item.timeline.some((entry) => entry.to === "INFORME_ENTREGADO") &&
            policy.allowAfterReturn !== true
          )
            throw new AppError(
              409,
              "RETURN_EXTENSION_POLICY_PENDING",
              "La política debe autorizar expresamente una prórroga durante la corrección del informe",
            );
          if (payload.decision === "APROBADA") {
            const approvedCount = (item.termExtensions || []).filter(
              (entry) => entry.status === "APROBADA",
            ).length;
            if (
              !(area === "VICTIMAS" && policy.maxExtensions === null) &&
              (!Number.isSafeInteger(policy.maxExtensions) ||
                policy.maxExtensions < 1 ||
                approvedCount >= policy.maxExtensions)
            )
              throw new AppError(
                409,
                "EXTENSION_LIMIT",
                "La política no permite otra ampliación",
              );
            if (
              !validDate(item.dueDate) ||
              !operationalPolicy(item.termSnapshot)
            )
              throw new AppError(
                409,
                "TERM_NOT_CONFIGURED",
                "La misión no tiene vencimiento aprobado",
              );
            if (
              policy.requiresProblem &&
              !(item.operations || []).some(
                (entry) => entry.type === "PROBLEMA",
              )
            )
              throw new AppError(
                409,
                "PROBLEM_REQUIRED",
                "La política exige un reporte de problema previo",
              );
            const calendar = (state.calendars || []).find(
              (entry) =>
                entry.id === policy.calendarId &&
                entry.version === policy.calendarVersion,
            );
            extension.calendarSnapshot = structuredClone(calendar);
            const maximum =
              policy.durationMode === "HASTA_TERMINO_INICIAL"
                ? item.termSnapshot.value
                : policy.extensionDays;
            const days = payload.days ?? maximum;
            if (!Number.isSafeInteger(days) || days < 1 || days > maximum)
              throw new AppError(
                400,
                "INVALID_EXTENSION_DAYS",
                `Indique entre 1 y ${maximum} días para esta ampliación`,
              );
            extension.grantedDays = days;
            extension.dayType =
              policy.durationMode === "HASTA_TERMINO_INICIAL"
                ? item.termSnapshot.dayType
                : policy.dayType;
            extension.newDueDate = addTermDays(
              item.dueDate,
              days,
              policy.durationMode === "HASTA_TERMINO_INICIAL"
                ? item.termSnapshot.dayType
                : policy.dayType,
              calendar,
            );
            item.dueDate = extension.newDueDate;
          }
          Object.assign(extension, {
            status: payload.decision,
            decidedBy: auth.sub,
            decidedAt: at,
            observation,
            policySnapshot: {
              ...policy,
              ...(extension.dayType ? { dayType: extension.dayType } : {}),
            },
          });
          event(
            item,
            at,
            auth,
            `Ampliación de términos ${payload.decision.toLowerCase()}${extension.newDueDate ? ` · Nuevo vencimiento ${extension.newDueDate}` : ""}`,
          );
        },
      );
    },
  };
}
