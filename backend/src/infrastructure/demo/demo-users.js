import { createDemoSeed } from "./seeds.js";

export function buildDemoUsers(config) {
  if (!config.auth.demoEnabled) return [];
  return createDemoSeed()
    .users.map((user) => ({
      ...user,
      accounts: user.accounts.filter(
        (account) => config.auth.roleFlags[account.role] === true,
      ),
    }))
    .filter((user) => user.accounts.length > 0);
}
