import { readdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createBackup } from "./backup.js";

export function createBackupSchedule({
  filename,
  directory,
  intervalMinutes = 360,
  keep = 3,
  clock = () => new Date().toISOString(),
}) {
  const status = {
    configured: Boolean(directory),
    running: false,
    lastSuccessAt: null,
    lastFailureAt: null,
    failureCode: null,
  };
  let timer;
  async function run() {
    if (!directory) throw new Error("BACKUP_NOT_CONFIGURED");
    if (
      status.running ||
      (status.lastSuccessAt &&
        Date.parse(clock()) - Date.parse(status.lastSuccessAt) < 60000)
    )
      return { ...status };
    status.running = true;
    try {
      const dir = resolve(directory),
        name = `sigip-backup-${clock().replace(/[:.]/g, "-")}.sqlite`;
      await createBackup(filename, join(dir, name));
      const copies = (await readdir(dir))
        .filter((file) => /^sigip-backup-[0-9TZ-]+\.sqlite$/.test(file))
        .sort()
        .reverse();
      for (const file of copies.slice(keep)) await unlink(join(dir, file));
      status.lastSuccessAt = clock();
      status.failureCode = null;
    } catch {
      status.lastFailureAt = clock();
      status.failureCode = "BACKUP_FAILED";
    } finally {
      status.running = false;
    }
    return { ...status };
  }
  return {
    status,
    run,
    start() {
      if (directory) {
        run();
        timer = setInterval(run, intervalMinutes * 60000);
        timer.unref();
      }
    },
    stop() {
      clearInterval(timer);
    },
  };
}
