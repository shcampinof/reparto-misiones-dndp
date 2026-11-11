import { DatabaseSync, backup } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  constants,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function verifyBackup(filename) {
  const db = new DatabaseSync(resolve(filename), { readOnly: true });
  try {
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
      throw new Error("La copia no supera la verificación de integridad");
    if (db.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("La copia tiene referencias inválidas");
    const row = db
      .prepare("SELECT revision,payload FROM runtime_state WHERE id=1")
      .get();
    const state = JSON.parse(row.payload);
    if (!Array.isArray(state.requests) || !Array.isArray(state.audit))
      throw new Error("Estado no válido en la copia");
    return {
      revision: row.revision,
      requests: state.requests.length,
      documents: (state.workspaceDocuments || []).length,
    };
  } finally {
    db.close();
  }
}

export async function createBackup(source, destination) {
  const sourcePath = resolve(source),
    destinationPath = resolve(destination);
  if (
    !existsSync(sourcePath) ||
    existsSync(destinationPath) ||
    sourcePath === destinationPath
  )
    throw new Error("El origen debe existir y el destino debe ser nuevo");
  mkdirSync(dirname(destinationPath), { recursive: true });
  const db = new DatabaseSync(sourcePath, { readOnly: true });
  let reserved = false;
  try {
    closeSync(openSync(destinationPath, "wx", 0o600));
    reserved = true;
    await backup(db, destinationPath);
    return verifyBackup(destinationPath);
  } catch (error) {
    if (reserved) unlinkSync(destinationPath);
    throw error;
  } finally {
    db.close();
  }
}

export function restoreBackup(source, destination) {
  const destinationPath = resolve(destination);
  if (
    existsSync(destinationPath) ||
    existsSync(`${destinationPath}-wal`) ||
    existsSync(`${destinationPath}-shm`)
  )
    throw new Error(
      "Restaure en una ruta nueva y con el servicio detenido; no se sobrescriben bases existentes",
    );
  const summary = verifyBackup(source);
  mkdirSync(dirname(destinationPath), { recursive: true });
  copyFileSync(resolve(source), destinationPath, constants.COPYFILE_EXCL);
  verifyBackup(destinationPath);
  return summary;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const [operation, source, destination] = process.argv.slice(2);
  try {
    if (!source || !destination || !["backup", "restore"].includes(operation))
      throw new Error(
        "Uso: node backup.js backup|restore origen.sqlite destino-nuevo.sqlite",
      );
    const result =
      operation === "backup"
        ? await createBackup(source, destination)
        : restoreBackup(source, destination);
    process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
