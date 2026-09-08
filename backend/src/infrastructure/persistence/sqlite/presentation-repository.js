import { mapDemoStateToDomainSnapshot } from "../../demo/domain-mapper.js";
import { DemoRepository } from "../../demo/demo-repository.js";
import { createDemoSeed } from "../../demo/seeds.js";
import { AuditService } from "../../../modules/core/audit/service.js";

export class SqlitePresentationRepository extends DemoRepository {
  constructor(
    database,
    domainRepository,
    { seedFactory = createDemoSeed, resetOnStart = false } = {},
  ) {
    super();
    this.database = database;
    this.domainRepository = domainRepository;
    this.auditService = new AuditService({ repository: domainRepository });
    this.seedFactory = seedFactory;
    const existing = this.#row();
    if (resetOnStart || !existing) this.reset();
  }

  snapshot() {
    const row = this.#row();
    if (!row) throw new Error("No existe el estado del perfil de presentación");
    return JSON.parse(row.state_json);
  }

  transaction(work) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const row = this.#row();
      const previous = JSON.parse(row.state_json);
      const draft = structuredClone(previous);
      const result = work(draft);
      const update = this.database
        .prepare(
          `UPDATE sigip_presentation_state
           SET state_json = ?, version = version + 1, updated_at = ?
           WHERE profile_key = 'default' AND version = ?`,
        )
        .run(JSON.stringify(draft), new Date().toISOString(), row.version);
      if (update.changes !== 1) {
        throw new Error(
          "El estado de presentación cambió durante la operación",
        );
      }
      this.domainRepository.replacePresentationSnapshot(
        mapDemoStateToDomainSnapshot(draft),
      );
      this.#auditNewTransitions(previous, draft);
      this.database.exec("COMMIT");
      return structuredClone(result);
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  reset() {
    const state = structuredClone(this.seedFactory());
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(
          `INSERT INTO sigip_presentation_state
           (profile_key, state_json, version, updated_at)
           VALUES ('default', ?, 1, ?)
           ON CONFLICT(profile_key) DO UPDATE SET state_json=excluded.state_json,
             version=sigip_presentation_state.version + 1, updated_at=excluded.updated_at`,
        )
        .run(JSON.stringify(state), new Date().toISOString());
      this.domainRepository.replacePresentationSnapshot(
        mapDemoStateToDomainSnapshot(state),
      );
      this.database.exec("COMMIT");
      return structuredClone(state);
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  #row() {
    return this.database
      .prepare(
        "SELECT state_json, version FROM sigip_presentation_state WHERE profile_key = 'default'",
      )
      .get();
  }

  #auditNewTransitions(previous, current) {
    const roleByUser = new Map(
      current.users.map((user) => [
        user.id,
        user.accounts[0]?.role || "sistema",
      ]),
    );
    for (const request of current.requests) {
      const previousRequest = previous.requests.find(
        (candidate) => candidate.id === request.id,
      );
      for (const item of request.items) {
        const previousItem = previousRequest?.items.find(
          (candidate) => candidate.id === item.id,
        );
        const previousLength = previousItem?.timeline.length ?? 0;
        for (const entry of item.timeline.slice(previousLength)) {
          if (!entry.from || entry.from === entry.to) continue;
          this.auditService.recordTransition({
            entityType: "ITEM_SOLICITUD",
            entityId: item.id,
            actorId: entry.actor,
            actorRole: roleByUser.get(entry.actor) || "sistema",
            previousState: entry.from,
            newState: entry.to,
            reason: entry.message,
            occurredAt: entry.at,
            metadata: { area: request.area, requestId: request.id },
          });
        }
      }
    }
  }
}
