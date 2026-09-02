import { users as userProfiles } from "../../data.js";

const ROLE_LABELS = {
  administrador: "Administrador del sistema",
  coordinador: "Coordinador GID",
  pag: "Profesional Administrativo y de Gestion",
  administrativo_delegado: "Administrativo delegado",
  defensor: "Defensor Publico",
  investigador: "Investigador",
  defensor_regional: "Defensor Regional",
  pag_unidad_operativa: "PAG unidad operativa",
};

function initialsFromName(name) {
  return String(name || "Usuario")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function buildDemoUsers(config) {
  if (!config.auth.demoEnabled) return [];

  const enabledRoles = new Set(
    Object.entries(config.auth.roleFlags)
      .filter(([, enabled]) => enabled)
      .map(([role]) => role),
  );

  const users = userProfiles.map((user) => ({
    ...user,
    password: null,
    accounts: user.accounts.map((account) => ({ ...account })),
  }));

  const admin = users.find((user) => user.id === "u-000");
  if (admin && config.auth.demo.adminPassword) {
    admin.document = config.auth.demo.adminUser;
    admin.password = config.auth.demo.adminPassword;
    admin.fullName = config.auth.demo.adminName;
  }

  const role = config.auth.demo.genericRole;
  if (config.auth.demo.genericPassword && enabledRoles.has(role)) {
    users.push({
      id: "u-env-generic",
      document: config.auth.demo.genericUsername,
      password: config.auth.demo.genericPassword,
      fullName: config.auth.demo.genericName,
      accounts: [
        {
          id: "acc-env-generic",
          email: config.auth.demo.genericEmail,
          role,
          roleLabel: ROLE_LABELS[role] || role,
          initials: initialsFromName(config.auth.demo.genericName),
        },
      ],
    });
  }

  return users
    .map((user) => ({
      ...user,
      accounts: user.accounts.filter((account) =>
        enabledRoles.has(account.role),
      ),
    }))
    .filter((user) => user.password && user.accounts.length > 0);
}
