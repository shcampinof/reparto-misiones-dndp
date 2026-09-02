const LEVEL_VALUE = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export function createLogger({
  level = "info",
  destination = process.stdout,
} = {}) {
  function write(logLevel, fields, message) {
    if (LEVEL_VALUE[logLevel] < LEVEL_VALUE[level]) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      message,
      ...(fields || {}),
    };
    destination.write(`${JSON.stringify(entry)}\n`);
  }

  return {
    debug: (fields, message) => write("debug", fields, message),
    info: (fields, message) => write("info", fields, message),
    warn: (fields, message) => write("warn", fields, message),
    error: (fields, message) => write("error", fields, message),
  };
}

export function createSilentLogger() {
  return createLogger({ level: "silent", destination: { write() {} } });
}
