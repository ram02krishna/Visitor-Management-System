"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { toast } from "../../hooks/use-toast";
import {
  CheckCircle,
  Camera,
  ScanLine,
  Clock,
  User,
  Printer,
  LogIn,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import type { Database } from "../lib/database.types";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitors: Database["public"]["Tables"]["visitors"]["Row"];
  hosts: Database["public"]["Tables"]["hosts"]["Row"];
};

export function ScanQrCode() {
  useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [scannerReady, setScannerReady] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth check error:", error);
          setIsAuthenticated(false);
          setError("Authentication error. Please try logging in again.");
        } else if (session?.user) {
          console.log("User authenticated:", session.user.id);
          setIsAuthenticated(true);
          setError(null);
        } else {
          console.log("No active session");
          setIsAuthenticated(false);
          setError("You must be logged in to scan QR codes");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuthenticated(false);
        setError("Failed to verify authentication");
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (!session?.user) {
        setError("You must be logged in to scan QR codes");
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Start scanner when authenticated
  useEffect(() => {
    if (!isAuthenticated || checkingAuth) {
      console.log("Not starting scanner - auth status:", { isAuthenticated, checkingAuth });
      return;
    }

    console.log("Starting scanner for authenticated user");
    const qrCodeDivId = "qr-reader";
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        // Small delay to ensure DOM is ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        scanner = new Html5Qrcode(qrCodeDivId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            console.log("QR Code scanned:", decodedText);
            setScanResult(decodedText);
            if (scanner?.isScanning) {
              scanner.stop().catch(console.error);
            }
          },
          () => { }
        );

        setScannerReady(true);
        console.log("Scanner started successfully");
      } catch (err) {
        console.error("Scanner error:", err);
        setError("Failed to start QR code scanner. Please ensure camera permissions are granted.");
      }
    };

    startScanner();

    return () => {
      if (scanner?.isScanning) {
        console.log("Stopping scanner during cleanup");
        scanner.stop().catch(console.error);
      }
    };
  }, [isAuthenticated, checkingAuth]);

  // Fetch visit details when QR code is scanned
  useEffect(() => {
    if (!scanResult || !isAuthenticated) return;

    const fetchVisitDetails = async () => {
      setLoading(true);
      setError(null);
      setVisit(null);

      try {
        console.log("Raw scanResult:", scanResult);

        // Parse QR code
        let visitId: string;
        try {
          const parsed = JSON.parse(scanResult);
          visitId = parsed.visitId;
        } catch {
          visitId = scanResult.trim();
        }

        if (!visitId) {
          throw new Error("Invalid QR code format: visitId missing");
        }

        console.log("Looking up visit ID:", visitId);

        // Fetch visit with proper joins
        const { data: visitData, error: visitError } = await supabase
          .from("visits")
          .select(
            `
            *,
            visitors:visitor_id (*),
            hosts:host_id (*)
          `
          )
          .eq("id", visitId)
          .single();

        if (visitError) {
          console.error("Visit fetch error:", visitError);
          throw new Error(`Database error: ${visitError.message}`);
        }

        if (!visitData) {
          throw new Error("Visit not found");
        }

        console.log("Visit data:", visitData);

        // Check visit status
        if (visitData.status === "checked-in") {
          setError("This visitor is already checked in!");
          setVisit(visitData as Visit);
          return;
        }

        if (visitData.status !== "approved") {
          throw new Error(
            `Visit status is '${visitData.status}'. Only approved visits can be checked in.`
          );
        }

        // Check if visit has expired
        if (visitData.valid_until) {
          const validUntil = new Date(visitData.valid_until);
          if (validUntil < new Date()) {
            throw new Error("This visit has expired");
          }
        }

        // Update visit to checked-in
        const { data: updatedVisit, error: updateError } = await supabase
          .from("visits")
          .update({
            check_in_time: new Date().toISOString(),
            status: "checked-in",
          })
          .eq("id", visitId)
          .select(
            `
            *,
            visitors:visitor_id (*),
            hosts:host_id (*)
          `
          )
          .single();

        if (updateError) {
          console.error("Update error:", updateError);
          throw new Error(`Failed to check in: ${updateError.message}`);
        }

        toast({
          title: "Success!",
          description: "Visitor checked in successfully",
        });

        setVisit(updatedVisit as Visit);
      } catch (err: unknown) {
        console.error("Fetch visit error:", err);
        let errorMessage = "Failed to fetch visit details";

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }

        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVisitDetails();
  }, [scanResult, isAuthenticated]);

  const handlePrint = () => {
    window.print();
  };

  const handleScanAnother = async () => {
    // Stop and clean up the current scanner first
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }

    // Reset state — this triggers React to re-render and show the #qr-reader div
    setScanResult(null);
    setVisit(null);
    setError(null);
    setScannerReady(false);

    if (!isAuthenticated) {
      setError("You must be logged in to scan QR codes");
      return;
    }

    // Wait for React to re-render the #qr-reader div, then start scanner
    setTimeout(async () => {
      const qrCodeDivId = "qr-reader";
      const el = document.getElementById(qrCodeDivId);
      if (!el) {
        setError("Scanner container not found. Please refresh the page.");
        return;
      }
      // Clear any residual Html5Qrcode DOM content inside the div
      el.innerHTML = "";

      try {
        const scanner = new Html5Qrcode(qrCodeDivId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            setScanResult(decodedText);
            if (scanner.isScanning) {
              scanner.stop().catch(console.error);
            }
          },
          () => { }
        );

        setScannerReady(true);
      } catch (err) {
        console.error("Failed to restart scanner:", err);
        setError("Failed to start camera. Please check camera permissions and try refreshing.");
      }
    }, 300); // 300ms gives React time to re-render the div
  };

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login required message
  if (!isAuthenticated) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <BackButton />

        <PageHeader
          icon={ScanLine}
          gradient="from-sky-500 to-blue-600"
          title="Scan QR Code"
        />

        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <LogIn className="h-16 w-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
              Authentication Required
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-6">
              You must be logged in to scan QR codes
            </p>
            <button
              onClick={() => (window.location.href = "/login")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              <LogIn className="h-5 w-5" />
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <BackButton />

      <PageHeader
        icon={ScanLine}
        gradient="from-sky-500 to-blue-600"
        title="Scan QR Code"
        description="Scan a visitor's QR code to check them in."
      />

      <div className="mt-8 max-w-2xl mx-auto">
        {!visit && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
            <div id="qr-reader" style={{ width: "100%" }}></div>
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              {scannerReady ? "Position the QR code within the frame" : "Initializing camera..."}
            </p>
          </div>
        )}

        {error && !visit && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Verifying visit...</p>
          </div>
        )}

        {visit && (
          <div className="mt-8 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6 border-2 border-green-500">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {error ? "Already Checked In" : "Successfully Checked In!"}
              </h2>
            </div>

            {error && (
              <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {visit.visitors?.name ?? "—"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{visit.visitors?.email ?? ""}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{visit.visitors?.phone ?? ""}</p>
                  {visit.visitors?.company && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {visit.visitors.company}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</p>
                  <p className="text-gray-900 dark:text-white">{visit.purpose}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Check-in Time
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {visit.check_in_time
                      ? new Date(visit.check_in_time).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Host</p>
                  <p className="text-gray-900 dark:text-white">{visit.hosts?.name ?? "—"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{visit.hosts?.email ?? ""}</p>
                </div>
              </div>

              {visit.valid_until && (
                <div className="flex items-start gap-4">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valid Until
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(visit.valid_until).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleScanAnother}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Scan Another QR Code
              </button>
              {!error && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print Badge
                </button>
              )}
            </div>

            {/* Hidden print-only visitor badge */}
            {!error && visit && (
              <div className="print-only hidden print:block fixed inset-0 bg-white p-8 z-[9999]">
                <div className="max-w-sm mx-auto border-4 border-blue-600 rounded-2xl p-6 text-center">
                  <div className="text-2xl font-black text-blue-700 mb-1">VISITOR PASS</div>
                  <div className="text-xs text-gray-400 mb-4">Visitor Management System</div>
                  <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-4xl font-black mx-auto mb-4">
                    {(visit.visitors?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{visit.visitors?.name ?? "—"}</div>
                  <div className="text-sm text-gray-500 mb-4">{visit.visitors?.email ?? ""}</div>
                  <div className="text-left space-y-2 bg-gray-50 rounded-xl p-4 text-sm">
                    <div><span className="font-semibold text-gray-600">Purpose:</span> {visit.purpose}</div>
                    <div><span className="font-semibold text-gray-600">Host:</span> {visit.hosts?.name ?? "—"}</div>
                    <div><span className="font-semibold text-gray-600">Check-in:</span> {visit.check_in_time ? new Date(visit.check_in_time).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—"}</div>
                    <div><span className="font-semibold text-gray-600">Visit ID:</span> <span className="font-mono text-xs">{visit.id.substring(0, 8).toUpperCase()}</span></div>
                  </div>
                  <div className="mt-4 text-[10px] text-gray-400">This pass is valid for one visit only. Please surrender at exit.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
