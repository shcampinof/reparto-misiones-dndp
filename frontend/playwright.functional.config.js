import base from "./playwright.config.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

export default {
  ...base,
  testIgnore: [],
  testMatch: "**/functional.spec.js",
  webServer: [
    {
      ...base.webServer[0],
      env: {
        ...base.webServer[0].env,
        ENABLE_PROVISIONAL_RULES: "true",
        STORAGE_DRIVER: "sqlite",
        SQLITE_PATH: join(tmpdir(), `sigip-browser-${process.pid}.sqlite`),
      },
    },
    base.webServer[1],
  ],
};
