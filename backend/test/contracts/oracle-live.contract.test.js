import { randomUUID } from "node:crypto";
import test from "node:test";
import { OracleDomainRepository } from "../../src/infrastructure/persistence/oracle/domain-repository.js";
import { createOraclePool } from "../../src/infrastructure/persistence/oracle/pool.js";
import { assertAssignmentRepository } from "../../src/modules/assignment/persistence/contracts.js";
import { assertCoreRepository } from "../../src/modules/core/persistence/contracts.js";
import { assertInvestigationRepository } from "../../src/modules/investigacion/persistence/contracts.js";
import { assertVictimsRepository } from "../../src/modules/victimas/persistence/contracts.js";
import { registerDomainRepositoryContract } from "./domain-repository.contract.js";

const enabled = process.env.RUN_ORACLE_CONTRACT_TESTS === "true";

if (!enabled) {
  test("contrato Oracle no se simula sin un esquema no productivo", {
    skip: "Defina RUN_ORACLE_CONTRACT_TESTS=true y credenciales del esquema de prueba",
  });
} else {
  registerDomainRepositoryContract("Oracle Thin no productivo", async () => {
    const required = [
      "ORACLE_USER",
      "ORACLE_PASSWORD",
      "ORACLE_CONNECT_STRING",
    ];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length) {
      throw new Error(`Faltan variables Oracle: ${missing.join(", ")}`);
    }
    const pool = await createOraclePool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 1,
      poolMax: 4,
      poolIncrement: 1,
      poolTimeout: 60,
      queueTimeout: 15000,
      statementCacheSize: 30,
    });
    const repository = new OracleDomainRepository(pool);
    assertCoreRepository(repository);
    assertAssignmentRepository(repository);
    assertInvestigationRepository(repository);
    assertVictimsRepository(repository);
    return {
      repository,
      prefix: `ORA${randomUUID().replaceAll("-", "").slice(0, 8)}`,
      close: () => pool.close(10),
    };
  });
}
