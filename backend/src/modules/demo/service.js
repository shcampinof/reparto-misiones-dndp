import { createAdjustmentContext } from "../core/operations/adjustment-context.js";
import { createTermExtensions } from "../core/operations/term-extensions.js";
import { createHash } from "node:crypto";
import { normalizeDelivery } from "./delivery.js";
import {
  victimsPersonFields,
  victimsCaseFields,
  f171Metadata,
  formatDate,
} from "../victimas/format-fields.js";
import { DEMO_PARAMETERS } from "../../infrastructure/demo/seeds.js";
import { AppError } from "../../shared/errors.js";
import { assignInvestigation } from "../assignment/strategies/investigation.js";
import { assignVictims } from "../assignment/strategies/victims.js";
import {
  CAPABILITIES,
  assertCapability,
  hasCapability,
} from "../core/auth/capabilities.js";
import { PROPOSED_PROFILES } from "../core/auth/proposed-profiles.js";
import { projectRequestForAuth } from "../core/auth/request-projection.js";
import { publishedServices } from "../core/catalogs/service.js";
import { investigationSupervision } from "../reporting/investigation.js";
import { OPERATION_CONTRACTS } from "../core/operations/contracts.js";
import { createInvestigationAdjustments } from "../investigacion/adjustments.js";
import { enqueueWorkflowNotifications } from "../core/notifications/outbox.js";
import { investigationExport } from "../reporting/investigation-export.js";
import {
  addTermDays,
  institutionalDate,
  validDate,
  termTracking,
  operationalPolicy,
} from "../core/calendars/terms.js";
import { calculateItemTerm } from "../core/policies/provisional.js";

const ACTIVE_STATES = new Set([
  "ASIGNADA",
  "EN_EJECUCION",
  "INFORME_ENTREGADO",
  "APROBADO_PENDIENTE_ENVIO",
]);

