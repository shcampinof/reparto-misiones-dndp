import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDemoAccounts } from "../api";
import { useAuth } from "../context/AuthContext";

const AREA_LABELS = {
  INVESTIGACION: "Investigación",
  VICTIMAS: "Víctimas",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { token, loginDemo } = useAuth();
  const [area, setArea] = useState("INVESTIGACION");
  const [accounts, setAccounts] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) navigate("/portal", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    apiDemoAccounts()
      .then((data) => setAccounts(data.accounts || []))
      .catch((requestError) => setError(requestError.message));
  }, []);

  const visible = useMemo(
    () =>
      accounts.filter(
        (account) => account.area === area || account.area === "AMBAS",
      ),
    [accounts, area],
  );

  useEffect(() => {
    setSelectedUserId((current) =>
      visible.some((account) => account.userId === current)
        ? current
        : visible[0]?.userId || "",
    );
  }, [visible]);

  async function enter() {
    if (!selectedUserId) return;
    setBusy(true);
    setError("");
    try {
      await loginDemo(selectedUserId);
      navigate("/portal");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function selectArea(nextArea) {
    setArea(nextArea);
    setError("");
  }

  return (
    <div className="demo-login-shell">
      <div className="demo-banner">
        Ambiente de demostración — datos no reales
      </div>

      <header className="public-header">
        <div
          className="institutional-wordmark"
          aria-label="Defensoría del Pueblo de Colombia"
        >
          <span aria-hidden="true">DP</span>
          <div>
            <strong>Defensoría del Pueblo</strong>
            <small>Colombia</small>
          </div>
        </div>
        <strong className="product-mark">SIGIP-DP</strong>
      </header>

      <main className="login-main">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-heading">
            <p className="eyebrow">Sistema institucional</p>
            <h1 id="login-title">Acceso a SIGIP-DP</h1>
            <p>Gestión investigativa y pericial de la Defensoría del Pueblo</p>
          </div>

          <div
            className="area-tabs"
            role="tablist"
            aria-label="Seleccione el área de trabajo"
          >
            <button
              type="button"
              role="tab"
              aria-selected={area === "INVESTIGACION"}
              className={area === "INVESTIGACION" ? "active" : ""}
              onClick={() => selectArea("INVESTIGACION")}
            >
              Investigación
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={area === "VICTIMAS"}
              className={area === "VICTIMAS" ? "active" : ""}
              onClick={() => selectArea("VICTIMAS")}
            >
              Víctimas
            </button>
          </div>

          <form
            className="demo-access-form"
            onSubmit={(event) => {
              event.preventDefault();
              enter();
            }}
          >
            <label htmlFor="demo-role">Rol de demostración</label>
            <select
              id="demo-role"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              disabled={!visible.length || busy}
              required
            >
              {!visible.length && <option value="">Cargando roles...</option>}
              {visible.map((account) => (
                <option key={account.userId} value={account.userId}>
                  {account.roleLabel} — {account.fullName}
                </option>
              ))}
            </select>
            <p className="field-help">
              Perfiles sintéticos disponibles para {AREA_LABELS[area]}. El rol
              autenticado y sus permisos son validados por el servidor.
            </p>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="primary-demo login-submit"
              type="submit"
              disabled={!selectedUserId || busy}
            >
              {busy ? "Ingresando..." : "Ingresar al portal"}
            </button>
          </form>

          <aside className="demo-access-note">
            <strong>Acceso para la reunión</strong>
            <p>
              No requiere contraseña y no contiene credenciales ni información
              productiva.
            </p>
          </aside>
        </section>
      </main>

      <footer className="public-footer">
        Defensoría del Pueblo de Colombia · Entorno de demostración
      </footer>
    </div>
  );
}
