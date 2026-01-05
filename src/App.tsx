import React, { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "../components/ui/toaster";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { useAuthStore } from "./store/auth";
import log from "./lib/logger";
import RoleBasedGuard from "./components/RoleBasedGuard";
import { StatusIndicator } from "./components/StatusIndicator";

// Lazy-loaded components
const Home = lazy(() => import("./components/Home"));
const Login = lazy(() => import("./components/Login"));
const Signup = lazy(() => import("./components/Signup"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const VisitorApproval = lazy(() => import("./components/VisitorApproval"));
const PublicDisplay = lazy(() => import("./components/PublicDisplay"));
const UserManagement = lazy(() => import("./components/UserManagement"));
const VisitLogs = lazy(() => import("./components/VisitLogs"));
const VisitorRegistration = lazy(() => import("./components/VisitorRegistration"));
const PreRegisterVisitor = lazy(() => import("./components/PreRegisterVisitor"));
const RequestVisit = lazy(() => import("./components/RequestVisit"));
const BulkVisitorUpload = lazy(() => import("./components/BulkVisitorUpload"));
const ExportData = lazy(() => import("./components/ExportData"));
const AnalyticsDashboard = lazy(() => import("./components/AnalyticsDashboard"));
const ScanQrCode = lazy(() => import("./components/ScanQrCode"));
const OngoingVisits = lazy(() => import("./components/OngoingVisits"));

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  log.info("[ProtectedRoute] Auth status:", { isAuthenticated, isLoading });

  if (isLoading) {
    log.info("[ProtectedRoute] Still loading authentication...");
    return <StatusIndicator isLoading={true} loadingMessage="Loading authentication..." error={null} />;
  }

  if (!isAuthenticated) {
    log.info("[ProtectedRoute] User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    initializeAuth().finally(() => setAuthInitialized(true));
  }, [initializeAuth]);

  if (!authInitialized) {
    return <StatusIndicator isLoading={true} loadingMessage="Initializing authentication..." error={null} />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<StatusIndicator isLoading={true} loadingMessage="Loading page..." error={null} />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/display" element={<PublicDisplay />} />
            <Route path="/request-visit" element={<RequestVisit />} />
            <Route path="/users" element={<Navigate to="/app/users" replace />} />

            {/* Private Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app/dashboard" element={<Dashboard />} />
              <Route path="/app/logs" element={<VisitLogs />} />
              <Route path="/app/register-visitor" element={<VisitorRegistration />} />
              <Route path="/app/pre-register-visitor" element={<PreRegisterVisitor />} />
              <Route path="/app/bulk-visitor-upload" element={<BulkVisitorUpload />} />
              <Route path="/app/export" element={<ExportData />} />
              <Route path="/app/analytics" element={<AnalyticsDashboard />} />
              <Route path="/app/ongoing-visits" element={<OngoingVisits />} />

              {/* Admin only */}
              <Route element={<RoleBasedGuard allowedRoles={['admin']} />}>
                <Route path="/app/users" element={<UserManagement />} />
              </Route>

              {/* Admin and Guard */}
              <Route element={<RoleBasedGuard allowedRoles={['admin', 'guard']} />}>
                <Route path="/app/approval" element={<VisitorApproval />} />
              </Route>

              {/* Guard only */}
              <Route element={<RoleBasedGuard allowedRoles={['guard']} />}>
                <Route path="/app/scan" element={<ScanQrCode />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </ErrorBoundary>
  );
}

export default App;