import path from "node:path";
import { loadEnvFile } from "../src/config/load-env.js";
import {
  applySqliteMigrations,
  openSqliteDatabase,
} from "../src/infrastructure/persistence/sqlite/migrator.js";

loadEnvFile(path.resolve(process.cwd(), "../.env"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const configuredPath =
  process.env.SQLITE_PATH || "data/sigip-presentation.sqlite";
const databasePath =
  configuredPath === ":memory:"
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
const database = openSqliteDatabase(databasePath);
try {
  const applied = applySqliteMigrations(database, {
    appliedBy: process.env.MIGRATION_ACTOR || "sigip-dp-cli",
  });
  process.stdout.write(
    applied.length
      ? `Migraciones SQLite aplicadas: ${applied.join(", ")}\n`
      : "Esquema SQLite actualizado; no había migraciones pendientes.\n",
  );
} finally {
  database.close();
}
