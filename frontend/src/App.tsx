import type React from "react";
import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as HotToaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { useAuthStore } from "./store/auth";

function PageSuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] w-full bg-gray-50 dark:bg-slate-950">
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

const Home = lazy(() => import("./components/Home"));
const Login = lazy(() => import("./components/Login").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("./components/Signup").then((m) => ({ default: m.Signup })));
const VerifyOtp = lazy(() => import("./components/VerifyOtp").then((m) => ({ default: m.VerifyOtp })));
const ForgotPassword = lazy(() => import("./components/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("./components/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import("./components/Dashboard").then((m) => ({ default: m.Dashboard })));
const VisitLogs = lazy(() => import("./components/VisitLogs").then((m) => ({ default: m.VisitLogs })));
const PublicDisplay = lazy(() => import("./components/PublicDisplay").then((m) => ({ default: m.PublicDisplay })));
const UserManagement = lazy(() => import("./components/UserManagement").then((m) => ({ default: m.UserManagement })));
const UnifiedVisitRegistration = lazy(() =>
  import("./components/UnifiedVisitRegistration").then((m) => ({
    default: m.UnifiedVisitRegistration,
  }))
);
const ChangePassword = lazy(() => import("./components/ChangePassword").then((m) => ({ default: m.ChangePassword })));
const BulkVisitorUpload = lazy(() => import("./components/BulkVisitorUpload").then((m) => ({ default: m.BulkVisitorUpload })));
const ScanQrCode = lazy(() => import("./components/ScanQrCode").then((m) => ({ default: m.ScanQrCode })));
const FilteredVisits = lazy(() => import("./components/FilteredVisits").then((m) => ({ default: m.FilteredVisits })));
const BlacklistedUsers = lazy(() => import("./components/BlacklistedUsers").then((m) => ({ default: m.BlacklistedUsers })));
const HostelHub = lazy(() => import("./components/HostelHub").then((m) => ({ default: m.HostelHub })));
const StudentPassPortal = lazy(() => import("./components/StudentPassPortal").then((m) => ({ default: m.StudentPassPortal })));
const SelfServiceKiosk = lazy(() => import("./components/SelfServiceKiosk").then((m) => ({ default: m.SelfServiceKiosk })));
const LostAndFound = lazy(() => import("./components/LostAndFound").then((m) => ({ default: m.LostAndFound })));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <ErrorBoundary>
        <Router>
          <Suspense fallback={<PageSuspenseFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/display" element={<PublicDisplay />} />
              <Route path="/request-visit" element={<UnifiedVisitRegistration />} />
              <Route path="/kiosk" element={<SelfServiceKiosk />} />
              <Route path="/student-pass" element={<Navigate to="/app/student-pass" replace />} />

              <Route
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route path="/app/dashboard" element={<Dashboard />} />
                <Route path="/app/hostel-hub" element={<HostelHub />} />
                <Route path="/app/student-pass" element={<StudentPassPortal />} />
                <Route path="/app/logs" element={<VisitLogs />} />
                <Route path="/app/lost-and-found" element={<LostAndFound />} />
                <Route path="/app/kiosk" element={<SelfServiceKiosk />} />
                <Route path="/app/users" element={<UserManagement />} />
                <Route path="/app/scan" element={<ScanQrCode />} />
                <Route path="/app/register-visit" element={<UnifiedVisitRegistration />} />
                <Route path="/app/register-visitor" element={<Navigate to="/app/register-visit" replace />} />
                <Route path="/app/pre-register-visitor" element={<Navigate to="/app/register-visit" replace />} />
                <Route path="/app/bulk-visitor-upload" element={<BulkVisitorUpload />} />
                <Route path="/app/visits/:status" element={<FilteredVisits />} />
                <Route path="/app/blacklist" element={<BlacklistedUsers />} />
                <Route path="/app/change-password" element={<ChangePassword />} />
              </Route>
            </Routes>
          </Suspense>
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
    </GoogleOAuthProvider>
  );
}

export default App;
