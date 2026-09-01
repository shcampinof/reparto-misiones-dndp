import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import AccountSelectionPage from "./pages/AccountSelectionPage";
import PortalPage from "./pages/PortalPage";

function ProtectedPortal() {
  const { token, loadingProfile } = useAuth();

  if (loadingProfile) return <div className="screen-loader">Cargando sesion...</div>;
  if (!token) return <Navigate to="/" replace />;

  return <PortalPage />;
}

function AccountSelectionGuard() {
  const { token, accounts, preAuthToken } = useAuth();

  if (token) return <Navigate to="/portal" replace />;
  if (!preAuthToken || accounts.length === 0) return <Navigate to="/" replace />;

  return <AccountSelectionPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/seleccion-cuenta" element={<AccountSelectionGuard />} />
      <Route path="/portal" element={<ProtectedPortal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
