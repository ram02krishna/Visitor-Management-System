"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { toast } from "../../hooks/use-toast";
import { Camera, User, Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import type { Database } from "../lib/database.types";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitors: Database["public"]["Tables"]["visitors"]["Row"];
  hosts: Database["public"]["Tables"]["hosts"]["Row"];
};

export function ScanQrCode() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            setScanResult(decodedText);
            setIsScanning(false);
            if (scannerRef.current?.isScanning) {
              scannerRef.current.stop().catch(console.error);
            }
          },
          () => {}
        );
      } catch (err) {
        console.error("Scanner error:", err);
        setError("Failed to start QR code scanner. Please ensure camera permissions are granted.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    if (!scanResult) return;

    const fetchVisitDetails = async () => {
      setLoading(true);
      setError(null);
      setVisit(null);

      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("You must be logged in to scan QR codes");
        }

        console.log("Raw scanResult:", scanResult);
        
        // Parse QR code
        let visitId: string;
        try {
          const parsed = JSON.parse(scanResult);
          visitId = parsed.visitId;
        } catch (parseError) {
          // If it's not JSON, maybe it's just the visitId
          visitId = scanResult;
        }

        if (!visitId) {
          throw new Error("Invalid QR code format: visitId missing");
        }

        console.log("Looking up visit ID:", visitId);

        // Fetch visit with proper joins
        const { data: visitData, error: visitError } = await supabase
          .from("visits")
          .select(`
            *,
            visitors:visitor_id (*),
            hosts:host_id (*)
          `)
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
          throw new Error(`Visit status is '${visitData.status}'. Only approved visits can be checked in.`);
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
          .select(`
            *,
            visitors:visitor_id (*),
            hosts:host_id (*)
          `)
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
  }, [scanResult]);

  const handleScanAnother = () => {
    setScanResult(null);
    setVisit(null);
    setError(null);
    setIsScanning(true);
    
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        setScanResult(decodedText);
        setIsScanning(false);
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
      },
      () => {}
    ).catch(() => {
      setError("Failed to restart scanner");
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg">
              <Camera className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan QR Code</h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            Scan a visitor's QR code to check them in.
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-2xl mx-auto">
        {isScanning && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
            <div id="qr-reader" style={{ width: "100%" }}></div>
          </div>
        )}

        {error && (
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

        {visit && !error && (
          <div className="mt-8 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6 border-2 border-green-500">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Successfully Checked In!
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {visit.visitors.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {visit.visitors.email}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {visit.visitors.phone}
                  </p>
                  {visit.visitors.company && (
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
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Check-in Time</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(visit.check_in_time!).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Host</p>
                  <p className="text-gray-900 dark:text-white">{visit.hosts.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {visit.hosts.email}
                  </p>
                </div>
              </div>

              {visit.valid_until && (
                <div className="flex items-start gap-4">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Valid Until</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(visit.valid_until).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleScanAnother}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Scan Another QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}