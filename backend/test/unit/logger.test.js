import assert from "node:assert/strict";
import test from "node:test";
import { createLogger } from "../../src/shared/logger.js";

test("logger produce una linea JSON estructurada", () => {
  let output = "";
  const logger = createLogger({
    level: "info",
    destination: { write: (value) => (output += value) },
  });

  logger.info({ requestId: "req-1", status: 200 }, "request_completed");
  const entry = JSON.parse(output);
  assert.equal(entry.level, "info");
  assert.equal(entry.message, "request_completed");
  assert.equal(entry.requestId, "req-1");
  assert.equal(entry.status, 200);
  assert.match(entry.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
