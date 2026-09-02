import { createDemoSeed } from "./seeds.js";

export function buildDemoUsers(config) {
  if (!config.auth.demoEnabled) return [];
  return createDemoSeed().users;
}