export function createDemoService({
  repository,
  catalogService,
  clock = () => new Date().toISOString(),
  filePolicy = {},
}) {
  function bootstrap(auth) {
    const state = repository.snapshot();
    const requests = state.requests
      .map((request) => presentRequestForAuth(state, request, auth))
      .filter((request) => request.items.length > 0);
    const catalogAt = clock().slice(0, 10);
    const catalogAreas = ["INVESTIGACION", "VICTIMAS"].filter((area) =>
      hasCapability(auth, CAPABILITIES.CONSULTAR_CATALOGO_SERVICIOS, { area }),
    );
    const catalogServices = catalogAreas.flatMap((area) =>
      catalogService.listPublished(auth, { area, at: catalogAt }),
    );
    const visibleServiceIds = new Set(
      catalogServices.map((service) => service.id),
    );
    const catalogRelations = (
      state.catalogs.serviceSpecialtyRelations || []
    ).filter(
      (relation) =>
        visibleServiceIds.has(relation.serviceId) &&
        relation.status === "PUBLICADO" &&
        (!relation.validFrom || relation.validFrom <= catalogAt) &&
        (!relation.validTo || catalogAt < relation.validTo),
    );
    return {
      demo: true,
      filePolicy: {
        version: filePolicy.version,
        maxFileBytes: filePolicy.maxFileBytes,
        maxIntakeBytes: filePolicy.maxIntakeBytes,
        maxItemBytes: filePolicy.maxItemBytes,
        antivirus: Boolean(filePolicy.antimalwareCommand),
      },
      storage: {
        driver: repository.close ? "sqlite" : "memory",
        resettable: !repository.close,
      },
      provisionalRules:
        state.provisionalRules?.operationalEnabled !== false
          ? state.provisionalRules || null
          : null,
      productName:
        "SIGIP-DP — Gestión investigativa y pericial de la Defensoría del Pueblo",
      allowedAreas: allowedAreas(auth),
      authorization: {
        grants: auth.grants || [],
        proposedProfiles: PROPOSED_PROFILES,
      },
      operationContracts: OPERATION_CONTRACTS,
      catalogs: catalogsFor(state, auth, catalogAt),
      serviceCatalog: {
        specialties: structuredClone(
          state.catalogs.specialties.filter(
            (specialty) =>
              catalogAreas.includes(specialty.area) &&
              specialty.status === "PUBLICADO" &&
              (!specialty.validFrom || specialty.validFrom <= catalogAt) &&
              (!specialty.validTo || catalogAt < specialty.validTo),
          ),
        ),
        services: catalogServices,
        serviceSpecialtyRelations: structuredClone(catalogRelations),
      },
      parameters: DEMO_PARAMETERS,
      notifications: (state.outbox || []).filter(
        (entry) =>
          entry.recipientUserId === auth.sub &&
          requests.some((request) =>
            request.items.some((item) => item.id === entry.itemId),
          ),
      ),
      investigationPolicies: (state.investigationPolicies || []).map(
        ({ type, version, status, validFrom, validTo, approvalEvidence }) => ({
          type,
          version,
          status,
          validFrom,
          validTo,
          approvalEvidence,
        }),
      ),
      supervision: investigationSupervision({ state, auth, requests }),
      requests,
      dashboards: {
        INVESTIGACION: dashboard(requests, "INVESTIGACION"),
        VICTIMAS: dashboard(requests, "VICTIMAS"),
      },
    };
  }

  function createInvestigation(auth, payload) {
    assertCapability(auth, CAPABILITIES.CREAR_SOLICITUD_INVESTIGACION, {
      area: "INVESTIGACION",
      ownerUserId: auth.sub,
    });
    rejectClientAssignee(payload);
    return repository.transaction((state) => {
      const replay = intakeReplay(state, auth, payload, "INVESTIGACION");
      if (replay) return presentRequestForAuth(state, replay, auth);
      const at = clock();
      const intake = normalizeInvestigationIntake(state, payload, at);
      const requestedItems = normalizeRequestedItems(
        state,
        "INVESTIGACION",
        payload,
        at,
      );
      validateServiceRequirements(
        state,
        "INVESTIGACION",
        requestedItems,
        intake.documents,
        at,
      );
      const year = institutionalDate(at).slice(0, 4);
      state.counters.investigationByYear ||= {};
      const sequence =
        state.counters.investigationByYear[year] ||
        Math.max(
          0,
          ...state.requests
            .filter(
              (request) =>
                request.area === "INVESTIGACION" &&
                request.id.startsWith(`INV-${year}-`),
            )
            .map((request) => Number(request.id.split("-")[2]) || 0),
        ) + 1;
      state.counters.investigationByYear[year] = sequence + 1;
      const number = String(sequence).padStart(5, "0");
      const request = {
        id: `INV-${year}-${number}`,
        area: "INVESTIGACION",
        ownerUserId: auth.sub,
        externalId: intake.externalId,
        summary: intake.conduct,
        createdAt: at,
        requester: requesterSnapshot(state, auth),
        persons: intake.persons,
        caseData: intake.caseData,
        differentialApproach: intake.differentialApproach,
        priority: intake.priority,
        documents: intake.documents,
        items: requestedItems.map((requested, index) => {
          const service = serviceFromState(
            state,
            "INVESTIGACION",
            requested.service,
            at,
          );
          return {
            id: childItemId(`MT-${year}`, number, index, requestedItems.length),
            service: service.id,
            serviceVersion: service.version,
            specialtyIds: structuredClone(service.specialtyIds),
            region: requested.region,
            law: null,
            status: "RADICADA",
            assigneeId: null,
            dueDate: null,
            termSnapshot: structuredClone(service.termPolicy),
            activities: [],
            reportReference: null,
            products: [],
            assignment: null,
            exception: null,
            operations: [],
            timeline: [
              timelineEvent(
                at,
                null,
                "RADICADA",
                auth.sub,
                "Solicitud de misión radicada",
              ),
            ],
          };
        }),
      };
      request.versions = [
        requestSubmissionVersion({ request, version: 1, at, actor: auth.sub }),
      ];
      for (const item of request.items) {
        attemptInvestigationAssignment(state, item, at);
      }
      state.requests.unshift(request);
      recordIntake(state, auth, payload, request);
      enqueueWorkflowNotifications(state, request, at);
      return presentRequestForAuth(state, request, auth);
    });
  }

  function assignInvestigationItem(auth, itemId) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertCapability(auth, CAPABILITIES.REINTENTAR_REPARTO_EXCEPCION, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["PENDIENTE_EXCEPCION"]);
      const at = clock();
      attemptInvestigationAssignment(state, item, at);
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function startInvestigation(auth, itemId) {
    return executorTransition(
      auth,
      itemId,
      "INVESTIGACION",
      CAPABILITIES.EJECUTAR_ITEM_INVESTIGACION,
      ["ASIGNADA"],
      (item, at) => {
        transition(
          item,
          "EN_EJECUCION",
          auth.sub,
          "Misión iniciada por el profesional asignado",
          at,
        );
      },
    );
  }

  function progressInvestigation(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "INVESTIGACION",
      CAPABILITIES.EJECUTAR_ITEM_INVESTIGACION,
      ["EN_EJECUCION"],
      (item, at) => applyProgress(item, payload, auth.sub, at),
      payload,
    );
  }

  function deliverInvestigation(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "INVESTIGACION",
      CAPABILITIES.EJECUTAR_ITEM_INVESTIGACION,
      ["EN_EJECUCION"],
      (item, at) => {
        const delivery = normalizeDelivery(payload, "reference", {
          allowIris: true,
          maxFileBytes: filePolicy.maxFileBytes,
        });
        const { reference } = delivery;
        addProductVersion(item, {
          type: "INFORME_INVESTIGACION",
          ...delivery,
          reference,
          author: auth.sub,
          at,
          status: "ENTREGADO",
        });
        transition(
          item,
          "INFORME_ENTREGADO",
          auth.sub,
          "Informe entregado; pendiente de aprobación PAG",
          at,
        );
      },
      payload,
    );
  }

  function approveInvestigationDelivery(auth, itemId, payload = {}) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertCapability(auth, CAPABILITIES.APROBAR_INFORME_INVESTIGACION, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["INFORME_ENTREGADO"]);
      const at = clock();
      const reference = text(payload.verificationReference);
      if (
        !reference ||
        reference.length > 2000 ||
        payload.confirmReviewed !== true
      )
        throw businessError(
          "Confirme la revisión y registre la constancia del formulario de verificación",
        );
      item.verification = {
        reference,
        confirmedBy: auth.sub,
        confirmedAt: at,
        productId: item.products?.at(-1)?.id,
        mode: "CONSTANCIA_REFERENCIADA",
        signatureType: "REGISTRO_DE_USUARIO_NO_FIRMA_DIGITAL",
      };
      updateLatestProduct(item, "INFORME_INVESTIGACION", {
        status: "APROBADO",
        approvedAt: at,
        approvedBy: auth.sub,
      });
      transition(
        item,
        "APROBADO_PENDIENTE_ENVIO",
        auth.sub,
        "Entrega verificada y aprobada por PAG; pendiente constancia de envío al defensor",
        at,
      );
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function returnInvestigationDelivery(auth, itemId, payload) {
    const observation = text(payload.observation);
    if (!observation) {
      throw businessError("La observación de devolución es obligatoria");
    }
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "INVESTIGACION");
      assertCapability(auth, CAPABILITIES.APROBAR_INFORME_INVESTIGACION, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["INFORME_ENTREGADO"]);
      const at = clock();
      updateLatestProduct(item, "INFORME_INVESTIGACION", {
        status: "DEVUELTO",
        returnedAt: at,
        returnedBy: auth.sub,
        returnObservation: observation,
      });
      transition(
        item,
        "EN_EJECUCION",
        auth.sub,
        `Informe devuelto para corrección · ${observation}`,
        at,
      );
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function createVictims(auth, payload) {
    assertCapability(auth, CAPABILITIES.CREAR_SOLICITUD_VICTIMAS, {
      area: "VICTIMAS",
      ownerUserId: auth.sub,
    });
    rejectClientAssignee(payload);
    return repository.transaction((state) => {
      const replay = intakeReplay(state, auth, payload, "VICTIMAS");
      if (replay) return presentRequestForAuth(state, replay, auth);
      const at = clock();
      const intake = normalizeVictimsIntake(state, payload, at);
      assertUniqueVictimsExternalId(state, intake.externalId);
      const requestedItems = normalizeRequestedItems(
        state,
        "VICTIMAS",
        payload,
        at,
      );
      validateServiceRequirements(
        state,
        "VICTIMAS",
        requestedItems,
        intake.documents,
        at,
      );
      const year = institutionalDate(at).slice(0, 4);
      state.counters.victimsByYear ||= {};
      const sequence =
        state.counters.victimsByYear[year] ||
        (year === "2026" ? state.counters.victims : 1);
      state.counters.victimsByYear[year] = sequence + 1;
      const number = String(sequence).padStart(4, "0");
      const request = {
        id: `SVP-${year}-${number}`,
        area: "VICTIMAS",
        ownerUserId: auth.sub,
        externalId: intake.externalId,
        summary: `${requestedItems.length} servicio(s) · ${intake.law}`,
        createdAt: at,
        requester: requesterSnapshot(state, auth),
        persons: intake.persons,
        caseData: intake.caseData,
        documents: intake.documents,
        items: requestedItems.map((requested, index) => {
          const service = serviceFromState(
            state,
            "VICTIMAS",
            requested.service,
            at,
          );
          return {
            id: childItemId(
              "VIC-ITEM-PRE",
              number,
              index,
              requestedItems.length,
            ),
            service: service.id,
            serviceVersion: service.version,
            specialtyIds: structuredClone(service.specialtyIds),
            region: requested.region,
            law: requested.law || intake.law,
            status: "PENDIENTE_APROBACION_PAG",
            assigneeId: null,
            dueDate: null,
            termSnapshot: structuredClone(service.termPolicy),
            activities: [],
            reportReference: null,
            products: [],
            assignment: null,
            exception: null,
            operations: [],
            submissionVersion: 1,
            approvedSubmissionVersion: null,
            approval: null,
            timeline: [
              timelineEvent(
                at,
                null,
                "PENDIENTE_APROBACION_PAG",
                auth.sub,
                "Solicitud pericial enviada a aprobación previa",
              ),
            ],
          };
        }),
      };
      request.versions = [
        victimsSubmissionVersion({
          request,
          version: 1,
          at,
          actor: auth.sub,
          correctionSummary: null,
        }),
      ];
      state.requests.unshift(request);
      recordIntake(state, auth, payload, request);
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function approveVictimsAndAssign(auth, itemId) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      assertCapability(auth, CAPABILITIES.AVALAR_SOLICITUD_VICTIMAS, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["PENDIENTE_APROBACION_PAG"]);
      const at = clock();
      ensureVictimsVersions(request);
      const approvedVersion =
        item.submissionVersion || request.versions.at(-1).version;
      const approvedSnapshot = request.versions.find(
        (version) => version.version === approvedVersion,
      );
      if (!approvedSnapshot) {
        throw businessError(
          "No existe la versión de solicitud sometida a aprobación",
        );
      }
      item.approvedSubmissionVersion = approvedVersion;
      item.completeSubmissionAt = approvedSnapshot.submittedAt;
      item.approval = { at, actor: auth.sub, requestVersion: approvedVersion };
      approvedSnapshot.reviews ||= [];
      approvedSnapshot.reviews.push({
        itemId: item.id,
        decision: "APROBADA",
        at,
        actor: auth.sub,
      });
      transition(
        item,
        "APROBADA_REPARTO",
        auth.sub,
        "Aprobación previa PAG Víctimas",
        at,
      );
      const assignment = assignVictims({
        professionals: professionalsWithLoad(state),
        continuationAssigneeId: item.continuationAssigneeId || null,
        serviceId: item.service,
        specialtyIds: item.specialtyIds,
        region: item.region,
        law: item.law,
        now: at,
      });
      item.assignment = assignment;
      if (!assignment.selectedId) {
        item.exception = {
          type: "FALTA_CANDIDATO",
          createdAt: at,
          assignmentPolicyVersion: assignment.policyVersion,
          reason: assignment.selectedReason,
        };
        transition(
          item,
          "PENDIENTE_EXCEPCION",
          "motor-reparto",
          assignment.selectedReason,
          at,
        );
      } else {
        item.exception = null;
        item.assigneeId = assignment.selectedId;
        calculateItemTerm(state, item, at, request);
        recordAssignmentInstant(state, assignment.selectedId, at);
        transition(
          item,
          "ASIGNADA",
          "motor-reparto",
          assignment.selectedReason,
          at,
        );
      }
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function returnVictimsRequest(auth, itemId, payload) {
    const observation = text(payload.observation);
    if (!observation) {
      throw businessError("La observación de devolución es obligatoria");
    }

    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      assertCapability(auth, CAPABILITIES.AVALAR_SOLICITUD_VICTIMAS, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      assertState(item, ["PENDIENTE_APROBACION_PAG"]);
      ensureVictimsVersions(request);
      const at = clock();
      const currentVersion = versionForVictimsItem(request, item);
      currentVersion.reviews ||= [];
      currentVersion.reviews.push({
        itemId: item.id,
        decision: "DEVUELTA",
        observation,
        at,
        actor: auth.sub,
      });
      transition(
        item,
        "DEVUELTA",
        auth.sub,
        `Solicitud devuelta al RJV · ${observation}`,
        at,
      );
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function correctAndResubmitVictims(auth, itemId, payload) {
    const correctionSummary = text(payload.correctionSummary);
    if (!correctionSummary) {
      throw businessError("La descripción de la corrección es obligatoria");
    }

    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      assertCapability(auth, CAPABILITIES.CORREGIR_SOLICITUD_VICTIMAS, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      const correctionId = text(payload.submissionId);
      if (correctionId.length > 100)
        throw businessError("Identificador de envío no válido");
      const correctionFingerprint = createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");
      const prior = (item.confirmedSubmissions || []).find(
        (entry) => entry.id === correctionId && entry.actor === auth.sub,
      );
      if (correctionId && prior) {
        if (prior.fingerprint !== correctionFingerprint)
          throw new AppError(
            409,
            "SUBMISSION_CONFLICT",
            "El identificador ya se utilizó con otra corrección",
          );
        return presentRequestForAuth(state, request, auth);
      }
      assertState(item, ["DEVUELTA"]);
      ensureVictimsVersions(request);

      const at = clock();
      const returnedVersion = versionForVictimsItem(request, item);
      const corrected = correctedVictimsData(state, request, item, payload, at);
      const correctionChanges = victimsCorrectionChanges(
        victimsCorrectionData(returnedVersion.data, item.id),
        corrected,
      );
      if (!correctionChanges.length) {
        throw businessError(
          "Realice al menos un cambio en la información devuelta antes de reenviar",
        );
      }
      assertUniqueVictimsExternalId(state, corrected.externalId, request.id);
      const service = serviceFromState(
        state,
        "VICTIMAS",
        corrected.service,
        at,
      );
      request.externalId = corrected.externalId;
      request.summary = `${request.items.length} servicio(s) · ${corrected.law}`;
      request.persons = corrected.persons;
      request.caseData = corrected.caseData;
      request.documents = corrected.documents;
      item.service = corrected.service;
      item.serviceVersion = service.version;
      item.specialtyIds = structuredClone(service.specialtyIds);
      item.termSnapshot = structuredClone(service.termPolicy);
      item.region = corrected.region;
      item.law = corrected.law;
      item.assigneeId = null;
      item.assignment = null;
      item.exception = null;
      item.dueDate = null;
      validateServiceRequirements(
        state,
        "VICTIMAS",
        [
          {
            service: corrected.service,
            region: corrected.region,
            law: corrected.law,
          },
        ],
        corrected.documents,
        at,
      );
      const newVersion =
        Math.max(...request.versions.map((entry) => entry.version)) + 1;
      item.submissionVersion = newVersion;
      item.approvedSubmissionVersion = null;
      item.approval = null;
      request.versions.push(
        victimsSubmissionVersion({
          request,
          version: newVersion,
          at,
          actor: auth.sub,
          correctionSummary,
          correction: {
            itemId: item.id,
            baseVersion: returnedVersion.version,
            changes: correctionChanges,
          },
        }),
      );
      transition(
        item,
        "PENDIENTE_APROBACION_PAG",
        auth.sub,
        `Solicitud corregida y reenviada · ${correctionSummary}`,
        at,
      );
      if (correctionId) {
        item.confirmedSubmissions ||= [];
        item.confirmedSubmissions.push({
          id: correctionId,
          actor: auth.sub,
          fingerprint: correctionFingerprint,
        });
      }
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function startVictims(auth, itemId) {
    return executorTransition(
      auth,
      itemId,
      "VICTIMAS",
      CAPABILITIES.EJECUTAR_ITEM_VICTIMAS,
      ["ASIGNADA"],
      (item, at) => {
        transition(item, "EN_EJECUCION", auth.sub, "Peritaje iniciado", at);
      },
    );
  }

  function requestVictimsFollowUp(auth, itemId, payload) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, "VICTIMAS");
      assertCapability(auth, CAPABILITIES.SOLICITAR_AMPLIACION, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        region: item.region,
      });
      if (
        !state.provisionalRules ||
        state.provisionalRules.operationalEnabled === false
      )
        throw new AppError(
          409,
          "PENDING_FUNCTIONAL_DECISION",
          "Falta la política de continuación pericial",
        );
      rejectClientAssignee(payload);
      const submissionId = text(payload.submissionId);
      if (!submissionId || submissionId.length > 100)
        throw businessError("Identificador de envío obligatorio");
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");
      const previous = (item.followUpSubmissions || []).find(
        (entry) => entry.id === submissionId && entry.actor === auth.sub,
      );
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new AppError(
            409,
            "SUBMISSION_CONFLICT",
            "El envío ya corresponde a otra operación",
          );
        enqueueWorkflowNotifications(state, request, clock());
        return presentRequestForAuth(state, request, auth);
      }
      assertState(item, ["CERRADA"]);
      const kind = text(payload.kind);
      if (!["AMPLIACION", "ACTUALIZACION_F171"].includes(kind))
        throw businessError("Tipo de continuación no válido");
      const reason = text(payload.reason),
        supportReference = text(payload.supportReference);
      if (
        !reason ||
        !supportReference ||
        reason.length > 10000 ||
        supportReference.length > 2000
      )
        throw businessError("Registre motivo y soporte de la continuación");
      if (
        request.items.some(
          (entry) =>
            entry.originItemId === item.id &&
            !["CERRADA", "IMPROCEDENTE"].includes(entry.status),
        )
      )
        throw new AppError(
          409,
          "FOLLOW_UP_PENDING",
          "Ya existe una continuación activa para este encargo",
        );
      const at = clock();
      const service = serviceFromState(state, "VICTIMAS", item.service, at);
      const added = payload.additionalPersons || [];
      if (!Array.isArray(added))
        throw businessError("Personas adicionales no válidas");
      const persons = [
        ...structuredClone(request.persons || []),
        ...normalizeVictimsPersons(added),
      ];
      if (
        new Set(persons.map((entry) => entry.alias.trim().toLowerCase()))
          .size !== persons.length
      )
        throw businessError("No repita personas ya vinculadas");
      validateServiceRequirements(
        state,
        "VICTIMAS",
        [{ service: service.id, law: item.law, region: item.region }],
        request.documents?.length
          ? request.documents
          : [{ type: "FORMATO_SOLICITUD", reference: supportReference }],
        at,
      );
      const version =
        Math.max(...request.versions.map((entry) => entry.version)) + 1;
      const child = {
        id: `${request.id}-CONT-${String(request.items.filter((entry) => entry.originItemId).length + 1).padStart(2, "0")}`,
        originItemId: item.id,
        originProductId: item.products?.at(-1)?.id,
        followUpKind: kind,
        continuationAssigneeId: item.assigneeId,
        continuationReason: reason,
        supportReference,
        service: service.id,
        serviceVersion: service.version,
        specialtyIds: structuredClone(service.specialtyIds),
        region: item.region,
        law: item.law,
        status: "PENDIENTE_APROBACION_PAG",
        assigneeId: null,
        dueDate: null,
        termSnapshot: structuredClone(service.termPolicy),
        completeSubmissionAt: at,
        activities: [],
        products: [],
        operations: [],
        timeline: [],
        assignment: null,
        exception: null,
        submissionVersion: version,
        approvedSubmissionVersion: null,
        policySnapshot: structuredClone(state.provisionalRules),
      };
      request.persons = persons;
      request.documents ||= [
        { type: "FORMATO_SOLICITUD", reference: supportReference },
      ];
      request.items.push(child);
      request.versions.push(
        victimsSubmissionVersion({
          request,
          version,
          at,
          actor: auth.sub,
          correctionSummary: `${kind}: ${reason}`,
        }),
      );
      transition(
        child,
        "PENDIENTE_APROBACION_PAG",
        auth.sub,
        `Continuación vinculada a ${item.id}; revisión previa y continuidad del perito`,
        at,
      );
      item.followUpSubmissions ||= [];
      item.followUpSubmissions.push({
        id: submissionId,
        fingerprint,
        actor: auth.sub,
      });
      state.audit.push({
        type: kind,
        area: request.area,
        actor: auth.sub,
        at,
        requestId: request.id,
        itemId: child.id,
        originItemId: item.id,
      });
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function progressVictims(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "VICTIMAS",
      CAPABILITIES.EJECUTAR_ITEM_VICTIMAS,
      ["EN_EJECUCION"],
      (item, at) => applyProgress(item, payload, auth.sub, at),
      payload,
    );
  }

  function finishVictims(auth, itemId, payload) {
    return executorTransition(
      auth,
      itemId,
      "VICTIMAS",
      CAPABILITIES.EJECUTAR_ITEM_VICTIMAS,
      ["EN_EJECUCION"],
      (item, at) => {
        const delivery = normalizeDelivery(payload, "f171Reference", {
          maxFileBytes: filePolicy.maxFileBytes,
        });
        const { reference } = delivery;
        addProductVersion(item, {
          type: "F171",
          ...(payload.f171
            ? { formatMetadata: f171Metadata(payload.f171, at) }
            : {}),
          ...delivery,
          reference,
          author: auth.sub,
          at,
          status: "REGISTRADO",
        });
        transition(
          item,
          "CERRADA",
          auth.sub,
          "F-171 registrado; cierre directo sin aprobación final ordinaria PAG",
          at,
        );
      },
      payload,
    );
  }

  function productDocument(auth, area, itemId, productId) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, area.toUpperCase());
      assertCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, {
        area: request.area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      if (
        request.area === "VICTIMAS" &&
        !canReadVictimsProduct(auth, request, item)
      ) {
        throw new AppError(
          403,
          "RESERVED_VICTIMS_PRODUCT",
          "El F171 está reservado al RJV titular y al perito asignado",
        );
      }
      const product = item.products?.find((entry) => entry.id === productId);
      if (!product?.attachment?.contentBase64)
        throw new AppError(404, "DOCUMENT_NOT_FOUND", "PDF no encontrado");
      item.timeline.push(
        timelineEvent(
          clock(),
          item.status,
          item.status,
          auth.sub,
          "Consulta del PDF · versión " + product.version,
        ),
      );
      return {
        name: product.attachment.name,
        contentBase64: product.attachment.contentBase64,
      };
    });
  }

  function reset(auth) {
    assertCapability(auth, CAPABILITIES.RESTABLECER_PRESENTACION, {
      area: "AMBAS",
    });
    repository.reset();
    return bootstrap(auth);
  }

  function registerOperation(auth, areaParam, itemId, typeParam, payload) {
    const area = normalizeAreaPath(areaParam);
    const type = text(typeParam).toUpperCase();
    const contract = OPERATION_CONTRACTS[type];
    if (!contract || !contract.areas.includes(area)) {
      throw new AppError(
        404,
        "OPERATION_CONTRACT_NOT_FOUND",
        "Contrato operativo no encontrado",
      );
    }
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, area);
      assertCapability(auth, contract.capability, {
        area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      const submissionId =
        type === "IMPROCEDENCIA" ? text(payload.submissionId) : "";
      if (submissionId.length > 100)
        throw businessError("Identificador de envío no válido");
      const fingerprint = submissionId
        ? createHash("sha256")
            .update(JSON.stringify({ type, payload }))
            .digest("hex")
        : null;
      const previous =
        submissionId &&
        (item.operations || []).find(
          (entry) =>
            entry.submissionId === submissionId && entry.actor === auth.sub,
        );
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new AppError(
            409,
            "SUBMISSION_CONFLICT",
            "El envío ya corresponde a otra operación",
          );
        enqueueWorkflowNotifications(state, request, clock());
        return presentRequestForAuth(state, request, auth);
      }
      if (!contract.enabled) {
        throw new AppError(
          409,
          "PENDING_FUNCTIONAL_DECISION",
          `Operación deshabilitada hasta resolver ${contract.decisionCode}`,
          { decisionCode: contract.decisionCode, reason: contract.reason },
        );
      }
      assertState(item, contract.allowedStates);
      for (const field of contract.requiredFields) {
        if (!text(payload[field])) {
          throw businessError(`El campo ${field} es obligatorio`);
        }
        if (type === "IMPROCEDENCIA" && text(payload[field]).length > 10000)
          throw businessError(
            "La constancia admite hasta 10.000 caracteres por campo",
          );
      }
      const at = clock();
      const operation = {
        id: `OP-${String(state.operations.length + 1).padStart(4, "0")}`,
        type,
        area,
        requestId: request.id,
        itemId: item.id,
        status: "REGISTRADO",
        reason: text(payload.reason),
        description: text(payload.description),
        supportReference: text(payload.supportReference),
        actor: auth.sub,
        createdAt: at,
        decisionCode: null,
        primaryStatusSnapshot: item.status,
        ...(submissionId ? { submissionId, fingerprint } : {}),
        routing:
          type === "IMPROCEDENCIA"
            ? {
                status: "EN_BANDEJA",
                recipientUserId: request.ownerUserId,
                recipientRole: "rjv",
                emailStatus: "PENDIENTE_CONFIGURACION",
              }
            : problemRouting(state, request, item, at),
      };
      item.operations ||= [];
      item.operations.push(operation);
      state.operations.push(operation);
      if (type === "IMPROCEDENCIA") {
        transition(
          item,
          "IMPROCEDENTE",
          auth.sub,
          "Improcedencia declarada por el perito; constancia disponible para el RJV",
          at,
        );
      } else
        item.timeline.push(
          timelineEvent(
            at,
            item.status,
            item.status,
            auth.sub,
            `Problema reportado · ${operation.reason}`,
          ),
        );
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  function executorTransition(
    auth,
    itemId,
    area,
    capability,
    states,
    mutate,
    payload = {},
  ) {
    return repository.transaction((state) => {
      const { request, item } = findItem(state, itemId, area);
      assertCapability(auth, capability, {
        area,
        ownerUserId: request.ownerUserId,
        assigneeId: item.assigneeId,
        region: item.region,
      });
      const submissionId = text(payload.submissionId);
      if (submissionId.length > 100)
        throw businessError("Identificador de envío no válido");
      const fingerprint = createHash("sha256")
        .update(JSON.stringify({ capability, states, payload }))
        .digest("hex");
      const previous = (item.confirmedSubmissions || []).find(
        (entry) => entry.id === submissionId && entry.actor === auth.sub,
      );
      if (submissionId && previous) {
        if (previous.fingerprint !== fingerprint)
          throw new AppError(
            409,
            "SUBMISSION_CONFLICT",
            "El identificador de envío ya corresponde a otra operación",
          );
        enqueueWorkflowNotifications(state, request, clock());
        return presentRequestForAuth(state, request, auth);
      }
      assertState(item, states);
      mutate(item, clock());
      if (submissionId) {
        item.confirmedSubmissions ||= [];
        item.confirmedSubmissions.push({
          id: submissionId,
          actor: auth.sub,
          fingerprint,
        });
      }
      enqueueWorkflowNotifications(state, request, clock());
      return presentRequestForAuth(state, request, auth);
    });
  }

  return {
    requestVictimsExtension(auth, itemId, payload) {
      return createTermExtensions({
        ...createAdjustmentContext({
          repository,
          clock,
          findItem,
          present: presentRequestForAuth,
          area: "VICTIMAS",
        }),
        area: "VICTIMAS",
      }).requestExtension(auth, itemId, payload);
    },
    decideVictimsExtension(auth, itemId, payload) {
      return createTermExtensions({
        ...createAdjustmentContext({
          repository,
          clock,
          findItem,
          present: presentRequestForAuth,
          area: "VICTIMAS",
        }),
        area: "VICTIMAS",
      }).decideExtension(auth, itemId, payload);
    },
    ...createInvestigationAdjustments({
      repository,
      clock,
      findItem,
      present: (state, request, auth) => {
        enqueueWorkflowNotifications(state, request, clock());
        return presentRequestForAuth(state, request, auth);
      },
      assign: attemptInvestigationAssignment,
      serviceFor: serviceFromState,
      validateRequirements: validateServiceRequirements,
    }),
    exportInvestigation(auth, filters) {
      return repository.transaction((state) => {
        const requests = state.requests
          .map((request) => presentRequestForAuth(state, request, auth))
          .filter((request) => request.items.length);
        return investigationExport({
          state,
          auth,
          requests,
          filters,
          at: clock(),
          supervision: investigationSupervision({ state, auth, requests }),
        });
      });
    },
    bootstrap,
    productDocument,
    intakeDocument(auth, areaPath, itemId, index, version) {
      return repository.transaction((state) => {
        const { request, item } = findItem(
          state,
          itemId,
          normalizeAreaPath(areaPath),
        );
        assertCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, {
          area: request.area,
          region: item.region,
          ownerUserId: request.ownerUserId,
          assigneeId: item.assigneeId,
        });
        const currentAccess = hasCapability(
          auth,
          CAPABILITIES.CONSULTAR_SOLICITUDES,
          {
            area: request.area,
            region: item.region,
            ownerUserId: request.ownerUserId,
          },
        );
        const requestedVersion = version
          ? Number(version)
          : currentAccess
            ? request.versions.at(-1).version
            : item.approvedSubmissionVersion;
        if (
          !currentAccess &&
          request.area === "VICTIMAS" &&
          requestedVersion !== item.approvedSubmissionVersion
        )
          throw new AppError(
            403,
            "DOCUMENT_VERSION_FORBIDDEN",
            "Sólo puede consultar la versión aprobada de su encargo",
          );
        const data = request.versions.find(
          (entry) => entry.version === requestedVersion,
        )?.data;
        const document = data?.documents?.[Number(index)];
        if (
          !/^\d+$/.test(String(index)) ||
          !document?.attachment ||
          document.attachment.kind !== "PDF"
        )
          throw new AppError(
            404,
            "DOCUMENT_NOT_FOUND",
            "Archivo documental no disponible",
          );
        state.audit.push({
          type: "CONSULTA_DOCUMENTO_SOLICITUD",
          actor: auth.sub,
          at: clock(),
          requestId: request.id,
          itemId,
          version: requestedVersion,
          index: Number(index),
        });
        return {
          name: document.attachment.name,
          contentBase64: document.attachment.contentBase64,
        };
      });
    },
    createInvestigation,
    assignInvestigationItem,
    startInvestigation,
    progressInvestigation,
    deliverInvestigation,
    approveInvestigationDelivery,
    returnInvestigationDelivery,
    createVictims,
    approveVictimsAndAssign,
    returnVictimsRequest,
    correctAndResubmitVictims,
    requestVictimsFollowUp,
    startVictims,
    progressVictims,
    finishVictims,
    registerOperation,
    reset,
  };
}

