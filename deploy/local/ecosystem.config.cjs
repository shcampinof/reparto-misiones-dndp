const path = require("node:path");

const root = path.resolve(__dirname, "../..");

module.exports = {
  apps: [
    {
      name: "sigip-dp",
      cwd: path.join(root, "backend"),
      script: "src/server.js",
      interpreter: process.execPath,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 2000,
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 10000,
      watch: false,
      env: {
        NODE_ENV: "development",
        HOST: "127.0.0.1",
        PORT: "4000",
        CORS_ORIGINS:
          "http://localhost:4000,http://127.0.0.1:4000,http://localhost:5173,http://127.0.0.1:5173",
        STATIC_DIR: path.join(root, "frontend", "dist"),
        ENABLE_DEMO_ACCOUNTS: "true",
        STORAGE_DRIVER: "sqlite",
        DEMO_RESET_ON_START: "false",
      },
    },
  ],
};
