import { randomUUID } from "node:crypto";
import { SqliteDomainRepository } from "../../src/infrastructure/persistence/sqlite/domain-repository.js";
import {
  applySqliteMigrations,
  openSqliteDatabase,
} from "../../src/infrastructure/persistence/sqlite/migrator.js";
import { assertAssignmentRepository } from "../../src/modules/assignment/persistence/contracts.js";
import { assertCoreRepository } from "../../src/modules/core/persistence/contracts.js";
import { assertInvestigationRepository } from "../../src/modules/investigacion/persistence/contracts.js";
import { assertVictimsRepository } from "../../src/modules/victimas/persistence/contracts.js";
import { registerDomainRepositoryContract } from "./domain-repository.contract.js";

registerDomainRepositoryContract("SQLite", async () => {
  const database = openSqliteDatabase(":memory:");
  applySqliteMigrations(database);
  const repository = new SqliteDomainRepository(database);
  assertCoreRepository(repository);
  assertAssignmentRepository(repository);
  assertInvestigationRepository(repository);
  assertVictimsRepository(repository);
  return {
    repository,
    prefix: `SQL${randomUUID().slice(0, 8)}`,
    close: () => database.close(),
  };
});
