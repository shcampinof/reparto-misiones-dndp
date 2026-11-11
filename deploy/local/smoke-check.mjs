import assert from "node:assert/strict";

// Los navegadores envían Origin al cargar módulos, incluso desde el mismo sitio.
// Una comprobación HTTP sin esa cabecera no detecta una configuración CORS errónea.
for (const origin of ["http://localhost:4000", "http://127.0.0.1:4000"]) {
  async function get(path) {
    const response = await fetch(`${origin}${path}`, {
      headers: { Origin: origin },
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200, `${origin}${path}`);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
    return response;
  }

  const html = await (await get("/")).text();
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)];
  const styles = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+\.css)"/g)];
  assert.ok(scripts.length, "La página debe cargar JavaScript");
  assert.ok(styles.length, "La página debe cargar CSS");
  for (const [, asset] of [...scripts, ...styles]) {
    const response = await get(asset);
    assert.match(response.headers.get("content-type"), /javascript|text\/css/);
    assert.ok((await response.text()).length > 0);
  }
  assert.equal((await (await get("/api/health")).json()).ok, true);
  const ready = await (await get("/api/ready")).json();
  assert.equal(ready.checks.persistence, "sqlite-transactional");
  const { accounts } = await (await get("/api/auth/demo-accounts")).json();
  for (const area of ["INVESTIGACION", "VICTIMAS"]) {
    assert.ok(accounts.some((account) => account.area === area), area);
  }
  console.log(`${origin}: HTML, JavaScript, CSS, API, SQLite y perfiles correctos`);
}

const denied = await fetch("http://127.0.0.1:4000/api/health", {
  headers: { Origin: "https://untrusted.example" },
  signal: AbortSignal.timeout(10000),
});
assert.equal(denied.status, 403);
console.log("Origen externo no permitido: rechazado correctamente");
