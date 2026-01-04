"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { toast } from "../../hooks/use-toast";
import { Camera, User, Calendar, Clock, AlertTriangle } from "lucide-react";
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
            if (scannerRef.current?.isScanning) scannerRef.current.stop();
          },
          () => {}
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        setError("Failed to start QR code scanner. Please ensure camera permissions are granted.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!scanResult) return;

    const fetchVisitDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("Raw scanResult:", scanResult);
        const parsedScanResult = JSON.parse(scanResult);
        console.log("Parsed scanResult:", parsedScanResult);
        const { visitId } = parsedScanResult;
        if (!visitId) {
          throw new Error("Invalid QR code format: visitId missing.");
        }

        const { data, error } = await supabase
          .from("visits")
          .select("*, visitors(*), hosts(*)")
          .eq("id", visitId)
          .single();

        if (error) {
          throw error;
        }

        if (data.status !== "approved") {
          setError("Your visit is not approved by Guard.");
          setVisit(null);
        } else {
          const { error: updateError } = await supabase
            .from("visits")
            .update({
              check_in_time: new Date().toISOString(),
              status: "checked-in",
            })
            .eq("id", visitId);

          if (updateError) {
            throw updateError;
          }

          toast.success("Visitor checked in successfully!");
          setVisit(data as Visit);
        }
      } catch (err: unknown) {
        let errorMessage = "Failed to fetch visit details.";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitDetails();
  }, [scanResult]);

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
        <div id="qr-reader" style={{ width: "100%" }}></div>
        {error && (
          <div className="mt-4 text-red-500 text-center flex items-center justify-center gap-2">
            <AlertTriangle />
            {error}
          </div>
        )}
        {loading && <div className="mt-4 text-center">Loading...</div>}
        {visit && (
          <div className="mt-8 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Visit Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-semibold">{visit.visitors.name}</p>
                  <p className="text-sm text-gray-500">{visit.visitors.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-gray-500" />
                <p>Purpose: {visit.purpose}</p>
              </div>
              <div className="flex items-center gap-4">
                <Clock className="h-5 w-5 text-gray-500" />
                <p>Checked-in at: {new Date(visit.check_in_time!).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <User className="h-5 w-5 text-gray-500" />
                <p>Host: {visit.hosts.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
