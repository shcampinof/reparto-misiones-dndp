import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDemoAccounts } from "../api";
import logoDefensoria from "../assets/logo-defensoria.png";
import { brand } from "../config/brand";
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
      <header className="public-header">
        <div
          className="institutional-wordmark"
          aria-label="Defensoría del Pueblo de Colombia"
        >
          <img src={logoDefensoria} alt="Defensoría del Pueblo de Colombia" />
        </div>
        <div className="public-system-mark">
          <small>Sistema institucional</small>
          <strong className="product-mark">{brand.shortName}</strong>
        </div>
      </header>

      <main className="login-main">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-heading">
            <p className="eyebrow">Acceso institucional</p>
            <h1 id="login-title">
              <span className="brand-name-full">{brand.fullName}</span>
              <span className="brand-name-medium">{brand.mediumName}</span>
              <span className="brand-name-short">{brand.shortName}</span>
            </h1>
            <p>Acceso institucional por área y perfil autorizado</p>
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
            <label htmlFor="demo-role">Perfil de acceso</label>
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
              Seleccione el perfil con el que desea ingresar a{" "}
              {AREA_LABELS[area]}.
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
            <strong>Acceso al sistema</strong>
            <p>
              El perfil autenticado determina los módulos, bandejas y acciones
              disponibles.
            </p>
          </aside>
        </section>
      </main>

      <footer className="public-footer">
        <span className="brand-name-full">{brand.fullName}</span>
        <span className="brand-name-medium">{brand.mediumName}</span>
        <span className="brand-name-short">{brand.shortName}</span>
      </footer>
    </div>
  );
}
