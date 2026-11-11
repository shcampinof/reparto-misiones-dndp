import { assertStateHistory } from "./state-integrity.js";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createDemoSeed } from "../demo/seeds.js";
import { AppError } from "../../shared/errors.js";

// Temporary persistence adapter for functional testing before Oracle.
// No state cache: every transaction reads again AFTER obtaining the writer lock.
export class SqliteRepository {
  constructor(filename, seedFactory = createDemoSeed) {
    this.seedFactory = seedFactory;
    mkdirSync(dirname(resolve(filename)), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;",
    );
    this.db.exec(
      readFileSync(
        new URL("./migrations/001-runtime.sql", import.meta.url),
        "utf8",
      ),
    );
    this.db
      .prepare("INSERT OR IGNORE INTO schema_migrations VALUES(1, ?)")
      .run(new Date().toISOString());
    this.db.exec(
      readFileSync(
        new URL("./migrations/002-domain-indexes.sql", import.meta.url),
        "utf8",
      ),
    );
    this.db
      .prepare("INSERT OR IGNORE INTO schema_migrations VALUES(2, ?)")
      .run(new Date().toISOString());
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec(
        readFileSync(
          new URL("./migrations/003-workspace.sql", import.meta.url),
          "utf8",
        ),
      );
      this.db
        .prepare("INSERT OR IGNORE INTO schema_migrations VALUES(3, ?)")
        .run(new Date().toISOString());
      if (!this.db.prepare("SELECT id FROM runtime_state WHERE id=1").get()) {
        this.write(seedFactory(), 0);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      this.db.close();
      throw error;
    }
  }

  snapshot() {
    return JSON.parse(
      this.db.prepare("SELECT payload FROM runtime_state WHERE id=1").get()
        .payload,
    );
  }

  transaction(work) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db
        .prepare("SELECT revision, payload FROM runtime_state WHERE id=1")
        .get();
      const before = JSON.parse(row.payload);
      const draft = structuredClone(before);
      const result = work(draft);
      if (result && typeof result.then === "function")
        throw new Error("Repository transactions must be synchronous");
      assertStateHistory(before, draft);
      this.write(draft, row.revision + 1);
      const response = structuredClone(result);
      this.db.exec("COMMIT");
      return response;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  write(state, revision) {
    for (const draft of state.drafts || [])
      this.db
        .prepare(
          "INSERT INTO drafts VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload",
        )
        .run(
          draft.id,
          draft.ownerUserId,
          draft.area,
          draft.revision,
          JSON.stringify(draft),
        );
    for (const request of state.requests) {
      const caseId = `${request.area}:${request.externalId}`;
      this.db
        .prepare("INSERT OR IGNORE INTO cases VALUES(?,?,?)")
        .run(caseId, request.area, request.externalId);
      this.db
        .prepare(
          "INSERT INTO requests VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET case_id=excluded.case_id, payload=excluded.payload",
        )
        .run(request.id, caseId, JSON.stringify(request));
      for (const item of request.items) {
        this.db
          .prepare(
            "INSERT INTO request_items VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, assignee_id=excluded.assignee_id, payload=excluded.payload",
          )
          .run(
            item.id,
            request.id,
            item.status,
            item.assigneeId,
            JSON.stringify(item),
          );
        if (item.assignment?.createdAt)
          this.db
            .prepare("INSERT OR IGNORE INTO assignments VALUES(?,?,?,?)")
            .run(
              item.id,
              item.assignment.createdAt,
              item.assigneeId,
              JSON.stringify(item.assignment),
            );
        for (const [index, document] of (item.products || []).entries()) {
          this.db
            .prepare("INSERT OR IGNORE INTO document_versions VALUES(?,?,?,?)")
            .run(
              document.id || `${item.id}:v${index + 1}`,
              item.id,
              index + 1,
              JSON.stringify(document),
            );
        }
      }
      for (const version of request.versions || []) {
        for (const [index, person] of (version.data?.persons || []).entries())
          this.db
            .prepare("INSERT OR IGNORE INTO person_requests VALUES(?,?,?,?)")
            .run(request.id, version.version, index, JSON.stringify(person));
        for (const [index, document] of (
          version.data?.documents || []
        ).entries())
          this.db
            .prepare("INSERT OR IGNORE INTO intake_documents VALUES(?,?,?,?)")
            .run(request.id, version.version, index, JSON.stringify(document));
      }
    }
    for (const doc of state.workspaceDocuments || [])
      this.db
        .prepare(
          "INSERT OR IGNORE INTO support_document_versions VALUES(?,?,?,?,?)",
        )
        .run(
          doc.id,
          doc.itemId,
          doc.documentId,
          doc.version,
          JSON.stringify(doc),
        );
    for (const entry of state.outbox || []) {
      this.db
        .prepare(
          "INSERT INTO outbox VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
        )
        .run(entry.id, entry.itemId, JSON.stringify(entry));
    }
    for (const [index, entry] of state.audit.entries()) {
      this.db
        .prepare("INSERT OR IGNORE INTO audit_events VALUES(?,?)")
        .run(index + 1, JSON.stringify(entry));
    }
    this.db
      .prepare(
        "INSERT INTO runtime_state VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, payload=excluded.payload",
      )
      .run(revision, JSON.stringify(state));
  }

  reset() {
    throw new AppError(
      409,
      "PERSISTENT_RESET_DISABLED",
      "El entorno persistente conserva los registros. Use una base independiente para un nuevo ciclo de pruebas.",
    );
  }

  close() {
    this.db.close();
  }

  check() {
    return this.db
      .prepare("SELECT revision FROM runtime_state WHERE id=1")
      .get();
  }
}