function allowedAreas(auth) {
  const now = new Date().toISOString();
  const areas = new Set();
  for (const grant of auth.grants || []) {
    if (
      (grant.validFrom && now < grant.validFrom) ||
      (grant.validTo && now >= grant.validTo)
    ) {
      continue;
    }
    if (grant.area === "AMBAS" || grant.scopeType === "SYSTEM") {
      areas.add("INVESTIGACION");
      areas.add("VICTIMAS");
    } else if (["INVESTIGACION", "VICTIMAS"].includes(grant.area)) {
      areas.add(grant.area);
    }
  }
  return [...areas];
}

function professionalsWithLoad(state) {
  const activeByProfessional = new Map();
  for (const request of state.requests) {
    for (const item of request.items) {
      if (item.assigneeId && ACTIVE_STATES.has(item.status)) {
        activeByProfessional.set(
          item.assigneeId,
          (activeByProfessional.get(item.assigneeId) || 0) + 1,
        );
      }
    }
  }
  return state.professionals.map((professional) => ({
    ...professional,
    load:
      professional.demoBaseLoad +
      (activeByProfessional.get(professional.id) || 0),
  }));
}

function attemptInvestigationAssignment(state, item, at) {
  const assignment = assignInvestigation({
    professionals: professionalsWithLoad(state),
    serviceId: item.service,
    specialtyIds: item.specialtyIds,
    region: item.region,
    now: at,
  });
  item.assignment = assignment;
  if (!assignment.selectedId) {
    item.assigneeId = null;
    item.dueDate = null;
    item.exception = {
      type: "FALTA_CANDIDATO",
      createdAt: at,
      assignmentPolicyVersion: assignment.policyVersion,
      reason: assignment.selectedReason,
    };
    transition(
      item,
      "PENDIENTE_EXCEPCION",
      "motor-reparto",
      assignment.selectedReason,
      at,
    );
    return;
  }
  item.assigneeId = assignment.selectedId;
  item.dueDate = null;
  if (operationalPolicy(item.termSnapshot)) {
    const policy = item.termSnapshot;
    const date = institutionalDate(at);
    if (
      !policy.version ||
      !policy.validFrom ||
      policy.validFrom > date ||
      (policy.validTo && date >= policy.validTo) ||
      policy.startEvent !== "ASIGNACION"
    )
      throw new AppError(
        409,
        "TERM_POLICY_NOT_APPLICABLE",
        "El plazo requiere versión, vigencia y evento inicial de asignación aprobado",
      );
    const calendar = (state.calendars || []).find(
      (entry) =>
        entry.id === policy.calendarId &&
        entry.version === policy.calendarVersion,
    );
    item.dueDate = addTermDays(
      institutionalDate(at),
      policy.value,
      policy.dayType,
      calendar,
    );
    item.calendarSnapshot = structuredClone(calendar);
  }
  item.exception = null;
  recordAssignmentInstant(state, assignment.selectedId, at);
  transition(item, "ASIGNADA", "motor-reparto", assignment.selectedReason, at);
}

