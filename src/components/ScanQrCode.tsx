"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import {
  CheckCircle,
  ScanLine,
  User,
  Printer,
  LogIn,
  AlertTriangle,
  MapPin,
  Car,
  Clock,
  ShieldCheck
} from "lucide-react";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import type { Database } from "../lib/database.types";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitors: Database["public"]["Tables"]["visitors"]["Row"];
  hosts: Database["public"]["Tables"]["hosts"]["Row"];
};

const CAMPUS_GATES = ["Main Gate", "North Gate", "South Gate", "Administrative Block"];

export function ScanQrCode() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [optimisticVisit, setOptimisticVisit] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [scannerReady, setScannerReady] = useState(false);
  const [currentGate, setCurrentGate] = useState(CAMPUS_GATES[0]);
  const [scannerKey, setScannerKey] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsAuthenticated(false);
          setError("You must be logged in to scan QR codes");
        } else {
          setIsAuthenticated(true);
          setError(null);
        }
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || checkingAuth || visit) return;

    const qrCodeDivId = "qr-reader";
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 50));
        scanner = new Html5Qrcode(qrCodeDivId, {
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
          verbose: false
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { 
            fps: 20, // Lower FPS can be more stable on some devices
            qrbox: (viewfinderWidth, viewHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewHeight);
              // Reduced to 55% for a more focused scanning area
              const size = Math.floor(minEdge * 0.55);
              return { width: size, height: size };
            },
            aspectRatio: 1.0
          },
          (decodedText) => {
            setScanResult(decodedText);
            if (scanner?.isScanning) {
              scanner.stop().catch(console.error);
            }
          },
          () => { }
        );
        setScannerReady(true);
      } catch (err) {
        console.error("Scanner error", err);
        setError("Camera initialization failed. Please check permissions.");
      }
    };

    startScanner();
    
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current = null;
        }).catch(console.error);
      }
    };
  }, [isAuthenticated, checkingAuth, visit, scannerKey]);

  useEffect(() => {
    if (!scanResult || !isAuthenticated) return;

    const processVisit = async () => {
      setError(null);
      setVisit(null);
      setIsVerifying(true);

      try {
        let visitId: string;
        try {
          const parsed = JSON.parse(scanResult);
          // Handle both old and new (shortened) keys for compatibility
          visitId = parsed.vId || parsed.visitId;
          
          setOptimisticVisit({
            name: parsed.n || parsed.name,
            purpose: parsed.p || parsed.purpose,
            passType: parsed.t || parsed.passType,
            vehicle: parsed.v || parsed.vehicle,
            email: parsed.e || parsed.email
          });
        } catch {
          visitId = scanResult.trim();
        }

        const { data: visitData, error: visitError } = await supabase
          .from("visits")
          .select(`*, visitors:visitor_id (*), hosts:host_id (*)`)
          .eq("id", visitId)
          .single();

        if (visitError || !visitData) throw new Error("Visit record not found in database");
        
        const visit = visitData as Visit;

        // Security Check: Blacklist
        if (visit.visitors?.is_blacklisted) {
          setError(`SECURITY ALERT: Visitor is on the campus watchlist. Reason: ${visit.visitors.blacklist_reason || "Security violation"}`);
          setVisit(visit);
          return;
        }

        // Validity Check
        const now = new Date();
        if (visit.status !== "approved" && visit.status !== "checked-in" && visit.status !== "completed") {
          throw new Error(`Invalid status: Visit is currently '${visit.status}'.`);
        }

        if (visit.valid_until && new Date(visit.valid_until) < now) {
          throw new Error("Expired Pass: This visit registration is no longer valid.");
        }

        // Check-in / Check-out Logic
        if (visit.status === "approved" || (visit.pass_type === 'multi_day' && visit.status === 'completed')) {
          const { data: updated, error: uErr } = await supabase
            .from("visits")
            .update({
              check_in_time: now.toISOString(),
              status: "checked-in",
              entry_gate: currentGate,
              updated_at: now.toISOString()
            })
            .eq("id", visitId)
            .select(`*, visitors:visitor_id (*), hosts:host_id (*)`)
            .single();

          if (uErr) throw uErr;
          toast.success("Visitor Checked-in successfully");
          setVisit(updated as Visit);
        } else if (visit.status === "checked-in") {
          const { data: updated, error: uErr } = await supabase
            .from("visits")
            .update({
              check_out_time: now.toISOString(),
              status: "completed",
              exit_gate: currentGate,
              updated_at: now.toISOString()
            })
            .eq("id", visitId)
            .select(`*, visitors:visitor_id (*), hosts:host_id (*)`)
            .single();

          if (uErr) throw uErr;
          toast.success("Visitor Checked-out successfully");
          setVisit(updated as Visit);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Security verification failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsVerifying(false);
      }
    };

    processVisit();
  }, [scanResult, isAuthenticated, currentGate]);

  const handleScanAnother = () => {
    setScanResult(null);
    setVisit(null);
    setOptimisticVisit(null);
    setError(null);
    setScannerReady(false);
    setScannerKey(prev => prev + 1);
  };

  if (checkingAuth) return <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest text-xs text-gray-500">Verifying Credentials...</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <PageHeader 
          icon={ScanLine} 
          gradient="from-slate-800 to-slate-900" 
          title="Security Scanner" 
          description="Instant identity verification and campus traffic management." 
        />
      </div>

      <div className="mt-8 max-w-2xl mx-auto space-y-6">
        {/* Gate Selection */}
        {!visit && !optimisticVisit && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-all duration-300">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-widest mb-1">Current Gate Location</label>
              <select 
                value={currentGate}
                onChange={(e) => setCurrentGate(e.target.value)}
                className="w-full bg-transparent font-bold text-gray-900 dark:text-white outline-none cursor-pointer appearance-none"
              >
                {CAMPUS_GATES.map(g => <option key={g} value={g} className="dark:bg-slate-900">{g}</option>)}
              </select>
            </div>
          </div>
        )}

        {!visit && !optimisticVisit && (
          <div className="bg-slate-950 rounded-3xl shadow-2xl overflow-hidden relative aspect-square">
            <div id="qr-reader" className="w-full h-full"></div>
            {!scannerReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                <ScanLine className="w-12 h-12 animate-pulse text-indigo-400" />
                <p className="font-bold tracking-widest uppercase text-[10px] opacity-60">Initializing Camera...</p>
              </div>
            )}
            {scannerReady && (
              <div className="absolute inset-0 pointer-events-none border-[60px] border-black/30">
                <div className="w-full h-full border-2 border-indigo-500/50 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 p-6 rounded-3xl flex items-start gap-4 animate-shake">
            <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" />
            <div>
              <h3 className="font-black text-red-900 dark:text-red-400 uppercase tracking-tight">Access Denied</h3>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed mt-1">{error}</p>
              <button onClick={handleScanAnother} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Restart Scanner</button>
            </div>
          </div>
        )}

        {(visit || optimisticVisit) && !error && (
          <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-slate-800 animate-scaleIn">
            <div className={`p-6 ${visit ? (visit.status === 'checked-in' ? 'bg-emerald-500' : 'bg-indigo-600') : 'bg-slate-700'} text-white flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                {isVerifying ? <Clock className="w-6 h-6 animate-spin" /> : visit?.status === 'checked-in' ? <CheckCircle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                <h2 className="font-black uppercase tracking-widest text-sm">
                  {isVerifying ? 'Verifying Identity...' : (visit?.status === 'checked-in' ? 'Check-in Confirmed' : 'Verification Complete')}
                </h2>
              </div>
              <span className="text-[10px] font-black bg-white/20 px-4 py-1.5 rounded-full uppercase tracking-widest">
                {(visit?.pass_type || optimisticVisit?.passType || "Single Day").replace('_', ' ')}
              </span>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl font-black text-slate-300 overflow-hidden shadow-inner border-4 border-white dark:border-slate-700">
                  {visit?.visitors?.photo_url ? (
                    <img src={visit.visitors.photo_url} className="w-full h-full object-cover" />
                  ) : (visit?.visitors?.name || optimisticVisit?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate leading-none mb-2">
                    {visit?.visitors?.name || optimisticVisit?.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2">
                    {visit?.visitors?.phone || optimisticVisit?.email || "Verification in progress..."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visit Purpose</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{visit?.purpose || optimisticVisit?.purpose}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Host Personnel</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{visit?.hosts?.name || "Verifying..."}</p>
                </div>
                {(visit?.vehicle_number || optimisticVisit?.vehicle) && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Access</span>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 uppercase">
                      <Car className="w-4 h-4 text-indigo-500" /> {visit?.vehicle_number || optimisticVisit?.vehicle}
                    </p>
                  </div>
                )}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Point</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" /> {currentGate}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={handleScanAnother} 
                  className="flex-1 py-5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                >
                  Clear & Scan Next
                </button>
                <button 
                  onClick={() => window.print()} 
                  className="p-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 transition-colors shadow-inner"
                >
                  <Printer className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
