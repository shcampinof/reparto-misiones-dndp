import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function readMigrationFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort()
    .map((name) => {
      const source = fs.readFileSync(path.join(directory, name), "utf8");
      return {
        version: name.slice(0, 3),
        name,
        description: name.slice(4, -4).replaceAll("_", " "),
        source,
        checksum: crypto.createHash("sha256").update(source).digest("hex"),
      };
    });
}

export function splitOracleStatements(source) {
  const statements = [];
  let buffer = [];
  let plsql = false;
  for (const rawLine of source.replaceAll("\r\n", "\n").split("\n")) {
    const line = rawLine.trim();
    if (!buffer.length && (!line || line.startsWith("--"))) continue;
    if (!plsql && /^CREATE\s+OR\s+REPLACE\s+TRIGGER\b/i.test(line)) {
      plsql = true;
    }
    if (plsql && line === "/") {
      statements.push(buffer.join("\n").trim());
      buffer = [];
      plsql = false;
      continue;
    }
    buffer.push(rawLine);
    if (!plsql && /;\s*$/.test(line)) {
      statements.push(buffer.join("\n").trim().replace(/;\s*$/, ""));
      buffer = [];
    }
  }
  if (buffer.join("").trim()) statements.push(buffer.join("\n").trim());
  return statements;
}