function requesterSnapshot(state, auth) {
  const user = state.users.find((candidate) => candidate.id === auth.sub);
  return {
    userId: auth.sub,
    fullName: user?.fullName || auth.fullName || "Solicitante",
    role: auth.role,
    email: auth.email || null,
    region: auth.region || null,
  };
}

function requestSubmissionVersion({ request, version, at, actor }) {
  return {
    version,
    submittedAt: at,
    submittedBy: actor,
    correctionSummary: null,
    data: {
      externalId: request.externalId,
      requester: structuredClone(request.requester),
      persons: structuredClone(request.persons),
      caseData: structuredClone(request.caseData),
      differentialApproach: structuredClone(request.differentialApproach),
      priority: structuredClone(request.priority),
      documents: structuredClone(request.documents),
      items: request.items.map((item) => ({
        id: item.id,
        service: item.service,
        serviceVersion: item.serviceVersion,
        region: item.region,
      })),
    },
  };
}

function recordAssignmentInstant(state, professionalId, at) {
  const professional = state.professionals.find(
    (candidate) => candidate.id === professionalId,
  );
  if (professional) professional.lastAssignmentAt = at;
}

function presentRequest(state, request) {
  const professionals = new Map(
    state.professionals.map((professional) => [professional.id, professional]),
  );
  const users = new Map(state.users.map((user) => [user.id, user.fullName]));
  return {
    ...structuredClone(request),
    ...(request.area === "INVESTIGACION"
      ? {
          displayNumber: request.id.replace(
            /^INV-(\d{4})-(\d+)$/,
            (_, year, number) => `${year}-${number.padStart(5, "0")}`,
          ),
        }
      : {}),
    requesterName: users.get(request.ownerUserId) || "Solicitante",
    aggregateStatus:
      request.aggregateStatus || aggregateRequestStatus(request.items),
    aggregateCounts:
      request.aggregateCounts || aggregateRequestCounts(request.items),
    items: request.items.map((item) => {
      const approvedRequestData =
        request.area === "VICTIMAS" && item.approvedSubmissionVersion
          ? presentedVictimsVersionData(
              state,
              request,
              item.approvedSubmissionVersion,
            )
          : null;
      return {
        ...structuredClone(item),
        ...(request.area === "VICTIMAS"
          ? {
              assignedDiscipline:
                professionals
                  .get(item.assigneeId)
                  ?.specialties?.find((id) => id.startsWith("DISC_VIC_")) ||
                null,
            }
          : {}),
        confirmedSubmissions: undefined,
        adjustmentSubmissions: undefined,
        followUpSubmissions: undefined,
        followUpAvailable:
          request.area === "VICTIMAS" &&
          Boolean(state.provisionalRules) &&
          state.provisionalRules.operationalEnabled !== false &&
          item.status === "CERRADA",
        assigneeName: professionals.get(item.assigneeId)?.displayName || null,
        serviceLabel:
          serviceFromStateById(state, item.service)?.name || item.service,
        specialtyLabels: (item.specialtyIds || []).map(
          (id) =>
            state.catalogs.specialties.find((entry) => entry.id === id)?.name ||
            id,
        ),
        regionLabel: catalogLabel(state.catalogs.regions, item.region),
        lawLabel: item.law ? catalogLabel(state.catalogs.laws, item.law) : null,
        tracking: termTracking(item),
        products: presentedProducts(request.area, item),
        documents: presentedProducts(request.area, item),
        submittedRequestData:
          request.area === "VICTIMAS"
            ? submittedVictimsData(request, item)
            : null,
        pagObservations:
          request.area === "VICTIMAS"
            ? victimsPagObservations(request, item.id)
            : [],
        correctionHistory:
          request.area === "VICTIMAS"
            ? victimsCorrectionHistory(request, item.id)
            : [],
        nextSubmissionVersion:
          request.area === "VICTIMAS"
            ? Math.max(
                0,
                ...(request.versions || []).map((entry) => entry.version),
              ) + 1
            : null,
        approvedRequestData,
        applicableRequestData: approvedRequestData
          ? structuredClone(approvedRequestData)
          : null,
      };
    }),
  };
}

