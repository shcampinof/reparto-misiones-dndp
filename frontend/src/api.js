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

export function apiWorkspace(token, path, method = "GET", body) {
  return request(`/workspace/${path}`, authenticated(token, method, body));
}

export async function apiWorkspaceDownload(token, path) {
  const response = await fetch(`${API_URL}/workspace/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || "No fue posible descargar");
  }
  return response.blob();
}

export function apiUploadSupport(token, path, payload, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/workspace/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 120000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded * 100) / event.total));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Se interrumpió la conexión. Reintente para confirmar el mismo envío.",
        ),
      );
    xhr.ontimeout = () =>
      reject(
        new Error(
          "La carga agotó el tiempo. Puede reintentar sin duplicar el documento.",
        ),
      );
    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        return reject(new Error("Respuesta no válida del servidor"));
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else
        reject(
          new Error(
            data.error?.message || "No fue posible cargar el documento",
          ),
        );
    };
    xhr.send(JSON.stringify(payload));
  });
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

export function apiRegisterOperation(token, area, itemId, type, payload) {
  return request(
    `/demo/${area.toLowerCase()}/items/${encodeURIComponent(itemId)}/operaciones/${type.toLowerCase()}`,
    authenticated(token, "POST", payload),
  );
}

export async function apiDownloadProduct(token, area, itemId, productId) {
  const response = await fetch(
    API_URL +
      "/demo/" +
      area.toLowerCase() +
      "/items/" +
      encodeURIComponent(itemId) +
      "/productos/" +
      encodeURIComponent(productId) +
      "/documento",
    { headers: { Authorization: "Bearer " + token } },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || "No fue posible descargar el PDF");
  }
  return response.blob();
}

export async function apiDownloadIntake(token, area, itemId, index, version) {
  const response = await fetch(
    `${API_URL}/demo/${area.toLowerCase()}/items/${encodeURIComponent(itemId)}/documentos/${index}${version ? `?version=${version}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.error?.message || "No fue posible descargar el documento",
    );
  }
  return response.blob();
}

export async function apiExportInvestigation(token, filters = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value),
  );
  const response = await fetch(
    `${API_URL}/demo/reportes/investigacion.xlsx?${query}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data?.error?.message || "No fue posible generar el reporte",
    );
  }
  return response.blob();
}
