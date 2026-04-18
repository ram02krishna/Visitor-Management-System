import type React from "react";

import { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "../components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { useAuthStore } from "./store/auth";
import log from "./lib/logger";

// Create sleek loading fallback for chunk loading
function PageSuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] w-full animate-fadeIn bg-gray-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-sky-200 dark:border-slate-700" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-500 animate-spin" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}

// Lazy Load Heavy Components for massive bundle parsing reduction
const Home = lazy(() => import("./components/Home"));
const Login = lazy(() => import("./components/Login").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("./components/Signup").then((m) => ({ default: m.Signup })));
const Dashboard = lazy(() =>
  import("./components/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const VisitLogs = lazy(() =>
  import("./components/VisitLogs").then((m) => ({ default: m.VisitLogs }))
);
const PublicDisplay = lazy(() =>
  import("./components/PublicDisplay").then((m) => ({ default: m.PublicDisplay }))
);
const UserManagement = lazy(() =>
  import("./components/UserManagement").then((m) => ({ default: m.UserManagement }))
);
const UnifiedVisitRegistration = lazy(() =>
  import("./components/UnifiedVisitRegistration").then((m) => ({
    default: m.UnifiedVisitRegistration,
  }))
);
const ChangePassword = lazy(() =>
  import("./components/ChangePassword").then((m) => ({ default: m.ChangePassword }))
);
const RequestVisit = lazy(() =>
  import("./components/RequestVisit").then((m) => ({ default: m.RequestVisit }))
);
const BulkVisitorUpload = lazy(() =>
  import("./components/BulkVisitorUpload").then((m) => ({ default: m.BulkVisitorUpload }))
);
const ScanQrCode = lazy(() =>
  import("./components/ScanQrCode").then((m) => ({ default: m.ScanQrCode }))
);
const FilteredVisits = lazy(() =>
  import("./components/FilteredVisits").then((m) => ({ default: m.FilteredVisits }))
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  log.info(
    `[PrivateRoute] Auth status: isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`
  );

  if (isLoading) {
    log.info("[PrivateRoute] Still loading authentication...");
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 animate-springIn">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-sky-100 dark:border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-sky-500 dark:border-t-sky-400 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 opacity-10" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    log.info("[PrivateRoute] User not authenticated, redirecting to login");
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    initializeAuth().finally(() => setAuthInitialized(true));
  }, [initializeAuth]);

  if (!authInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-5 animate-springIn">
          {/* iOS-style app icon loader */}
          <div className="relative">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-sky-500/30 animate-pulse-slow">
              <img src="/visitor-management.png" alt="VMS" className="w-9 h-9" />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-black/10 dark:bg-black/30 rounded-full blur-sm" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              IIIT Nagpur VMS
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-slate-500">
              Initializing...
            </p>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-sky-400 dark:bg-sky-500 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<PageSuspenseFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/display" element={<PublicDisplay />} />
            <Route path="/request-visit" element={<RequestVisit />} />

            <Route
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route path="/app/dashboard" element={<Dashboard />} />
              <Route path="/app/logs" element={<VisitLogs />} />
              <Route path="/app/users" element={<UserManagement />} />
              <Route path="/app/scan" element={<ScanQrCode />} />
              <Route path="/app/register-visit" element={<UnifiedVisitRegistration />} />
              <Route
                path="/app/register-visitor"
                element={<Navigate to="/app/register-visit" replace />}
              />
              <Route
                path="/app/pre-register-visitor"
                element={<Navigate to="/app/register-visit" replace />}
              />
              <Route path="/app/bulk-visitor-upload" element={<BulkVisitorUpload />} />
              <Route path="/app/visits/:status" element={<FilteredVisits />} />
              <Route path="/app/change-password" element={<ChangePassword />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster />
        <HotToaster
          position="top-center"
          toastOptions={{
            className:
              "dark:bg-slate-800 dark:text-white rounded-xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-black/5 dark:border-white/10",
            style: {
              background: "var(--tw-bg-opacity, 1) rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(12px)",
              color: "inherit",
            },
          }}
        />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
