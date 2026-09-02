import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../../../shared/errors.js";

const PRE_AUTH_TTL_MS = 10 * 60 * 1000;

export function createAuthService({ config, users }) {
  const preAuthSessions = new Map();

  function login({ document, password, remember = false }) {
    if (!document || !password) {
      throw new AppError(
        400,
        "AUTH_FIELDS_REQUIRED",
        "Documento y contrasena son obligatorios",
      );
    }

    const user = users.find(
      (item) => item.document === String(document).trim(),
    );
    if (!user || user.password !== password) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Credenciales invalidas");
    }

    const preAuthToken = crypto.randomUUID();
    preAuthSessions.set(preAuthToken, {
      userId: user.id,
      remember: Boolean(remember),
      expiresAt: Date.now() + PRE_AUTH_TTL_MS,
    });

    return {
      preAuthToken,
      accounts: user.accounts.map(({ id, email, role, roleLabel }) => ({
        id,
        email,
        role,
        roleLabel,
      })),
      user: { id: user.id, fullName: user.fullName, document: user.document },
    };
  }

  function selectAccount({ preAuthToken, accountId }) {
    const session = preAuthSessions.get(preAuthToken);
    if (!session || session.expiresAt < Date.now()) {
      if (session) preAuthSessions.delete(preAuthToken);
      throw new AppError(
        401,
        "PRE_AUTH_EXPIRED",
        "Sesion de preautenticacion vencida",
      );
    }

    const user = users.find((item) => item.id === session.userId);
    const account = user?.accounts.find((item) => item.id === accountId);
    if (!user || !account) {
      throw new AppError(404, "ACCOUNT_NOT_FOUND", "Cuenta no encontrada");
    }

    const accessToken = issueToken(user, account, session.remember);
    preAuthSessions.delete(preAuthToken);

    return { accessToken, profile: profileFrom(user, account) };
  }

  function getProfile(auth) {
    const user = users.find((item) => item.id === auth.sub);
    const account = user?.accounts.find((item) => item.id === auth.accountId);
    if (!user || !account)
      throw new AppError(404, "SESSION_NOT_FOUND", "Sesion no valida");
    return profileFrom(user, account);
  }

  function listDemoAccounts() {
    if (!config.auth.demoEnabled) return [];
    const unique = new Map();
    for (const user of users) {
      if (
        !user.id.startsWith("demo-") ||
        user.password !== null ||
        unique.has(user.id)
      )
        continue;
      const account = user.accounts[0];
      unique.set(user.id, {
        userId: user.id,
        fullName: user.fullName,
        role: account.role,
        roleLabel: account.roleLabel,
        area: account.area,
      });
    }
    return [...unique.values()];
  }

  function demoLogin({ userId }) {
    if (!config.auth.demoEnabled) {
      throw new AppError(
        404,
        "DEMO_DISABLED",
        "El modo demostración no está habilitado",
      );
    }
    const user = users.find(
      (candidate) =>
        candidate.id === userId &&
        candidate.id.startsWith("demo-") &&
        candidate.password === null,
    );
    const account = user?.accounts[0];
    if (!user || !account) {
      throw new AppError(
        404,
        "DEMO_ACCOUNT_NOT_FOUND",
        "Cuenta demo no encontrada",
      );
    }
    return {
      accessToken: issueToken(user, account, false),
      profile: profileFrom(user, account),
    };
  }

  function issueToken(user, account, remember) {
    return jwt.sign(
      {
        sub: user.id,
        accountId: account.id,
        role: account.role,
        email: account.email,
        fullName: user.fullName,
        initials: account.initials,
        area: account.area,
        executorId: account.executorId || null,
      },
      config.auth.jwtSecret,
      { expiresIn: remember ? "30d" : "8h" },
    );
  }

  return { login, selectAccount, getProfile, listDemoAccounts, demoLogin };
}

function profileFrom(user, account) {
  return {
    fullName: user.fullName,
    document: user.document,
    role: account.role,
    roleLabel: account.roleLabel,
    email: account.email,
    initials: account.initials,
    area: account.area,
    executorId: account.executorId || null,
  };
}
