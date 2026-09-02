import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDemoAccounts } from "../api";
import { useAuth } from "../context/AuthContext";

const AREA_LABELS = {
  INVESTIGACION: "Investigación",
  VICTIMAS: "Víctimas",
  AMBAS: "Ambas áreas",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { token, loginDemo } = useAuth();
  const [area, setArea] = useState("INVESTIGACION");
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

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

  async function enter(userId) {
    setBusy(userId);
    setError("");
    try {
      await loginDemo(userId);
      navigate("/portal");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="demo-login-shell">
      <div className="demo-banner">
        Ambiente de demostración — datos no reales
      </div>
      <section className="institutional-hero">
        <div className="institutional-seal" aria-hidden="true">
          DP
        </div>
        <p>Defensoría del Pueblo de Colombia</p>
        <h1>
          SIGIP-DP — Sistema de Información para la Gestión Investigativa y
          Pericial de la Defensoría del Pueblo
        </h1>
        <p className="hero-note">
          Recorrido funcional con identidades, casos y documentos exclusivamente
          sintéticos.
        </p>
      </section>

      <section className="area-entry-card">
        <div className="area-switch" aria-label="Selector de área">
          <button
            className={area === "INVESTIGACION" ? "active" : ""}
            onClick={() => setArea("INVESTIGACION")}
          >
            <span>01</span> Investigación
          </button>
          <button
            className={area === "VICTIMAS" ? "active" : ""}
            onClick={() => setArea("VICTIMAS")}
          >
            <span>02</span> Víctimas
          </button>
        </div>

        <div className="role-intro">
          <div>
            <small>Área seleccionada</small>
            <h3>{AREA_LABELS[area]}</h3>
          </div>
          <p>
            Seleccione un rol precargado. No se solicitan ni almacenan
            credenciales reales.
          </p>
        </div>

        <div className="demo-account-grid">
          {visible.map((account) => (
            <button
              key={account.userId}
              className="demo-account"
              onClick={() => enter(account.userId)}
              disabled={Boolean(busy)}
            >
              <span className="avatar">
                {account.fullName
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span>
                <strong>{account.roleLabel}</strong>
                <small>{account.fullName}</small>
              </span>
              <i>{busy === account.userId ? "Ingresando..." : "Entrar →"}</i>
            </button>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>
    </main>
  );
}
