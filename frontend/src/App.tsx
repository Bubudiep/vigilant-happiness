import { App as AntApp } from "antd";
import { useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AdminLogin from "./components/AdminLogin";
import StoreConsole from "./components/StoreConsole";
import {
  AuthUser,
  clearAuthUser,
  consumeOAuthCallbackFromUrl,
  getStoredAuthUser,
} from "./data/auth";
import LandingPage from "./pages/LandingPage";

function LoginRoute({
  authUser,
  onSuccess,
}: {
  authUser: AuthUser | null;
  onSuccess: (user: AuthUser) => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin/overview";

  if (authUser) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <AdminLogin
      redirectTo={redirectTo}
      onSuccess={(user) => {
        onSuccess(user);
        navigate(redirectTo, { replace: true });
      }}
      onBackToSite={() => navigate("/")}
    />
  );
}

function ProtectedAdminRoute({
  authUser,
  onLogout,
}: {
  authUser: AuthUser | null;
  onLogout: () => void;
}) {
  const location = useLocation();
  if (!authUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <StoreConsole user={authUser} onLogout={onLogout} />;
}

export default function App() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<AuthUser | null>(
    () => consumeOAuthCallbackFromUrl() ?? getStoredAuthUser(),
  );

  const handleLogout = () => {
    clearAuthUser();
    setAuthUser(null);
    message.info("Đã đăng xuất khỏi trang quản trị");
    navigate("/login", { replace: true });
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginRoute authUser={authUser} onSuccess={setAuthUser} />} />
      <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
      <Route
        path="/admin/:section"
        element={<ProtectedAdminRoute authUser={authUser} onLogout={handleLogout} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
