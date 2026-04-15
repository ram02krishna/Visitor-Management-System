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
    <div className="flex items-center justify-center min-h-[50vh] w-full animate-fadeIn">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin dark:border-slate-700 dark:border-t-sky-500"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-slate-400 animate-pulse">Loading interface...</p>
      </div>
    </div>
  );
}

// Lazy Load Heavy Components for massive bundle parsing reduction
const Home = lazy(() => import("./components/Home"));
const Login = lazy(() => import("./components/Login").then(m => ({ default: m.Login })));
const Signup = lazy(() => import("./components/Signup").then(m => ({ default: m.Signup })));
const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const VisitLogs = lazy(() => import("./components/VisitLogs").then(m => ({ default: m.VisitLogs })));
const PublicDisplay = lazy(() => import("./components/PublicDisplay").then(m => ({ default: m.PublicDisplay })));
const UserManagement = lazy(() => import("./components/UserManagement").then(m => ({ default: m.UserManagement })));
const UnifiedVisitRegistration = lazy(() => import("./components/UnifiedVisitRegistration").then(m => ({ default: m.UnifiedVisitRegistration })));
const ChangePassword = lazy(() => import("./components/ChangePassword").then(m => ({ default: m.ChangePassword })));
const RequestVisit = lazy(() => import("./components/RequestVisit").then(m => ({ default: m.RequestVisit })));
const BulkVisitorUpload = lazy(() => import("./components/BulkVisitorUpload").then(m => ({ default: m.BulkVisitorUpload })));
const ScanQrCode = lazy(() => import("./components/ScanQrCode").then(m => ({ default: m.ScanQrCode })));
const FilteredVisits = lazy(() => import("./components/FilteredVisits").then(m => ({ default: m.FilteredVisits })));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  log.info(`[PrivateRoute] Auth status: isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);

  if (isLoading) {
    log.info("[PrivateRoute] Still loading authentication...");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 font-medium">Authenticating...</p>
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-500 mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400 font-medium">Initializing Workspace...</p>
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
            <Route path="/users" element={<Navigate to="/app/users" replace />} />

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
              <Route path="/app/register-visitor" element={<Navigate to="/app/register-visit" replace />} />
              <Route path="/app/pre-register-visitor" element={<Navigate to="/app/register-visit" replace />} />
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
            className: "dark:bg-slate-800 dark:text-white rounded-xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-black/5 dark:border-white/10",
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
