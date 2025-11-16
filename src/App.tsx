import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { Dashboard } from "./components/Dashboard";
import { VisitorApproval } from "./components/VisitorApproval";
import { PublicDisplay } from "./components/PublicDisplay";
import { RegisterVisitor } from "./components/RegisterVisitor";
import { UserManagement } from "./components/UserManagement";
import { VisitLogs } from "./components/VisitLogs";
import { VisitorRegistration } from "./components/VisitorRegistration";
import { PreRegisterVisitor } from "./components/PreRegisterVisitor";
import { useAuthStore } from "./store/auth";
import Home from "./components/Home";
import { RequestVisit } from "./components/RequestVisit";


import { BulkVisitorUpload } from "./components/BulkVisitorUpload";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  console.log('[PrivateRoute] Auth status:', { isAuthenticated, isLoading });

  if (isLoading) {
    console.log('[PrivateRoute] Still loading authentication...');
    return <div className="loading">🔄 Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    console.log('[PrivateRoute] User not authenticated, redirecting to login');
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function RedirectManager() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname]);

  return null;
}


function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    console.log('[App] Starting authentication initialization...');
    initializeAuth()
      .then(() => {
        console.log('[App] Authentication initialized successfully');
      })
      .catch((error) => {
        console.error('[App] Authentication initialization failed:', error);
      })
      .finally(() => {
        setAuthInitialized(true);
        console.log('[App] Auth initialization complete');
      });
  }, [initializeAuth]);

  if (!authInitialized) {
    console.log('[App] Waiting for auth initialization...');
    return <div className="loading">🔄 Initializing authentication...</div>;
  }

  console.log('[App] Rendering main application');

  return (
    <ErrorBoundary>
      <Router>
        <RedirectManager />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/display" element={<PublicDisplay />} />
          <Route path="/request-visit" element={<RequestVisit />} />

          {/* Private Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="register" element={<RegisterVisitor />} />
            <Route path="approval" element={<VisitorApproval />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="logs" element={<VisitLogs />} />
            <Route path="register-visitor" element={<VisitorRegistration />} />
            <Route path="pre-register-visitor" element={<PreRegisterVisitor />} />
            <Route path="bulk-visitor-upload" element={<BulkVisitorUpload />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
