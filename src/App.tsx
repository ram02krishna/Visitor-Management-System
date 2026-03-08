import type React from "react";

import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "../components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { Dashboard } from "./components/Dashboard";
import { VisitorApproval } from "./components/VisitorApproval";
import { PublicDisplay } from "./components/PublicDisplay";
import { UserManagement } from "./components/UserManagement";
import { VisitLogs } from "./components/VisitLogs";
import { VisitorRegistration } from "./components/VisitorRegistration";
import { PreRegisterVisitor } from "./components/PreRegisterVisitor";
import { useAuthStore } from "./store/auth";
import Home from "./components/Home";
import { RequestVisit } from "./components/RequestVisit";

import { BulkVisitorUpload } from "./components/BulkVisitorUpload";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { ScanQrCode } from "./components/ScanQrCode";
import { FilteredVisits } from "./components/FilteredVisits";
import log from "./lib/logger";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  log.info("[PrivateRoute] Auth status:", { isAuthenticated, isLoading });

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
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/display" element={<PublicDisplay />} />
          <Route path="/request-visit" element={<RequestVisit />} />
          <Route path="/users" element={<Navigate to="/app/users" replace />} />

          {/* Private Routes */}
          <Route
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route path="/app/dashboard" element={<Dashboard />} />
            <Route path="/app/approval" element={<VisitorApproval />} />
            <Route path="/app/users" element={<UserManagement />} />
            <Route path="/app/logs" element={<VisitLogs />} />
            <Route path="/app/scan" element={<ScanQrCode />} />
            <Route path="/app/register-visitor" element={<VisitorRegistration />} />
            <Route path="/app/pre-register-visitor" element={<PreRegisterVisitor />} />
            <Route path="/app/bulk-visitor-upload" element={<BulkVisitorUpload />} />
            <Route path="/app/analytics" element={<AnalyticsDashboard />} />
            <Route path="/app/visits/:status" element={<FilteredVisits />} />
          </Route>
        </Routes>
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
