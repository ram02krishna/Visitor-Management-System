import type React from "react"

import { useEffect, useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "../components/ui/toaster";

import { ErrorBoundary } from "./components/ErrorBoundary"
import { Layout } from "./components/Layout"
import { Login } from "./components/Login"
import { Signup } from "./components/Signup"
import { Dashboard } from "./components/Dashboard"
import { VisitorApproval } from "./components/VisitorApproval"
import { PublicDisplay } from "./components/PublicDisplay"
import { RegisterVisitor } from "./components/RegisterVisitor"
import { UserManagement } from "./components/UserManagement"
import { VisitLogs } from "./components/VisitLogs"
import { VisitorRegistration } from "./components/VisitorRegistration"
import { PreRegisterVisitor } from "./components/PreRegisterVisitor"
import { useAuthStore } from "./store/auth"
import Home from "./components/Home"
import { RequestVisit } from "./components/RequestVisit"

import { BulkVisitorUpload } from "./components/BulkVisitorUpload"
import { ExportData } from "./components/ExportData"
import { AnalyticsDashboard } from "./components/AnalyticsDashboard"
import { ScanQrCode } from "./components/ScanQrCode"
import { OngoingVisits } from "./components/OngoingVisits"
import log from "./lib/logger";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  log.info("[PrivateRoute] Auth status:", { isAuthenticated, isLoading })

  if (isLoading) {
    log.info("[PrivateRoute] Still loading authentication...")
    return <div className="loading">🔄 Loading authentication...</div>
  }

  if (!isAuthenticated) {
    log.info("[PrivateRoute] User not authenticated, redirecting to login")
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize)
  const [authInitialized, setAuthInitialized] = useState(false)

  useEffect(() => {
    initializeAuth().finally(() => setAuthInitialized(true))
  }, [initializeAuth])

  if (!authInitialized) {
    return <div className="loading">🔄 Initializing authentication...</div>
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
            <Route path="/app/export" element={<ExportData />} />
            <Route path="/app/analytics" element={<AnalyticsDashboard />} />
            <Route path="/app/ongoing-visits" element={<OngoingVisits />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </ErrorBoundary>
  )
}

export default App
