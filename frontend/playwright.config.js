import { defineConfig } from "@playwright/test";
import process from "node:process";

export default defineConfig({
  testDir: "./test/browser",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm start",
      cwd: "../backend",
      url: "http://127.0.0.1:4000/api/ready",
      reuseExistingServer: false,
      env: {
        ...process.env,
        NODE_ENV: "test",
        HOST: "127.0.0.1",
        PORT: "4000",
        LOG_LEVEL: "silent",
        ENABLE_DEMO_ACCOUNTS: "true",
        JWT_SECRET: "browser-test-secret-with-at-least-thirty-two-characters",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      cwd: ".",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
});