function presentRequestForAuth(state, request, auth) {
  const visibleItems = request.items.filter((item) =>
    hasCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, {
      area: request.area,
      ownerUserId: request.ownerUserId,
      assigneeId: item.assigneeId,
      region: item.region,
    }),
  );
  const presented = presentRequest(state, {
    ...request,
    aggregateStatus: aggregateRequestStatus(request.items),
    aggregateCounts: aggregateRequestCounts(request.items),
    items: visibleItems,
  });
  if (request.area === "VICTIMAS") {
    for (const item of presented.items) {
      if (!canReadVictimsProduct(auth, request, item)) {
        const metadata = (item.products || []).map(
          ({ id, type, version, author, createdAt, status }) => ({
            id,
            type,
            version,
            author,
            createdAt,
            status,
            reserved: true,
          }),
        );
        item.products = metadata;
        item.documents = metadata;
        item.reportReference = item.products.length ? "F171 reservado" : null;
      }
    }
  }
  return JSON.parse(
    JSON.stringify(
      projectRequestForAuth(presented, request, auth),
      (key, value) => (key === "contentBase64" ? undefined : value),
    ),
  );
}

function canReadVictimsProduct(auth, request, item) {
  const context = {
    area: "VICTIMAS",
    ownerUserId: request.ownerUserId,
    assigneeId: item.assigneeId,
    region: item.region,
  };
  return (
    (auth.sub === request.ownerUserId ||
      Boolean(auth.executorId && auth.executorId === item.assigneeId)) &&
    hasCapability(auth, CAPABILITIES.CONSULTAR_SOLICITUDES, context)
  );
}

function ensureVictimsVersions(request) {
  if (!request.versions?.length) {
    request.versions = [
      victimsSubmissionVersion({
        request,
        version: 1,
        at: request.createdAt,
        actor: request.ownerUserId,
        correctionSummary: null,
      }),
    ];
  }
  for (const item of request.items) {
    item.submissionVersion ||= 1;
    item.approvedSubmissionVersion ||= [
      "APROBADA_REPARTO",
      "ASIGNADA",
      "EN_EJECUCION",
      "CERRADA",
    ].includes(item.status)
      ? 1
      : null;
  }
}

function victimsSubmissionVersion({
  request,
  version,
  at,
  actor,
  correctionSummary,
  correction = null,
}) {
  return {
    version,
    submittedAt: at,
    submittedBy: actor,
    correctionSummary,
    correction: structuredClone(correction),
    reviews: [],
    data: {
      externalId: request.externalId,
      persons: structuredClone(request.persons || []),
      caseData: structuredClone(request.caseData || null),
      documents: structuredClone(request.documents || []),
      items: request.items.map((item) => ({
        id: item.id,
        service: item.service,
        serviceVersion: item.serviceVersion,
        region: item.region,
        law: item.law,
      })),
    },
  };
}

function correctedVictimsData(state, request, item, payload, at) {
  if (
    payload.externalId !== undefined &&
    typeof payload.externalId !== "string"
  )
    throw businessError("El identificador judicial debe enviarse como texto");
  const submitted = victimsCorrectionData(
    versionForVictimsItem(request, item).data,
    item.id,
  );
  const externalId = text(payload.externalId ?? submitted.externalId);
  const law = text(payload.law ?? submitted.law);
  const service = text(payload.service ?? submitted.service);
  const region = text(payload.region ?? submitted.region);
  const persons = payload.persons
    ? normalizeVictimsPersons(payload.persons)
    : structuredClone(submitted.persons || []);
  const caseData = payload.caseData
    ? normalizeVictimsCaseData(payload.caseData)
    : structuredClone(submitted.caseData || {});
  const documents = payload.documents
    ? normalizeDocuments(
        state,
        payload.documents.map((document) => {
          if (
            !document.file &&
            document.attachment?.kind === "PDF" &&
            !document.attachment.contentBase64
          ) {
            const original = submitted.documents?.find(
              (entry) =>
                entry.type === document.type &&
                entry.reference === document.reference &&
                entry.attachment?.sha256 === document.attachment.sha256,
            );
            if (!original)
              throw businessError(
                "El archivo previo no corresponde a la versión devuelta",
              );
            return structuredClone(original);
          }
          return document;
        }),
        "VICTIMAS",
        at,
      )
    : structuredClone(submitted.documents || []);
  validateVictimsAnnexes(documents, law);
  validateExternalIdPolicy(state, "VICTIMAS", externalId, at);
  requireReference(
    state,
    "laws",
    law,
    "VICTIMAS",
    at,
    "Ley o programa no válido",
  );
  serviceFromState(state, "VICTIMAS", service, at);
  requireReference(
    state,
    "regions",
    region,
    "VICTIMAS",
    at,
    "Cobertura no válida",
  );
  if (persons.length < 1) {
    throw businessError("Registre al menos una persona vinculada");
  }
  return { externalId, law, service, region, persons, caseData, documents };
}

function victimsCorrectionData(versionData, itemId) {
  const item = (versionData?.items || []).find(
    (candidate) => candidate.id === itemId,
  );
  if (!item) {
    throw businessError("La versión devuelta no contiene el ítem a corregir");
  }
  return {
    externalId: versionData.externalId,
    law: item.law,
    caseData: structuredClone(versionData.caseData || {}),
    persons: structuredClone(versionData.persons || []),
    service: item.service,
    region: item.region,
    documents: structuredClone(versionData.documents || []),
  };
}

