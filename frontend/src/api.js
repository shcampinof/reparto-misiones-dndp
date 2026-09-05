const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error?.message ||
        "No fue posible completar la solicitud",
    );
  }
  return data;
}

function authenticated(token, method = "GET", body) {
  return {
    method,
    headers: { Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export function apiDemoAccounts() {
  return request("/auth/demo-accounts");
}

export function apiDemoLogin(userId) {
  return request("/auth/demo-login", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function apiMe(token) {
  return request("/auth/me", authenticated(token));
}

export function apiDemoBootstrap(token) {
  return request("/demo/bootstrap", authenticated(token));
}

export function apiResetDemo(token) {
  return request("/demo/reset", authenticated(token, "POST"));
}

export function apiCreateInvestigation(token, payload) {
  return request(
    "/demo/investigacion/solicitudes",
    authenticated(token, "POST", payload),
  );
}

export function apiAssignInvestigation(token, itemId) {
  return request(
    `/demo/investigacion/items/${encodeURIComponent(itemId)}/repartir`,
    authenticated(token, "POST"),
  );
}

export function apiInvestigationAction(token, itemId, action, payload) {
  return request(
    `/demo/investigacion/items/${encodeURIComponent(itemId)}/${action}`,
    authenticated(token, "POST", payload),
  );
}

export function apiCreateVictims(token, payload) {
  return request(
    "/demo/victimas/solicitudes",
    authenticated(token, "POST", payload),
  );
}

export function apiVictimsAction(token, itemId, action, payload) {
  return request(
    `/demo/victimas/items/${encodeURIComponent(itemId)}/${action}`,
    authenticated(token, "POST", payload),
  );
}
