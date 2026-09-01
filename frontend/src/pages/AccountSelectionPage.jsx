import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AccountSelectionPage() {
  const navigate = useNavigate();
  const { accounts, selectAccount, setAccounts, setPreAuthToken } = useAuth();
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");

  async function handleSelect(id) {
    setError("");
    setLoadingId(id);

    try {
      await selectAccount(id);
      navigate("/portal");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingId("");
    }
  }

  function handleUseAnother() {
    setAccounts([]);
    setPreAuthToken("");
    navigate("/");
  }

  return (
    <div className="select-layout">
      <header className="public-header">
        <strong>Defensoria del Pueblo</strong>
      </header>

      <main className="select-main">
        <section className="select-card">
          <img
            className="brand-logo-img select-logo"
            src="https://raw.githubusercontent.com/shcampinof/AuroraV1/main/frontend/public/logo-defensoria.png"
            alt="Logo Defensoria del Pueblo"
            loading="eager"
          />
          <h2>Seleccion de la cuenta</h2>
          <p>Elige una cuenta para continuar al portal institucional</p>

          <div className="account-list">
            {accounts.map((account) => (
              <button
                key={account.id}
                className="account-btn"
                onClick={() => handleSelect(account.id)}
                disabled={Boolean(loadingId)}
              >
                <span className="device-icon">PC</span>
                <span className="account-summary">
                  <strong>{loadingId === account.id ? "Ingresando..." : account.email}</strong>
                  <small>{account.roleLabel || account.role}</small>
                </span>
              </button>
            ))}
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="secondary-outline" onClick={handleUseAnother}>
            Usar otra cuenta
          </button>

          <div className="secure-tag">ENTORNO SEGURO DE IDENTIDAD</div>
        </section>
      </main>

      <footer className="public-footer">2026 DEFENSORIA DEL PUEBLO DE COLOMBIA</footer>
    </div>
  );
}