function victimsCorrectionChanges(before, after) {
  const fields = [
    [
      "externalId",
      "Identificador externo",
      before.externalId,
      after.externalId,
    ],
    ["law", "Ley o programa", before.law, after.law],
    [
      "caseData.processReference",
      "Proceso",
      before.caseData?.processReference,
      after.caseData?.processReference,
    ],
    [
      "caseData.hearingApplies",
      "Aplica audiencia",
      Boolean(before.caseData?.hearingApplies),
      Boolean(after.caseData?.hearingApplies),
    ],
    [
      "caseData.hearingDate",
      "Fecha de audiencia",
      before.caseData?.hearingDate || null,
      after.caseData?.hearingDate || null,
    ],
    ["caseData.facts", "Hechos", before.caseData?.facts, after.caseData?.facts],
    ...[
      ["judicialAuthority", "Autoridad judicial"],
      ["defendantName", "Procesado o postulado"],
      ["requestedMeasures", "Pretensiones"],
      ["hearingPlace", "Lugar de audiencia"],
      ["sentenceDate", "Fecha de sentencia"],
    ].map(([field, label]) => [
      `caseData.${field}`,
      label,
      before.caseData?.[field],
      after.caseData?.[field],
    ]),
    ["persons", "Personas vinculadas", before.persons, after.persons],
    ["service", "Servicio", before.service, after.service],
    ["region", "Cobertura", before.region, after.region],
    ["documents", "Documentos", before.documents, after.documents],
  ];
  return fields
    .filter(([, , previous, next]) => !sameValue(previous, next))
    .map(([field, label, previous, next]) => ({
      field,
      label,
      previous: structuredClone(previous ?? null),
      next: structuredClone(next ?? null),
    }));
}

function sameValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function submittedVictimsData(request, item) {
  const version = (request.versions || []).find(
    (candidate) => candidate.version === item.submissionVersion,
  );
  return version ? victimsCorrectionData(version.data, item.id) : null;
}

function presentedVictimsVersionData(state, request, versionNumber) {
  const data = structuredClone(
    request.versions?.find((version) => version.version === versionNumber)
      ?.data || null,
  );
  if (!data) return null;
  data.items = (data.items || []).map((item) => {
    const service = state.catalogs.services.find(
      (entry) => entry.id === item.service,
    );
    const specialtyIds = (state.catalogs.serviceSpecialtyRelations || [])
      .filter(
        (relation) =>
          relation.serviceId === item.service &&
          relation.status === "PUBLICADO",
      )
      .map((relation) => relation.specialtyId);
    return {
      ...item,
      serviceLabel: service?.name || item.service,
      specialtyLabels: specialtyIds.map(
        (id) =>
          state.catalogs.specialties.find((entry) => entry.id === id)?.name ||
          id,
      ),
      regionLabel:
        catalogLabel(state.catalogs.regions, item.region) || item.region,
      lawLabel: catalogLabel(state.catalogs.laws, item.law) || item.law,
    };
  });
  data.documents = (data.documents || []).map((document) => ({
    ...document,
    typeLabel:
      catalogLabel(state.catalogs.documentTypes, document.type) ||
      document.type,
  }));
  return data;
}

function victimsPagObservations(request, itemId) {
  return (request.versions || []).flatMap((version) =>
    (version.reviews || [])
      .filter(
        (review) => review.itemId === itemId && review.decision === "DEVUELTA",
      )
      .map((review) => ({
        ...structuredClone(review),
        version: version.version,
      })),
  );
}

function victimsCorrectionHistory(request, itemId) {
  return (request.versions || [])
    .filter((version) => version.correction?.itemId === itemId)
    .map((version) => ({
      version: version.version,
      submittedAt: version.submittedAt,
      submittedBy: version.submittedBy,
      correctionSummary: version.correctionSummary,
      baseVersion: version.correction.baseVersion,
      changes: structuredClone(version.correction.changes || []),
    }));
}

function catalogsFor(state, auth, at) {
  const investigation = hasCapability(
    auth,
    CAPABILITIES.CONSULTAR_CATALOGO_SERVICIOS,
    { area: "INVESTIGACION" },
  )
    ? publishedServices(state, "INVESTIGACION", at)
    : [];
  const victims = hasCapability(
    auth,
    CAPABILITIES.CONSULTAR_CATALOGO_SERVICIOS,
    { area: "VICTIMAS" },
  )
    ? publishedServices(state, "VICTIMAS", at)
    : [];
  return {
    investigationTextLimit: state.investigationTextPolicy?.maxLength,
    investigationServices: investigation.map(
      ({
        id,
        name,
        description,
        activities,
        exclusions,
        requirements,
        termPolicy,
      }) => ({
        id,
        label: name,
        description,
        activities,
        exclusions,
        requirements,
        termPolicy,
      }),
    ),
    victimServices: victims.map(({ id, name }) => ({ id, label: name })),
    regions: publishedReferences(
      state,
      "regions",
      investigation.length ? "INVESTIGACION" : "VICTIMAS",
      at,
    ),
    laws: publishedReferences(state, "laws", "VICTIMAS", at),
    proceduralStages: publishedReferences(
      state,
      "proceduralStages",
      "INVESTIGACION",
      at,
    ),
    priorityTypes: publishedReferences(
      state,
      "priorityTypes",
      "INVESTIGACION",
      at,
    ),
    investigationDocumentTypes: publishedReferences(
      state,
      "documentTypes",
      "INVESTIGACION",
      at,
    ),
    victimDocumentTypes: publishedReferences(
      state,
      "documentTypes",
      "VICTIMAS",
      at,
    ),
  };
}

function normalizeRequestedItems(state, area, payload, at) {
  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : [{ service: payload.service, region: payload.region, law: payload.law }];
  if (rawItems.length === 0) {
    throw businessError("Registre al menos un ítem de servicio");
  }
  return rawItems.map((raw) => {
    const service = text(raw.service);
    const region = text(raw.region || payload.region);
    const law = text(raw.law || payload.law) || null;
    serviceFromState(state, area, service, at);
    requireReference(state, "regions", region, area, at, "Cobertura no válida");
    if (area === "VICTIMAS") {
      requireReference(
        state,
        "laws",
        law,
        area,
        at,
        "Ley o programa no válido",
      );
    }
    return { service, region, law };
  });
}

function normalizeInvestigationIntake(state, payload, at) {
  const identifierType = text(payload.identifierType || "SPOA").toUpperCase();
  const externalId = text(payload.spoa || payload.externalId);
  if (!["SPOA", "OTRO"].includes(identifierType))
    throw businessError("Tipo de identificador no válido");
  if (
    identifierType === "SPOA" &&
    typeof (payload.spoa || payload.externalId) !== "string"
  )
    throw businessError(
      "SPOA debe enviarse como texto de 21 dígitos, sin perder ceros iniciales",
    );
  const conduct = text(payload.delito || payload.conduct);
  if (identifierType === "SPOA" && !/^\d{21}$/.test(externalId)) {
    throw businessError("SPOA debe contener 21 dígitos");
  }
  if (identifierType !== "SPOA" && !externalId) {
    throw businessError("El identificador del proceso es obligatorio");
  }
  if (!conduct) throw businessError("Delito o conducta es obligatorio");
  const persons = normalizeInvestigationPersons(payload.persons);
  if (!persons.length)
    throw businessError("Registre al menos una persona relacionada");
  const caseData = normalizeInvestigationCaseData(
    state,
    payload,
    identifierType,
    conduct,
    at,
  );
  const differentialApproach = {
    applies: Boolean(payload.differentialApproach?.applies),
    detail: text(payload.differentialApproach?.detail) || null,
  };
  if (differentialApproach.applies && !differentialApproach.detail) {
    throw businessError("Describa el enfoque diferencial aplicable");
  }
  const priority = {
    type: text(payload.priority?.type || "ORDINARIA").toUpperCase(),
    reason: text(payload.priority?.reason) || null,
    support: text(payload.priority?.support) || null,
  };
  requireReference(
    state,
    "priorityTypes",
    priority.type,
    "INVESTIGACION",
    at,
    "Prioridad no válida",
  );
  if (
    priority.type !== "ORDINARIA" &&
    (!priority.reason || !priority.support)
  ) {
    throw businessError("La prioridad requiere causal y soporte");
  }
  const documents = normalizeDocuments(
    state,
    payload.documents,
    "INVESTIGACION",
    at,
  );
  return {
    externalId,
    conduct,
    persons,
    caseData,
    differentialApproach,
    priority,
    documents,
  };
}

function normalizeInvestigationCaseData(
  state,
  payload,
  identifierType,
  conduct,
  at,
) {
  const stage = text(payload.proceduralStage).toUpperCase();
  requireReference(
    state,
    "proceduralStages",
    stage,
    "INVESTIGACION",
    at,
    "Etapa procesal no válida",
  );
  const caseData = {
    identifierType,
    processReference: text(payload.processReference),
    conduct,
    proceduralStage: stage,
    hearingApplies: Boolean(payload.hearingApplies),
    hearingDate: text(payload.hearingDate) || null,
    facts: text(payload.facts),
    hypothesis: text(payload.hypothesis),
    requiredWork: text(payload.requiredWork),
  };
  for (const [field, label] of [
    ["processReference", "proceso o caso"],
    ["facts", "hechos"],
    ["hypothesis", "hipótesis"],
    ["requiredWork", "labores requeridas"],
  ]) {
    if (!caseData[field])
      throw businessError(`La información de ${label} es obligatoria`);
    const limit = state.investigationTextPolicy?.maxLength;
    if (limit && caseData[field].length > limit)
      throw businessError(
        `La información de ${label} supera el límite técnico de ${limit} caracteres de este entorno`,
      );
  }
  if (caseData.hearingApplies && !caseData.hearingDate) {
    throw businessError("Registre la fecha de audiencia");
  }
  if (caseData.hearingApplies && !validDate(caseData.hearingDate))
    throw businessError("Fecha de audiencia no válida");
  return caseData;
}

