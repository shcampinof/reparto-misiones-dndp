import { SqliteDomainRepository } from "./sqlite/domain-repository.js";
import {
  applySqliteMigrations,
  openSqliteDatabase,
} from "./sqlite/migrator.js";
import { SqlitePresentationRepository } from "./sqlite/presentation-repository.js";

export async function createPersistence({ config }) {
  if (config.persistence.driver === "sqlite") {
    const database = openSqliteDatabase(config.persistence.sqlitePath);
    try {
      applySqliteMigrations(database);
      const domainRepository = new SqliteDomainRepository(database);
      const presentationRepository = new SqlitePresentationRepository(
        database,
        domainRepository,
        { resetOnStart: config.demoResetOnStart },
      );
      return {
        driver: "sqlite",
        domainRepository,
        presentationRepository,
        health: async () => domainRepository.health(),
        close: async () => database.close(),
      };
    } catch (error) {
      database.close();
      throw error;
    }
  }

  const [{ OracleDomainRepository }, { createOraclePool, oracleHealth }] =
    await Promise.all([
      import("./oracle/domain-repository.js"),
      import("./oracle/pool.js"),
    ]);
  const pool = await createOraclePool(config.persistence.oracle);
  const domainRepository = new OracleDomainRepository(pool);
  return {
    driver: "oracle",
    domainRepository,
    presentationRepository: null,
    health: () => oracleHealth(pool),
    close: () => pool.close(10),
  };
}
