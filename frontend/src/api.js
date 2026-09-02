const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

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
    const message =
      data?.message || data?.error?.message || "Error en la solicitud";
    throw new Error(message);
  }

  return data;
}

export async function apiLogin(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiSelectAccount(payload) {
  return request("/auth/select-account", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiMe(token) {
  return request("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiBootstrap(token) {
  return request("/bootstrap", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiCreateSolicitud(token, payload) {
  return request("/solicitudes", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function apiAprobarReparto(token, numero) {
  return request(`/radicados/${encodeURIComponent(numero)}/aprobar-reparto`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiDevolverRadicado(token, numero, payload) {
  return request(`/radicados/${encodeURIComponent(numero)}/devolver`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function apiAsignarRadicado(token, numero, payload) {
  return request(`/radicados/${encodeURIComponent(numero)}/asignar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function apiSolicitarAmpliacion(token, numero, payload) {
  return request(`/radicados/${encodeURIComponent(numero)}/ampliacion`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function apiIniciarMision(token, numero) {
  return request(`/radicados/${encodeURIComponent(numero)}/iniciar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiActualizarAvance(token, numero, payload) {
  return request(`/radicados/${encodeURIComponent(numero)}/avance`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export async function apiEntregarInforme(token, numero, payload) {
  return request(`/radicados/${encodeURIComponent(numero)}/informe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}