function normalizeInvestigationPersons(persons) {
  if (!Array.isArray(persons)) return [];
  return persons.map((person) => {
    const alias = text(person.alias);
    const relation = text(person.relationship);
    if (!alias || !relation) {
      throw businessError(
        "Cada persona relacionada requiere identificación y relación con el caso",
      );
    }
    return { alias, relationship: relation, notes: text(person.notes) || null };
  });
}

function normalizeVictimsIntake(state, payload, at) {
  if (typeof payload.externalId !== "string")
    throw businessError(
      "El identificador judicial debe enviarse como texto para conservar ceros y precisión",
    );
  const externalId = text(payload.externalId);
  const law = text(payload.law);
  validateExternalIdPolicy(state, "VICTIMAS", externalId, at);
  requireReference(
    state,
    "laws",
    law,
    "VICTIMAS",
    at,
    "Ley o programa no válido",
  );
  const persons = normalizeVictimsPersons(payload.persons);
  if (!persons.length)
    throw businessError("Registre al menos una persona vinculada");
  const documents = normalizeDocuments(
    state,
    payload.documents,
    "VICTIMAS",
    at,
  );
  validateVictimsAnnexes(documents, law);
  return {
    externalId,
    law,
    persons,
    caseData: normalizeVictimsCaseData(payload.caseData || payload),
    documents,
  };
}

function validateVictimsAnnexes(documents, law) {
  if (
    law !== "LEY_975" &&
    documents.some((entry) => ["F168", "F169"].includes(entry.type))
  ) {
    throw businessError(
      "Los anexos F168 y F169 de esta ruta se registran para Ley 975",
    );
  }
}

function normalizeVictimsCaseData(source) {
  const caseData = {
    ...victimsCaseFields(source),
    processReference: text(source.processReference),
    hearingApplies: Boolean(source.hearingApplies),
    hearingDate: text(source.hearingDate) || null,
    facts: text(source.facts),
  };
  if (!caseData.processReference || !caseData.facts) {
    throw businessError("Proceso y hechos son obligatorios");
  }
  if (caseData.hearingApplies && !caseData.hearingDate) {
    throw businessError("Registre la fecha de audiencia");
  }
  if (caseData.hearingDate) formatDate(caseData.hearingDate, "audiencia");
  return caseData;
}

function normalizeVictimsPersons(persons) {
  if (!Array.isArray(persons)) return [];
  const normalized = persons.map((person) => {
    const fields = victimsPersonFields(person);
    const alias = text(person.alias);
    const type = text(person.type).toUpperCase();
    const relationship = text(person.relationship);
    const familyGroup = text(person.familyGroup);
    const contact = {
      phone: text(person.contact?.phone) || null,
      email: text(person.contact?.email) || null,
      preferredChannel: text(person.contact?.preferredChannel) || null,
      ...Object.fromEntries(
        ["address", "municipality", "department"]
          .filter((field) => text(person.contact?.[field]))
          .map((field) => [field, text(person.contact[field])]),
      ),
    };
    if (!alias || !["DIRECTA", "INDIRECTA"].includes(type) || !familyGroup) {
      throw businessError(
        "Cada persona requiere identificación, tipo y núcleo familiar",
      );
    }
    if (type === "INDIRECTA" && !relationship) {
      throw businessError(
        "La víctima indirecta requiere parentesco o relación",
      );
    }
    if (
      !contact.phone &&
      !contact.email &&
      !(type === "DIRECTA" && fields.contactUnavailableReason)
    ) {
      throw businessError("Cada persona requiere al menos un dato de contacto");
    }
    return {
      ...fields,
      alias,
      type,
      relationship: relationship || null,
      familyGroup,
      contact,
    };
  });
  for (const person of normalized) {
    if (
      !person.contact.phone &&
      !person.contact.email &&
      !normalized.some(
        (relative) =>
          relative.familyGroup === person.familyGroup &&
          (relative.contact.phone || relative.contact.email),
      )
    ) {
      throw businessError(
        "La víctima sin contacto directo requiere un contacto localizable en su núcleo familiar",
      );
    }
  }
  return normalized;
}

function normalizeDocuments(state, documents, area, at) {
  const fileOptions = { maxFileBytes: state.filePolicy?.maxFileBytes };
  if (!Array.isArray(documents) || !documents.length) {
    throw businessError("Registre al menos un documento o formato aplicable");
  }
  const normalized = documents.map((document) => {
    const type = text(document.type).toUpperCase();
    const reference = text(document.reference);
    requireReference(
      state,
      "documentTypes",
      type,
      area,
      at,
      "Tipo de documento no válido",
    );
    if (!reference)
      throw businessError("La referencia documental es obligatoria");
    if (
      document.attachment &&
      !["PDF", "SHAREPOINT"].includes(document.attachment.kind)
    )
      throw businessError("Tipo de archivo documental no válido");
    const delivery = document.file
      ? normalizeDelivery(
          { deliveryMode: "PDF", file: document.file },
          "reference",
          fileOptions,
        )
      : reference.startsWith("https://")
        ? normalizeDelivery(
            { deliveryMode: "SHAREPOINT", sharepointUrl: reference },
            "reference",
          )
        : document.attachment?.kind === "SHAREPOINT"
          ? normalizeDelivery(
              { deliveryMode: "SHAREPOINT", sharepointUrl: reference },
              "reference",
            )
          : document.attachment
            ? { attachment: structuredClone(document.attachment) }
            : {};
    // Existing stored attachments may return from an authorized correction. A client
    // cannot introduce unvalidated bytes by providing an attachment object.
    if (document.attachment?.kind === "PDF" && !document.file)
      delivery.attachment = normalizeDelivery(
        { deliveryMode: "PDF", file: document.attachment },
        "reference",
        fileOptions,
      ).attachment;
    return {
      type,
      reference,
      ...(delivery.attachment ? { attachment: delivery.attachment } : {}),
    };
  });
  if (
    normalized.reduce(
      (total, entry) => total + (entry.attachment?.size || 0),
      0,
    ) > (state.filePolicy?.maxIntakeBytes || 4 * 1024 * 1024)
  )
    throw businessError(
      `Los PDF de una solicitud no deben superar ${(state.filePolicy?.maxIntakeBytes || 4 * 1024 * 1024) / 1024 / 1024} MB en total`,
    );
  return normalized;
}

function intakeReplay(state, auth, payload, area) {
  if (!payload.submissionId) return null;
  if (
    typeof payload.submissionId !== "string" ||
    payload.submissionId.length > 100
  )
    throw businessError("Identificador de envío no válido");
  const previous = (state.intakeSubmissions || []).find(
    (entry) =>
      entry.id === payload.submissionId &&
      entry.actor === auth.sub &&
      entry.area === area,
  );
  if (!previous) return null;
  if (
    previous.fingerprint !==
    createHash("sha256").update(JSON.stringify(payload)).digest("hex")
  )
    throw new AppError(
      409,
      "SUBMISSION_CONFLICT",
      "Este envío ya corresponde a otra solicitud",
    );
  return state.requests.find((entry) => entry.id === previous.requestId);
}

function recordIntake(state, auth, payload, request) {
  if (!payload.submissionId) return;
  state.intakeSubmissions ||= [];
  state.intakeSubmissions.push({
    id: payload.submissionId,
    area: request.area,
    actor: auth.sub,
    requestId: request.id,
    fingerprint: createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex"),
  });
}

function publishedReferences(state, catalogName, area, at) {
  const date = at.slice(0, 10);
  return (state.catalogs[catalogName] || [])
    .filter(
      (entry) =>
        (entry.area === area || entry.area === "AMBAS" || area === "AMBAS") &&
        entry.status === "PUBLICADO" &&
        (!entry.validFrom || entry.validFrom <= date) &&
        (!entry.validTo || date < entry.validTo),
    )
    .map(({ id, label }) => ({ id, label }));
}

function requireReference(state, catalogName, value, area, at, message) {
  if (
    !publishedReferences(state, catalogName, area, at).some(
      (entry) => entry.id === value,
    )
  ) {
    throw businessError(message);
  }
}

function validateExternalIdPolicy(state, area, value, at) {
  const date = at.slice(0, 10);
  const policy = (state.catalogs.identifierPolicies || []).find(
    (entry) =>
      entry.area === area &&
      entry.field === "externalId" &&
      entry.status === "PUBLICADO" &&
      (!entry.validFrom || entry.validFrom <= date) &&
      (!entry.validTo || date < entry.validTo),
  );
  if (!value && (policy?.requireNonEmpty ?? true)) {
    throw businessError(
      "El identificador del proceso o radicado es obligatorio",
    );
  }
  if (value && policy?.approved && policy.pattern) {
    let matches = false;
    try {
      matches = new RegExp(policy.pattern).test(value);
    } catch {
      throw new AppError(
        500,
        "INVALID_IDENTIFIER_POLICY",
        "La política configurada para el identificador no es válida",
      );
    }
    if (!matches) {
      throw businessError(
        policy.validationMessage ||
          "El identificador no cumple la política vigente",
      );
    }
  }
}

