import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import PortalPage from "./pages/PortalPage";

function ProtectedPortal() {
  const { token, loadingProfile } = useAuth();
  if (loadingProfile)
    return <div className="screen-loader">Preparando demostración...</div>;
  return token ? <PortalPage /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/portal" element={<ProtectedPortal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
