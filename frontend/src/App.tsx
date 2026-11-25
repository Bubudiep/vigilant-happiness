import { App as AntApp, Spin } from "antd";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AUTH_EXPIRED_EVENT } from "./data/platform-api";

// Trang quản trị tải riêng (chunk khác) — trang chủ không phải tải trình thiết kế, bảng biểu…
const AccountGate = lazy(() => import("./components/AccountGate"));
const AdminLogin = lazy(() => import("./components/AdminLogin"));
/** Gắn class `admin-ui` vào <html> ở trang quản trị → cỡ chữ gọn hơn (src/index.css). */
function useAdminUiClass() {
  const { pathname } = useLocation();
  useEffect(() => {
    const on = /^\/(admin|controller)(\/|$)/.test(pathname);
    document.documentElement.classList.toggle("admin-ui", on);
  }, [pathname]);
}

const StoreConsole = lazy(() => import("./components/StoreConsole"));
const PlatformConsole = lazy(() => import("./components/PlatformConsole"));

const PageLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <Spin size="large" />
  </div>
);
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
  const redirectTo = searchParams.get("redirect") || "/admin";

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

/**
 * Trang cần đăng nhập + đã kích hoạt:
 *  - "shop"       /admin/:section      quản trị cửa hàng (chủ shop; quản trị viên xem được mọi shop)
 *  - "controller" /controller/:section trang điều hành nền tảng (chỉ quản trị viên)
 *  - "home"       /admin               quản trị viên → /controller, chủ shop → /admin/overview
 */
function ProtectedRoute({
  authUser,
  onLogout,
  area,
}: {
  authUser: AuthUser | null;
  onLogout: () => void;
  area: "shop" | "controller" | "home";
}) {
  const location = useLocation();
  if (!authUser) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return (
    <AccountGate user={authUser} onLogout={onLogout}>
      {(account) =>
        area === "home" ? (
          <Navigate to={account.isAdmin ? "/controller" : "/admin/overview"} replace />
        ) : area === "controller" ? (
          <PlatformConsole user={authUser} account={account} onLogout={onLogout} />
        ) : (
          <StoreConsole user={authUser} account={account} onLogout={onLogout} />
        )
      }
    </AccountGate>
  );
}

export default function App() {
  const { message } = AntApp.useApp();
  useAdminUiClass();
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<AuthUser | null>(
    () => consumeOAuthCallbackFromUrl() ?? getStoredAuthUser(),
  );

  const handleLogout = useCallback(() => {
    clearAuthUser();
    setAuthUser(null);
    message.info("Đã đăng xuất khỏi trang quản trị");
    navigate("/login", { replace: true });
  }, [message, navigate]);

  useEffect(() => {
    const onExpired = () => {
      if (!getStoredAuthUser()) return;
      clearAuthUser();
      setAuthUser(null);
      message.warning("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [message, navigate]);

  return (
    <Suspense fallback={<PageLoading />}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginRoute authUser={authUser} onSuccess={setAuthUser} />} />
      <Route path="/admin" element={<ProtectedRoute area="home" authUser={authUser} onLogout={handleLogout} />} />
      <Route path="/admin/:section" element={<ProtectedRoute area="shop" authUser={authUser} onLogout={handleLogout} />} />
      <Route path="/controller" element={<ProtectedRoute area="controller" authUser={authUser} onLogout={handleLogout} />} />
      <Route
        path="/controller/:section"
        element={<ProtectedRoute area="controller" authUser={authUser} onLogout={handleLogout} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