function assertUniqueVictimsExternalId(
  state,
  externalId,
  currentRequestId = null,
) {
  if (
    state.provisionalRules?.operationalEnabled !== false &&
    state.provisionalRules &&
    state.catalogs.identifierPolicies.some(
      (entry) => entry.area === "VICTIMAS" && entry.requireUnique === false,
    )
  )
    return;
  if (
    state.requests.some(
      (request) =>
        request.area === "VICTIMAS" &&
        request.externalId === externalId &&
        request.id !== currentRequestId,
    )
  ) {
    throw businessError(
      "El identificador de la solicitud de Víctimas ya existe",
    );
  }
}

function validateServiceRequirements(
  state,
  area,
  requestedItems,
  documents,
  at,
) {
  const suppliedTypes = new Set(documents.map((document) => document.type));
  if (
    area === "VICTIMAS" &&
    (suppliedTypes.has("F163") || suppliedTypes.has("FORMATO_SOLICITUD"))
  ) {
    suppliedTypes.add("F163");
    suppliedTypes.add("FORMATO_SOLICITUD");
  }
  if (area === "VICTIMAS")
    for (const requested of requestedItems)
      validateVictimsAnnexes(documents, requested.law);
  const documentCatalog = publishedReferences(state, "documentTypes", area, at);
  const errors = requestedItems.flatMap((requested, index) => {
    const service = serviceFromState(state, area, requested.service, at);
    const missing = (service.requiredDocumentTypes || []).filter(
      (type) => !suppliedTypes.has(type),
    );
    if (!missing.length) return [];
    return [
      {
        item: index + 1,
        serviceId: service.id,
        serviceName: service.name,
        missingDocumentTypes: missing.map((type) => ({
          id: type,
          label:
            area === "VICTIMAS" && ["F163", "FORMATO_SOLICITUD"].includes(type)
              ? "Formato de solicitud F163 (paso Servicios)"
              : catalogLabel(documentCatalog, type) || type,
        })),
      },
    ];
  });
  if (errors.length) {
    const message = errors
      .map(
        (error) =>
          `Ítem ${error.item} — ${error.serviceName}: adjunte ${error.missingDocumentTypes
            .map((entry) => entry.label)
            .join(", ")}`,
      )
      .join(". ");
    throw businessError(message, { items: errors });
  }
}

function versionForVictimsItem(request, item) {
  ensureVictimsVersions(request);
  const versionNumber =
    item.submissionVersion || request.versions.at(-1).version;
  const version = request.versions.find(
    (candidate) => candidate.version === versionNumber,
  );
  if (!version) {
    throw businessError("No existe la versión de solicitud vinculada al ítem");
  }
  return version;
}

function addProductVersion(
  item,
  {
    type,
    reference,
    author,
    at,
    status,
    attachment = null,
    formatMetadata = null,
  },
) {
  item.products ||= [];
  const version =
    item.products.filter((product) => product.type === type).length + 1;
  const product = {
    id: `PROD-${item.id}-${type}-${version}`,
    itemId: item.id,
    attachment,
    type,
    reference,
    version,
    author,
    createdAt: at,
    status,
    ...(formatMetadata ? { formatMetadata } : {}),
  };
  item.products.push(product);
  item.reportReference = reference;
  return product;
}

function updateLatestProduct(item, type, changes) {
  item.products ||= [];
  if (!item.products.length && item.reportReference) {
    item.products.push({
      id: `PROD-${item.id}-${type}-1`,
      itemId: item.id,
      type,
      reference: item.reportReference,
      version: 1,
      author: null,
      createdAt: null,
      status: "ENTREGADO",
    });
  }
  const product = [...item.products]
    .reverse()
    .find((candidate) => candidate.type === type);
  if (!product) {
    throw businessError("No existe un producto entregado para esta decisión");
  }
  Object.assign(product, changes);
}

function presentedProducts(area, item) {
  if (item.products?.length)
    return item.products.map((product) => {
      const result = structuredClone(product);
      if (result.attachment) delete result.attachment.contentBase64;
      return result;
    });
  if (!item.reportReference) return [];
  return [
    {
      id: `PROD-${item.id}-LEGACY-1`,
      itemId: item.id,
      type: area === "VICTIMAS" ? "F171" : "INFORME_INVESTIGACION",
      reference: item.reportReference,
      version: 1,
      author: null,
      createdAt: null,
      status:
        area === "VICTIMAS"
          ? "REGISTRADO"
          : item.status === "CERRADA"
            ? "APROBADO"
            : "ENTREGADO",
    },
  ];
}

function problemRouting(state, request, item, at) {
  const date = at.slice(0, 10);
  const route = (state.catalogs.problemRoutes || []).find(
    (candidate) =>
      candidate.area === request.area &&
      (candidate.region === "*" || candidate.region === item.region) &&
      candidate.status === "PUBLICADO" &&
      (!candidate.validFrom || candidate.validFrom <= date) &&
      (!candidate.validTo || date < candidate.validTo),
  );
  return route
    ? {
        routeId: route.id,
        routeVersion: route.version,
        status: "EN_BANDEJA",
        scopeType: route.scopeType,
        region: item.region,
        recipientRole: route.recipientRole,
      }
    : {
        routeId: null,
        routeVersion: null,
        status: "PENDIENTE_CONFIGURACION",
        scopeType: null,
        region: item.region,
        recipientRole: null,
      };
}

function serviceFromState(state, area, id, at) {
  const service = publishedServices(state, area, at.slice(0, 10)).find(
    (entry) => entry.id === id,
  );
  if (!service) throw businessError("Servicio no válido o fuera de vigencia");
  return service;
}

function serviceFromStateById(state, id) {
  return state.catalogs.services.find((entry) => entry.id === id) || null;
}

function childItemId(prefix, number, index, count) {
  return count === 1
    ? `${prefix}-${number}`
    : `${prefix}-${number}-${String(index + 1).padStart(2, "0")}`;
}

function normalizeAreaPath(value) {
  const normalized = text(value).toUpperCase();
  if (normalized === "INVESTIGACION" || normalized === "VICTIMAS") {
    return normalized;
  }
  throw new AppError(404, "AREA_NOT_FOUND", "Área no encontrada");
}

function dashboard(requests, area) {
  const areaRequests = requests.filter((request) => request.area === area);
  const items = areaRequests.flatMap((request) => request.items);
  return {
    requestCount: areaRequests.length,
    personCount: areaRequests.reduce(
      (total, request) => total + (request.persons?.length || 0),
      0,
    ),
    itemCount: items.length,
    assignmentCount: items.filter((item) => item.assigneeId).length,
    pendingItemCount: items.filter((item) =>
      [
        "RADICADA",
        "PENDIENTE_APROBACION_PAG",
        "PENDIENTE_EXCEPCION",
        "PENDIENTE_REASIGNACION",
        "PENDIENTE_ENRUTAMIENTO",
      ].includes(item.status),
    ).length,
    activeItemCount: items.filter((item) => ACTIVE_STATES.has(item.status))
      .length,
    closedItemCount: items.filter((item) => item.status === "CERRADA").length,
  };
}

function aggregateRequestStatus(items) {
  if (!items.length) return "SIN_ITEMS";
  const statuses = new Set(items.map((item) => item.status));
  if (statuses.size === 1) return items[0].status;
  if (items.every((item) => ["CERRADA", "IMPROCEDENTE"].includes(item.status)))
    return "FINALIZADA_CON_IMPROCEDENCIA";
  if (items.every((item) => item.status === "CERRADA")) return "CERRADA";
  if (statuses.has("CERRADA")) return "PARCIALMENTE_CERRADA";
  return "EN_TRAMITE";
}

function aggregateRequestCounts(items) {
  return {
    totalItems: items.length,
    closedItems: items.filter((item) => item.status === "CERRADA").length,
    assignedItems: items.filter((item) => item.assigneeId).length,
  };
}

function findItem(state, itemId, area) {
  for (const request of state.requests) {
    const item = request.items.find((candidate) => candidate.id === itemId);
    if (item && request.area === area) return { request, item };
  }
  throw new AppError(404, "DEMO_ITEM_NOT_FOUND", "Ítem no encontrado");
}

function transition(item, to, actor, message, at) {
  const from = item.status;
  item.status = to;
  item.timeline.push(timelineEvent(at, from, to, actor, message));
}

function applyProgress(item, payload, actor, at) {
  const observation = text(payload.observation);
  if (!observation)
    throw businessError("La observación de la actuación es obligatoria");
  if (observation.length > 10000)
    throw businessError("La actuación admite hasta 10.000 caracteres");
  item.activities ||= [];
  item.activities.push({ at, actor, observation });
  item.timeline.push(
    timelineEvent(
      at,
      item.status,
      item.status,
      actor,
      `Actuación registrada · ${observation}`,
    ),
  );
}

function assertState(item, allowed) {
  if (!allowed.includes(item.status)) {
    throw new AppError(
      409,
      "INVALID_DEMO_TRANSITION",
      `Estado ${item.status} no permite esta acción`,
      { allowed },
    );
  }
}

function rejectClientAssignee(payload) {
  if (
    payload.assigneeId ||
    payload.investigadorId ||
    payload.peritoId ||
    payload.funcionarioId
  ) {
    throw businessError(
      "El responsable no puede seleccionarse manualmente; la asignación es automática",
    );
  }
}

function catalogLabel(catalog, value) {
  return catalog.find((item) => item.id === value)?.label || null;
}

function text(value) {
  return String(value || "").trim();
}

function timelineEvent(at, from, to, actor, message) {
  return { at, from, to, actor, message };
}

function businessError(message, details = undefined) {
  return new AppError(400, "DEMO_VALIDATION_ERROR", message, details);
}
