import oracledb from "oracledb";
import { OptimisticLockError } from "../../../domain/invariants.js";
import { oracleHealth } from "./pool.js";

const INSTANT_FORMAT = `YYYY-MM-DD"T"HH24:MI:SS.FF"Z"`;

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function yn(value) {
  return value === false ? "N" : "S";
}

function bool(value) {
  return value === "S";
}

function iso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export class OracleDomainRepository {
  constructor(pool, connection = null) {
    this.pool = pool;
    this.connection = connection;
  }

  async transaction(work) {
    if (this.connection) return work(this);
    const connection = await this.pool.getConnection();
    const scoped = new OracleDomainRepository(this.pool, connection);
    try {
      const result = await work(scoped);
      await connection.commit();
      return clone(result);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }

  saveArea(entity) {
    return this.#merge("SIGIP_AREA", "AREA_ID", entity, [
      ["AREA_ID", "id"],
      ["CODIGO", "code"],
      ["NOMBRE", "name"],
      ["ACTIVO", "active", yn],
      ["VIGENTE_DESDE", "effectiveFrom", iso, true],
      ["VIGENTE_HASTA", "effectiveTo", iso, true],
    ]);
  }

  saveRole(entity) {
    return this.#merge("SIGIP_ROL", "ROL_ID", entity, [
      ["ROL_ID", "id"],
      ["CODIGO", "code"],
      ["NOMBRE", "name"],
      ["ACTIVO", "active", yn],
      ["VIGENTE_DESDE", "effectiveFrom", iso, true],
      ["VIGENTE_HASTA", "effectiveTo", iso, true],
    ]);
  }

  saveUser(entity) {
    return this.#merge("SIGIP_USUARIO", "USUARIO_ID", entity, [
      ["USUARIO_ID", "id"],
      ["SUJETO_IDENTIDAD", "identitySubject"],
      ["NOMBRE_MOSTRAR", "displayName"],
      ["ACTIVO", "active", yn],
      ["CREADO_EN", "createdAt", iso, true],
    ]);
  }

  saveUserScope(entity) {
    return this.#merge("SIGIP_USUARIO_ROL", "USUARIO_ROL_ID", entity, [
      ["USUARIO_ROL_ID", "id"],
      ["USUARIO_ID", "userId"],
      ["ROL_ID", "roleId"],
      ["AREA_ID", "areaId"],
      ["REGIONAL_ID", "regionalId"],
      ["TIPO_ALCANCE", "scopeType"],
      ["ACTIVO", "active", yn],
      ["VIGENTE_DESDE", "effectiveFrom", iso, true],
      ["VIGENTE_HASTA", "effectiveTo", iso, true],
    ]);
  }

  saveRegional(entity) {
    return this.#merge("SIGIP_REGIONAL", "REGIONAL_ID", entity, [
      ["REGIONAL_ID", "id"],
      ["CODIGO", "code"],
      ["NOMBRE", "name"],
      ["ACTIVO", "active", yn],
      ["VIGENTE_DESDE", "effectiveFrom", iso, true],
      ["VIGENTE_HASTA", "effectiveTo", iso, true],
    ]);
  }

  saveService(entity) {
    return this.#merge(
      "SIGIP_ESPECIALIDAD_SERVICIO",
      "ESPECIALIDAD_SERVICIO_ID",
      entity,
      [
        ["ESPECIALIDAD_SERVICIO_ID", "id"],
        ["AREA_ID", "areaId"],
        ["CODIGO", "code"],
        ["NOMBRE", "name"],
        ["TIPO_SERVICIO", "kind"],
        ["ACTIVO", "active", yn],
        ["VIGENTE_DESDE", "effectiveFrom", iso, true],
        ["VIGENTE_HASTA", "effectiveTo", iso, true],
      ],
    );
  }

  saveCoverage(entity) {
    return this.#merge(
      "SIGIP_COBERTURA_TERRITORIAL",
      "COBERTURA_TERRITORIAL_ID",
      entity,
      [
        ["COBERTURA_TERRITORIAL_ID", "id"],
        ["AREA_ID", "areaId"],
        ["ESPECIALIDAD_SERVICIO_ID", "serviceId"],
        ["USUARIO_ID", "subjectId"],
        ["REGIONAL_ID", "regionalId"],
        ["GEOGRAFIA_ID", "geographyId"],
        ["INCLUIDA", "included", yn],
        ["PRIORIDAD", "priority"],
        ["ACTIVO", "active", yn],
        ["VIGENTE_DESDE", "effectiveFrom", iso, true],
        ["VIGENTE_HASTA", "effectiveTo", iso, true],
      ],
    );
  }

  saveCase(entity) {
    return this.#merge("SIGIP_CASO", "CASO_ID", entity, [
      ["CASO_ID", "id"],
      ["AREA_ID", "areaId"],
      ["IDENTIFICADOR_EXTERNO", "externalId"],
      ["ACTIVO", "active", yn],
      ["CREADO_EN", "createdAt", iso, true],
    ]);
  }

  async findCaseById(id) {
    const row = await this.#one(
      "SELECT * FROM SIGIP_CASO WHERE CASO_ID = :id",
      { id },
    );
    return row
      ? {
          id: row.CASO_ID,
          areaId: row.AREA_ID,
          externalId: row.IDENTIFICADOR_EXTERNO,
          active: bool(row.ACTIVO),
          createdAt: iso(row.CREADO_EN),
        }
      : undefined;
  }

  async saveRequest(entity, { expectedVersion = null } = {}) {
    const current = await this.#one(
      "SELECT VERSION FROM SIGIP_SOLICITUD WHERE SOLICITUD_ID = :id",
      { id: entity.id },
    );
    if (!current) {
      await this.#execute(
        `INSERT INTO SIGIP_SOLICITUD
         (SOLICITUD_ID, CASO_ID, AREA_ID, SOLICITANTE_USUARIO_ID, ANIO, CONSECUTIVO, ESTADO, VERSION, CREADO_EN)
         VALUES (:id, :caseId, :areaId, :requesterId, :year, :sequence, :status, :version,
                 TO_TIMESTAMP_TZ(:createdAt, '${INSTANT_FORMAT}'))`,
        {
          id: entity.id,
          caseId: entity.caseId,
          areaId: entity.areaId,
          requesterId: entity.requesterUserId,
          year: entity.year,
          sequence: entity.sequence,
          status: entity.status,
          version: entity.version ?? 1,
          createdAt: entity.createdAt,
        },
      );
      return clone(entity);
    }
    const expected = expectedVersion ?? entity.version;
    if (Number(current.VERSION) !== expected) {
      throw new OptimisticLockError("SOLICITUD", entity.id, expected);
    }
    const result = await this.#execute(
      `UPDATE SIGIP_SOLICITUD SET ESTADO=:status, VERSION=VERSION+1
       WHERE SOLICITUD_ID=:id AND VERSION=:expected`,
      { status: entity.status, id: entity.id, expected },
    );
    if (result.rowsAffected !== 1) {
      throw new OptimisticLockError("SOLICITUD", entity.id, expected);
    }
    return clone({ ...entity, version: expected + 1 });
  }

  async findRequestById(id) {
    const row = await this.#one(
      "SELECT * FROM SIGIP_SOLICITUD WHERE SOLICITUD_ID = :id",
      { id },
    );
    return row ? this.#requestFromRow(row) : undefined;
  }

  async listRequestsByCaseId(caseId) {
    const result = await this.#execute(
      "SELECT * FROM SIGIP_SOLICITUD WHERE CASO_ID = :caseId ORDER BY CREADO_EN",
      { caseId },
    );
    return Promise.all(result.rows.map((row) => this.#requestFromRow(row)));
  }

  async saveRequestItem(entity, { expectedVersion = null } = {}) {
    const current = await this.#one(
      "SELECT VERSION FROM SIGIP_ITEM_SOLICITUD WHERE ITEM_SOLICITUD_ID = :id",
      { id: entity.id },
    );
    if (!current) {
      await this.#execute(
        `INSERT INTO SIGIP_ITEM_SOLICITUD
         (ITEM_SOLICITUD_ID, SOLICITUD_ID, ESPECIALIDAD_SERVICIO_ID, REGIONAL_ID,
          ITEM_PADRE_ID, CONSECUTIVO_HIJO, ESTADO, FECHA_LIMITE, VERSION, CREADO_EN)
         VALUES (:id, :requestId, :serviceId, :regionalId, :parentItemId, :childSequence,
          :status, TO_TIMESTAMP_TZ(:dueAt, '${INSTANT_FORMAT}'), :version,
          TO_TIMESTAMP_TZ(:createdAt, '${INSTANT_FORMAT}'))`,
        {
          id: entity.id,
          requestId: entity.requestId,
          serviceId: entity.serviceId,
          regionalId: entity.regionalId,
          parentItemId: entity.parentItemId,
          childSequence: entity.childSequence ?? 1,
          status: entity.status,
          dueAt: entity.dueAt,
          version: entity.version ?? 1,
          createdAt: entity.createdAt,
        },
      );
      return clone(entity);
    }
    const expected = expectedVersion ?? entity.version;
    if (Number(current.VERSION) !== expected) {
      throw new OptimisticLockError("ITEM_SOLICITUD", entity.id, expected);
    }
    const result = await this.#execute(
      `UPDATE SIGIP_ITEM_SOLICITUD SET ESTADO=:status, VERSION=VERSION+1
       WHERE ITEM_SOLICITUD_ID=:id AND VERSION=:expected`,
      { status: entity.status, id: entity.id, expected },
    );
    if (result.rowsAffected !== 1) {
      throw new OptimisticLockError("ITEM_SOLICITUD", entity.id, expected);
    }
    return clone({ ...entity, version: expected + 1 });
  }

  async findRequestItemById(id) {
    const row = await this.#one(
      "SELECT * FROM SIGIP_ITEM_SOLICITUD WHERE ITEM_SOLICITUD_ID = :id",
      { id },
    );
    return row ? this.#itemFromRow(row) : undefined;
  }

  async listRequestItems(requestId) {
    const result = await this.#execute(
      "SELECT * FROM SIGIP_ITEM_SOLICITUD WHERE SOLICITUD_ID=:requestId ORDER BY CONSECUTIVO_HIJO",
      { requestId },
    );
    return result.rows.map((row) => this.#itemFromRow(row));
  }

  saveRequestPerson(entity) {
    return this.#merge(
      "SIGIP_PERSONA_SOLICITUD",
      "PERSONA_SOLICITUD_ID",
      entity,
      [
        ["PERSONA_SOLICITUD_ID", "id"],
        ["SOLICITUD_ID", "requestId"],
        ["REFERENCIA_PERSONA", "personReference"],
        ["TIPO_RELACION", "relationshipType"],
        ["ACTIVO", "active", yn],
        ["CREADO_EN", "createdAt", iso, true],
      ],
    );
  }

  async listRequestPersons(requestId) {
    const result = await this.#execute(
      "SELECT * FROM SIGIP_PERSONA_SOLICITUD WHERE SOLICITUD_ID=:requestId ORDER BY CREADO_EN",
      { requestId },
    );
    return result.rows.map((row) => ({
      id: row.PERSONA_SOLICITUD_ID,
      requestId: row.SOLICITUD_ID,
      personReference: row.REFERENCIA_PERSONA,
      relationshipType: row.TIPO_RELACION,
      active: bool(row.ACTIVO),
      createdAt: iso(row.CREADO_EN),
    }));
  }

  saveAssignmentDecision(entity) {
    return this.#merge(
      "SIGIP_DECISION_ASIGNACION",
      "DECISION_ASIGNACION_ID",
      entity,
      [
        ["DECISION_ASIGNACION_ID", "id"],
        ["ITEM_SOLICITUD_ID", "itemId"],
        ["VERSION_POLITICA", "policyVersion"],
        ["CODIGO_RESULTADO", "resultCode"],
        ["USUARIO_SELECCIONADO_ID", "selectedUserId"],
        ["REGLA_DESEMPATE", "tieBreakRule"],
        ["EXPLICACION_JSON", "explanation", JSON.stringify],
        ["CREADO_EN", "createdAt", iso, true],
      ],
    );
  }

  saveDecisionCandidate(entity) {
    return this.#merge(
      "SIGIP_CANDIDATO_DECISION",
      "CANDIDATO_DECISION_ID",
      entity,
      [
        ["CANDIDATO_DECISION_ID", "id"],
        ["DECISION_ASIGNACION_ID", "decisionId"],
        ["USUARIO_ID", "userId"],
        ["ELEGIBLE", "eligible", yn],
        ["POSICION", "ranking"],
        ["METRICAS_JSON", "metrics", JSON.stringify],
      ],
    );
  }

  saveCandidateExclusion(entity) {
    return this.#merge(
      "SIGIP_EXCLUSION_CANDIDATO",
      "EXCLUSION_CANDIDATO_ID",
      entity,
      [
        ["EXCLUSION_CANDIDATO_ID", "id"],
        ["CANDIDATO_DECISION_ID", "candidateId"],
        ["CODIGO_REGLA", "ruleCode"],
        ["EXPLICACION", "explanation"],
      ],
    );
  }

  async findAssignmentDecisionById(id) {
    const row = await this.#one(
      "SELECT * FROM SIGIP_DECISION_ASIGNACION WHERE DECISION_ASIGNACION_ID=:id",
      { id },
    );
    if (!row) return undefined;
    const candidatesResult = await this.#execute(
      "SELECT * FROM SIGIP_CANDIDATO_DECISION WHERE DECISION_ASIGNACION_ID=:id ORDER BY POSICION NULLS LAST",
      { id },
    );
    const candidates = [];
    for (const candidate of candidatesResult.rows) {
      const exclusions = await this.#execute(
        "SELECT * FROM SIGIP_EXCLUSION_CANDIDATO WHERE CANDIDATO_DECISION_ID=:id",
        { id: candidate.CANDIDATO_DECISION_ID },
      );
      candidates.push({
        id: candidate.CANDIDATO_DECISION_ID,
        decisionId: candidate.DECISION_ASIGNACION_ID,
        userId: candidate.USUARIO_ID,
        eligible: bool(candidate.ELEGIBLE),
        ranking: candidate.POSICION,
        metrics: JSON.parse(candidate.METRICAS_JSON),
        exclusions: exclusions.rows.map((entry) => ({
          id: entry.EXCLUSION_CANDIDATO_ID,
          candidateId: entry.CANDIDATO_DECISION_ID,
          ruleCode: entry.CODIGO_REGLA,
          explanation: entry.EXPLICACION,
        })),
      });
    }
    return {
      id: row.DECISION_ASIGNACION_ID,
      itemId: row.ITEM_SOLICITUD_ID,
      policyVersion: row.VERSION_POLITICA,
      resultCode: row.CODIGO_RESULTADO,
      selectedUserId: row.USUARIO_SELECCIONADO_ID,
      tieBreakRule: row.REGLA_DESEMPATE,
      explanation: JSON.parse(row.EXPLICACION_JSON),
      createdAt: iso(row.CREADO_EN),
      candidates,
    };
  }

  async saveAssignment(entity, { expectedVersion = null } = {}) {
    const current = await this.#one(
      "SELECT VERSION FROM SIGIP_ASIGNACION WHERE ASIGNACION_ID=:id",
      { id: entity.id },
    );
    if (!current) {
      await this.#execute(
        `INSERT INTO SIGIP_ASIGNACION
         (ASIGNACION_ID, ITEM_SOLICITUD_ID, DECISION_ASIGNACION_ID, RESPONSABLE_USUARIO_ID,
          TIPO_ASIGNACION, VERSION_POLITICA, ES_VIGENTE, VERSION, ASIGNADO_EN, FINALIZADO_EN, MOTIVO, AUTORIZADO_POR)
         VALUES (:id, :itemId, :decisionId, :assigneeId, :assignmentType, :policyVersion,
          :currentValue, :version, TO_TIMESTAMP_TZ(:assignedAt, '${INSTANT_FORMAT}'),
          TO_TIMESTAMP_TZ(:endedAt, '${INSTANT_FORMAT}'), :reason, :authorizedBy)`,
        {
          id: entity.id,
          itemId: entity.itemId,
          decisionId: entity.decisionId,
          assigneeId: entity.assigneeId,
          assignmentType: entity.assignmentType,
          policyVersion: entity.policyVersion,
          currentValue: yn(entity.current),
          version: entity.version ?? 1,
          assignedAt: entity.assignedAt,
          endedAt: entity.endedAt,
          reason: entity.reason,
          authorizedBy: entity.authorizedBy,
        },
      );
      return clone(entity);
    }
    const expected = expectedVersion ?? entity.version;
    if (Number(current.VERSION) !== expected) {
      throw new OptimisticLockError("ASIGNACION", entity.id, expected);
    }
    const result = await this.#execute(
      `UPDATE SIGIP_ASIGNACION SET ES_VIGENTE=:currentValue, FINALIZADO_EN=TO_TIMESTAMP_TZ(:endedAt, '${INSTANT_FORMAT}'),
       MOTIVO=:reason, VERSION=VERSION+1 WHERE ASIGNACION_ID=:id AND VERSION=:expected`,
      {
        currentValue: yn(entity.current),
        endedAt: entity.endedAt,
        reason: entity.reason,
        id: entity.id,
        expected,
      },
    );
    if (result.rowsAffected !== 1) {
      throw new OptimisticLockError("ASIGNACION", entity.id, expected);
    }
    return clone({ ...entity, version: expected + 1 });
  }

  async currentAssignmentForItem(itemId) {
    const row = await this.#one(
      "SELECT * FROM SIGIP_ASIGNACION WHERE ITEM_SOLICITUD_ID=:itemId AND ES_VIGENTE='S'",
      { itemId },
    );
    return row ? this.#assignmentFromRow(row) : undefined;
  }

  async appendAssignmentHistory(entity) {
    await this.#execute(
      `INSERT INTO SIGIP_HISTORIAL_ASIGNACION
       (HISTORIAL_ASIGNACION_ID, ASIGNACION_ID, ITEM_SOLICITUD_ID, ACCION,
        RESPONSABLE_USUARIO_ID, RESPONSABLE_ANTERIOR_ID, ACTOR_USUARIO_ID,
        ACTOR_REFERENCIA, MOTIVO, SOPORTE_REFERENCIA, OCURRIDO_EN)
       VALUES (:id, :assignmentId, :itemId, :action, :assigneeId, :previousAssigneeId,
        :actorId, :actorReference, :reason, :supportReference,
        TO_TIMESTAMP_TZ(:occurredAt, '${INSTANT_FORMAT}'))`,
      {
        id: entity.id,
        assignmentId: entity.assignmentId,
        itemId: entity.itemId,
        action: entity.action,
        assigneeId: entity.assigneeId,
        previousAssigneeId: entity.previousAssigneeId,
        actorId: entity.actorId,
        actorReference: entity.actorId,
        reason: entity.reason,
        supportReference: entity.supportReference,
        occurredAt: entity.occurredAt,
      },
    );
    return clone(entity);
  }

  async assignmentHistoryForItem(itemId) {
    const result = await this.#execute(
      "SELECT * FROM SIGIP_HISTORIAL_ASIGNACION WHERE ITEM_SOLICITUD_ID=:itemId ORDER BY OCURRIDO_EN",
      { itemId },
    );
    return result.rows.map((row) => ({
      id: row.HISTORIAL_ASIGNACION_ID,
      assignmentId: row.ASIGNACION_ID,
      itemId: row.ITEM_SOLICITUD_ID,
      action: row.ACCION,
      assigneeId: row.RESPONSABLE_USUARIO_ID,
      previousAssigneeId: row.RESPONSABLE_ANTERIOR_ID,
      actorId: row.ACTOR_USUARIO_ID ?? row.ACTOR_REFERENCIA,
      reason: row.MOTIVO,
      supportReference: row.SOPORTE_REFERENCIA,
      occurredAt: iso(row.OCURRIDO_EN),
    }));
  }

  async saveStateTransition(entity) {
    await this.#execute(
      `INSERT INTO SIGIP_TRANSICION_ESTADO
       (TRANSICION_ESTADO_ID, ITEM_SOLICITUD_ID, AREA_ID, ESTADO_ANTERIOR, ESTADO_NUEVO,
        ACTOR_USUARIO_ID, ACTOR_REFERENCIA, ACTOR_ROL_CODIGO, MOTIVO, OCURRIDO_EN)
       VALUES (:id, :itemId, :areaCode, :previousState, :newState, :actorId,
        :actorReference, :actorRole, :reason, TO_TIMESTAMP_TZ(:occurredAt, '${INSTANT_FORMAT}'))`,
      {
        id: entity.id,
        itemId: entity.itemId,
        areaCode: entity.areaCode,
        previousState: entity.previousState,
        newState: entity.newState,
        actorId: entity.actorId,
        actorReference: entity.actorId,
        actorRole: entity.actorRole,
        reason: entity.reason,
        occurredAt: entity.occurredAt,
      },
    );
    return clone(entity);
  }

  async listStateTransitionsForItem(itemId) {
    const result = await this.#execute(
      "SELECT * FROM SIGIP_TRANSICION_ESTADO WHERE ITEM_SOLICITUD_ID=:itemId ORDER BY OCURRIDO_EN",
      { itemId },
    );
    return result.rows.map((row) => ({
      id: row.TRANSICION_ESTADO_ID,
      itemId: row.ITEM_SOLICITUD_ID,
      areaCode: row.AREA_ID,
      previousState: row.ESTADO_ANTERIOR,
      newState: row.ESTADO_NUEVO,
      actorId: row.ACTOR_USUARIO_ID ?? row.ACTOR_REFERENCIA,
      actorRole: row.ACTOR_ROL_CODIGO,
      reason: row.MOTIVO,
      occurredAt: iso(row.OCURRIDO_EN),
    }));
  }

  async appendAudit(entity) {
    await this.#execute(
      `INSERT INTO SIGIP_AUDITORIA
       (AUDITORIA_ID, TIPO_ENTIDAD, ENTIDAD_ID, OPERACION, ACTOR_USUARIO_ID,
        ACTOR_REFERENCIA, ACTOR_ROL_CODIGO, ESTADO_ANTERIOR, ESTADO_NUEVO,
        MOTIVO, OCURRIDO_EN, CORRELACION_ID, METADATOS_JSON)
       VALUES (:id, :entityType, :entityId, :operation, :actorId, :actorReference,
        :actorRole, :previousState, :newState, :reason,
        TO_TIMESTAMP_TZ(:occurredAt, '${INSTANT_FORMAT}'), :correlationId, :metadata)`,
      {
        id: entity.id,
        entityType: entity.entityType,
        entityId: entity.entityId,
        operation: entity.operation,
        actorId: entity.actorId,
        actorReference: entity.actorReference,
        actorRole: entity.actorRole,
        previousState: entity.previousState,
        newState: entity.newState,
        reason: entity.reason,
        occurredAt: entity.occurredAt,
        correlationId: entity.correlationId,
        metadata: JSON.stringify(entity.metadata ?? {}),
      },
    );
    return clone(entity);
  }

  async listAudit(filters = {}) {
    const clauses = [];
    const binds = {};
    if (filters.entityType) {
      clauses.push("TIPO_ENTIDAD=:entityType");
      binds.entityType = filters.entityType;
    }
    if (filters.entityId) {
      clauses.push("ENTIDAD_ID=:entityId");
      binds.entityId = filters.entityId;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await this.#execute(
      `SELECT * FROM SIGIP_AUDITORIA ${where} ORDER BY OCURRIDO_EN`,
      binds,
    );
    return result.rows.map((row) => ({
      id: row.AUDITORIA_ID,
      entityType: row.TIPO_ENTIDAD,
      entityId: row.ENTIDAD_ID,
      operation: row.OPERACION,
      actorId: row.ACTOR_USUARIO_ID,
      actorReference: row.ACTOR_REFERENCIA,
      actorRole: row.ACTOR_ROL_CODIGO,
      previousState: row.ESTADO_ANTERIOR,
      newState: row.ESTADO_NUEVO,
      reason: row.MOTIVO,
      occurredAt: iso(row.OCURRIDO_EN),
      correlationId: row.CORRELACION_ID,
      metadata: JSON.parse(row.METADATOS_JSON),
    }));
  }

  async findInvestigationRequestById(id) {
    return this.#findRequestByAreaCode(id, "INVESTIGACION");
  }

  async findVictimsRequestById(id) {
    return this.#findRequestByAreaCode(id, "VICTIMAS");
  }

  listInvestigationItemsByAssignee(assigneeId) {
    return this.#itemsByAssignee(assigneeId, "INVESTIGACION");
  }

  listVictimsItemsByAssignee(assigneeId) {
    return this.#itemsByAssignee(assigneeId, "VICTIMAS");
  }

  health() {
    return oracleHealth(this.pool);
  }

  async #itemsByAssignee(assigneeId, areaId) {
    const result = await this.#execute(
      `SELECT item.* FROM SIGIP_ITEM_SOLICITUD item
       JOIN SIGIP_SOLICITUD request_record ON request_record.SOLICITUD_ID=item.SOLICITUD_ID
       JOIN SIGIP_AREA area ON area.AREA_ID=request_record.AREA_ID
       JOIN SIGIP_ASIGNACION assignment_record ON assignment_record.ITEM_SOLICITUD_ID=item.ITEM_SOLICITUD_ID
       WHERE assignment_record.RESPONSABLE_USUARIO_ID=:assigneeId
         AND assignment_record.ES_VIGENTE='S' AND area.CODIGO=:areaId`,
      { assigneeId, areaId },
    );
    return result.rows.map((row) => this.#itemFromRow(row));
  }

  async #findRequestByAreaCode(id, areaCode) {
    const row = await this.#one(
      `SELECT request_record.* FROM SIGIP_SOLICITUD request_record
       JOIN SIGIP_AREA area ON area.AREA_ID=request_record.AREA_ID
       WHERE request_record.SOLICITUD_ID=:id AND area.CODIGO=:areaCode`,
      { id, areaCode },
    );
    return row ? this.#requestFromRow(row) : undefined;
  }

  async #requestFromRow(row) {
    const items = await this.listRequestItems(row.SOLICITUD_ID);
    return {
      id: row.SOLICITUD_ID,
      caseId: row.CASO_ID,
      areaId: row.AREA_ID,
      requesterUserId: row.SOLICITANTE_USUARIO_ID,
      status: row.ESTADO,
      year: row.ANIO,
      sequence: row.CONSECUTIVO,
      version: Number(row.VERSION),
      itemIds: items.map((item) => item.id),
      createdAt: iso(row.CREADO_EN),
    };
  }

  #itemFromRow(row) {
    return {
      id: row.ITEM_SOLICITUD_ID,
      requestId: row.SOLICITUD_ID,
      serviceId: row.ESPECIALIDAD_SERVICIO_ID,
      status: row.ESTADO,
      regionalId: row.REGIONAL_ID,
      parentItemId: row.ITEM_PADRE_ID,
      childSequence: Number(row.CONSECUTIVO_HIJO),
      dueAt: iso(row.FECHA_LIMITE),
      version: Number(row.VERSION),
      createdAt: iso(row.CREADO_EN),
    };
  }

  #assignmentFromRow(row) {
    return {
      id: row.ASIGNACION_ID,
      itemId: row.ITEM_SOLICITUD_ID,
      assigneeId: row.RESPONSABLE_USUARIO_ID,
      decisionId: row.DECISION_ASIGNACION_ID,
      assignmentType: row.TIPO_ASIGNACION,
      policyVersion: row.VERSION_POLITICA,
      current: bool(row.ES_VIGENTE),
      version: Number(row.VERSION),
      assignedAt: iso(row.ASIGNADO_EN),
      endedAt: iso(row.FINALIZADO_EN),
      reason: row.MOTIVO,
      authorizedBy: row.AUTORIZADO_POR,
    };
  }

  async #merge(table, idColumn, entity, mapping) {
    const binds = {};
    const expressions = mapping.map(
      ([column, property, transform, instant], index) => {
        const key = `b${index}`;
        const raw = entity[property] ?? null;
        binds[key] = transform ? transform(raw) : raw;
        const expression = instant
          ? `TO_TIMESTAMP_TZ(:${key}, '${INSTANT_FORMAT}')`
          : `:${key}`;
        return { column, expression };
      },
    );
    const source = expressions
      .map(({ column, expression }) => `${expression} ${column}`)
      .join(", ");
    const updates = expressions
      .filter(({ column }) => column !== idColumn)
      .map(({ column }) => `target.${column}=source.${column}`)
      .join(", ");
    const columns = expressions.map(({ column }) => column).join(", ");
    const values = expressions
      .map(({ column }) => `source.${column}`)
      .join(", ");
    await this.#execute(
      `MERGE INTO ${table} target USING (SELECT ${source} FROM DUAL) source
       ON (target.${idColumn}=source.${idColumn})
       WHEN MATCHED THEN UPDATE SET ${updates}
       WHEN NOT MATCHED THEN INSERT (${columns}) VALUES (${values})`,
      binds,
    );
    return clone(entity);
  }

  async #one(sql, binds) {
    const result = await this.#execute(sql, binds);
    return result.rows?.[0] || null;
  }

  async #execute(sql, binds = {}) {
    if (this.connection) {
      return this.connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
    }
    const connection = await this.pool.getConnection();
    try {
      return await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
      });
    } finally {
      await connection.close();
    }
  }
}
