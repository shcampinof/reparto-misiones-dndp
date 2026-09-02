import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [document, setDocument] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({ document, password, remember });
      navigate("/seleccion-cuenta");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card login-card">
        <div className="brand-top">DEFENSORIA DEL PUEBLO</div>
        <img
          className="brand-logo-img"
          src="https://raw.githubusercontent.com/shcampinof/AuroraV1/main/frontend/public/logo-defensoria.png"
          alt="Logo Defensoria del Pueblo"
          loading="eager"
        />

        <h1>Bienvenido al Sistema de Reparto de Misiones</h1>

        <form onSubmit={onSubmit} className="auth-form">
          <label className="field-label">
            USUARIO
            <input
              className="text-input"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="Ingrese su numero de documento"
              required
            />
          </label>

          <label className="field-label">
            CONTRASENA
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contrasena"
              required
            />
          </label>

          <div className="auth-row">
            <label className="check-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Recordar sesion
            </label>
            <button type="button" className="link-btn">
              Olvido su contrasena?
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Validando..." : "Iniciar Sesion"}
          </button>
        </form>

        <p className="legal-note">
          Este es un sistema de acceso restringido para personal autorizado. El
          uso indebido sera sancionado conforme a la ley.
        </p>
      </div>
    </div>
  );
}
