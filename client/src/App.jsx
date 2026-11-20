import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { PageLoader } from "./components/ui/misc";
import CursorFX from "./components/fx/CursorFX";
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AppShell = lazy(() => import("./pages/AppShell"));
const ChatHome = lazy(() => import("./pages/ChatHome"));
const ChatWindow = lazy(() => import("./components/chat/ChatWindow"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader label="Getting things ready…" />;
  if (!user)
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

/** Login / register pages bounce signed-in users straight into the app. */
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-[8rem] leading-none text-gradient">404</p>
      <h1 className="text-4xl">This page wandered off.</h1>
      <a
        href="/"
        className="bg-brand-gradient shadow-glow mt-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
      >
        Back to Connectly
      </a>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();
  return (
    <>
      <CursorFX />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={loading ? <PageLoader /> : <Landing />} />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <Login />
              </GuestOnly>
            }
          />
          <Route
            path="/register"
            element={
              <GuestOnly>
                <Register />
              </GuestOnly>
            }
          />
          <Route
            path="/verify"
            element={
              <GuestOnly>
                <VerifyOtp />
              </GuestOnly>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestOnly>
                <ForgotPassword />
              </GuestOnly>
            }
          />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          <Route
            path="/app"
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route index element={<ChatHome />} />
            <Route path="c/:id" element={<ChatWindow />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
