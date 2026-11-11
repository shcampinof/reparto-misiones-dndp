import { AppError } from "../../shared/errors.js";
import { CAPABILITIES } from "../core/auth/capabilities.js";
import { activePolicy, institutionalDate } from "../core/calendars/terms.js";
import { createAdjustmentContext } from "../core/operations/adjustment-context.js";
import { createTermExtensions } from "../core/operations/term-extensions.js";

export function createInvestigationAdjustments({
  repository,
  clock,
  findItem,
  present,
  assign,
  serviceFor,
  validateRequirements,
  area = "INVESTIGACION",
}) {
  const { execute, event, stateIs, required } = createAdjustmentContext({
    repository,
    clock,
    findItem,
    present,
    area,
  });
  return {
    ...createTermExtensions({ execute, event, stateIs, area, required }),
    referActivity(auth, id, payload) {
      return execute(
        auth,
        id,
        CAPABILITIES.REMITIR_ACTIVIDAD_INVESTIGACION,
        payload,
        ({ state, request, item, at }) => {
          stateIs(item, ["ASIGNADA", "EN_EJECUCION", "INFORME_ENTREGADO"]);
          if (
            payload.assigneeId ||
            payload.investigatorId ||
            payload.executorId
          )
            throw new AppError(
              400,
              "CLIENT_ASSIGNEE_FORBIDDEN",
              "El reparto lo calcula el servidor",
            );
          const policy = activePolicy(state, "REMISION", at, item.service);
          if (
            policy.initiatorRole !== auth.role ||
            !["CENTRAL", "REGIONAL"].includes(policy.route)
          )
            throw new AppError(
              409,
              "ROUTING_POLICY_PENDING",
              "Falta aprobar la ruta y su iniciador",
            );
          const service = serviceFor(
            state,
            "INVESTIGACION",
            payload.service,
            at,
          );
          const date = institutionalDate(at);
          const region = state.catalogs.regions.find(
            (entry) =>
              entry.id === payload.region &&
              ["AMBAS", "INVESTIGACION"].includes(entry.area) &&
              entry.status === "PUBLICADO" &&
              entry.validFrom <= date &&
              (!entry.validTo || date < entry.validTo),
          );
          if (!region)
            throw new AppError(
              400,
              "INVALID_REGION",
              "Cobertura no válida o vencida",
            );
          validateRequirements(
            state,
            "INVESTIGACION",
            [{ service: service.id, region: region.id }],
            request.documents,
            at,
          );
          const derived = {
            id: `${request.id}-DER-${String(request.items.filter((entry) => entry.originItemId).length + 1).padStart(2, "0")}`,
            originItemId: item.id,
            originRequestId: request.id,
            service: service.id,
            serviceVersion: service.version,
            specialtyIds: structuredClone(service.specialtyIds),
            region: region.id,
            law: null,
            status: "PENDIENTE_ENRUTAMIENTO",
            assigneeId: null,
            dueDate: null,
            termSnapshot: structuredClone(service.termPolicy),
            activities: [],
            products: [],
            operations: [],
            timeline: [],
            assignment: null,
            referral: {
              requestedBy: auth.sub,
              requestedAt: at,
              route: policy.route,
              destinationRegion: region.id,
              reason: required(payload.reason, "Motivo"),
              completedActivities: required(
                payload.completedActivities,
                "Actividades ya realizadas",
              ),
              pendingActivities: required(
                payload.pendingActivities,
                "Actividades para la regional receptora",
              ),
              policySnapshot: policy,
            },
          };
          event(
            derived,
            at,
            auth,
            `Actividad derivada de ${item.id}; pendiente de ${policy.route === "REGIONAL" ? "recepción regional" : "enrutamiento central"}`,
          );
          request.items.push(derived);
          event(
            item,
            at,
            auth,
            `Remisión vinculada ${derived.id} a ${region.label}; conserva SPOA y solicitante`,
          );
          state.audit.push({
            type: "REMISION_SOLICITADA",
            actor: auth.sub,
            at,
            requestId: request.id,
            itemId: derived.id,
            originItemId: item.id,
          });
        },
      );
    },
    routeActivity(auth, id, payload) {
      return execute(
        auth,
        id,
        CAPABILITIES.ENRUTAR_ACTIVIDAD_INVESTIGACION,
        payload,
        ({ state, request, item, at }) => {
          stateIs(item, ["PENDIENTE_ENRUTAMIENTO"]);
          const policy = activePolicy(state, "REMISION", at, item.service);
          if (
            policy.routerRole !== auth.role ||
            !["CENTRAL", "REGIONAL"].includes(policy.route) ||
            (policy.route === "REGIONAL" &&
              auth.region &&
              auth.region !== item.region)
          )
            throw new AppError(
              403,
              "POLICY_ROUTER_FORBIDDEN",
              "El rol no corresponde al enrutador aprobado",
            );
          item.referral.routingObservation = required(
            payload.observation,
            "Observación de enrutamiento",
          );
          Object.assign(item.referral, {
            routedBy: auth.sub,
            routedAt: at,
            routingPolicySnapshot: policy,
          });
          assign(state, item, at);
          event(
            item,
            at,
            auth,
            "Remisión enrutada con reparto automático y explicación de candidatos",
          );
          state.audit.push({
            type: "REMISION_ENRUTADA",
            actor: auth.sub,
            at,
            requestId: request.id,
            itemId: item.id,
          });
        },
      );
    },
    recordDispatch(auth, id, payload) {
      return execute(
        auth,
        id,
        CAPABILITIES.EJECUTAR_ITEM_INVESTIGACION,
        payload,
        ({ request, item, at }) => {
          stateIs(item, ["APROBADO_PENDIENTE_ENVIO"]);
          item.dispatch = {
            recipientUserId: request.ownerUserId,
            recipientEmail: request.requester?.email || null,
            evidence: required(
              payload.evidence,
              "Constancia del envío al defensor",
            ),
            recordedAt: at,
            recordedBy: auth.sub,
            productId: item.products?.at(-1)?.id,
          };
          const from = item.status;
          item.status = "CERRADA";
          item.timeline.push({
            at,
            from,
            to: item.status,
            actor: auth.sub,
            message: "Envío del informe al defensor acreditado; misión cerrada",
          });
        },
      );
    },
  };
}
