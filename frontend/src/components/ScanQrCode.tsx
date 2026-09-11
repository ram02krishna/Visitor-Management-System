import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import toast from "react-hot-toast";
import {
  CheckCircle,
  ScanLine,
  QrCode,
  Printer,
  AlertTriangle,
  MapPin,
  Car,
  Clock,
  ShieldCheck,
  GraduationCap,
  Users,
  RefreshCw,
  Camera,
  X,
  Volume2,
  VolumeX,
  Zap
} from "lucide-react";

import { PageHeader } from "./PageHeader";
import { api } from "../lib/api";
import { formatIST } from "../lib/dateIST";
import { useAuthStore } from "../store/auth";
import { CustomSelect } from "./ui/CustomSelect";
import { StudentGateKiosk } from "./StudentGateKiosk";

import type { Database } from "../lib/database.types";
import { CAMPUS_GATES } from "../lib/constants";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitor: Database["public"]["Tables"]["visitors"]["Row"];
  host: Database["public"]["Tables"]["hosts"]["Row"] | null;
};

interface OptimisticVisit {
  name?: string;
  purpose?: string;
  passType?: string;
  vehicle?: string;
  email?: string;
}

export function ScanQrCode() {
  const [scannerMode, setScannerMode] = useState<"visitors" | "students">("students");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [visit, setVisit] = useState<Visit | null>(null);
  const [optimisticVisit, setOptimisticVisit] = useState<OptimisticVisit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading } = useAuthStore();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [currentGate, setCurrentGate] = useState<string>(CAMPUS_GATES[0]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);


  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const manualInputRef = useRef<HTMLInputElement>(null);


  const playSound = useCallback((type: "success" | "warning" | "error") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "warning") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(370, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch {

    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setError("You must be logged in to scan QR codes");
      } else {
        setError(null);
      }
      setCheckingAuth(false);
    }
  }, [isAuthenticated, isLoading]);


  useEffect(() => {
    if (!isAuthenticated || checkingAuth || visit || scannerMode !== "visitors" || !isCameraActive) {
      if (scannerRef.current) {
        try {
          if (isScanningRef.current) {
            scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {

        }
        scannerRef.current = null;
        isScanningRef.current = false;
      }
      return;
    }

    let isMounted = true;
    const qrCodeDivId = "qr-reader";

    const stopScanner = async () => {
      if (scannerRef.current) {
        try {
          if (isScanningRef.current) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch {

        }
        scannerRef.current = null;
        isScanningRef.current = false;
      }
    };

    const startScanner = async () => {
      setIsCameraLoading(true);
      setError(null);

      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!isMounted) return;

      const container = document.getElementById(qrCodeDivId);
      if (!container) {
        if (isMounted) setIsCameraLoading(false);
        return;
      }

      await stopScanner();

      try {
        let devices: Array<{ id: string; label: string }> = [];
        try {
          const rawDevices = await Html5Qrcode.getCameras();
          if (rawDevices && rawDevices.length > 0) {
            devices = rawDevices.map((d, index) => ({
              id: d.id,
              label: d.label || `Camera ${index + 1}`
            }));
            if (isMounted) setAvailableCameras(devices);
          }
        } catch {

        }

        const scanner = new Html5Qrcode(qrCodeDivId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });

        const scanConfig = {
          fps: 25,
          aspectRatio: 1.0,
        };

        let cameraTarget: any = selectedCameraId;
        if (!cameraTarget) {
          const backCam = devices.find(d =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("environment") ||
            d.label.toLowerCase().includes("rear")
          );
          if (backCam) {
            cameraTarget = backCam.id;
          } else if (devices.length > 0) {
            cameraTarget = devices[0].id;
          } else {
            cameraTarget = { facingMode: "environment" };
          }
        }

        let started = false;
        try {
          await scanner.start(
            cameraTarget,
            scanConfig,
            (decodedText) => {
              handleScanSubmit(decodedText);
            },
            () => { }
          );
          started = true;
        } catch (firstErr) {
          console.warn("Visitor camera primary attempt failed, trying fallback...", firstErr);
          if (devices.length > 0) {
            try {
              await scanner.start(
                devices[0].id,
                scanConfig,
                (decodedText) => {
                  handleScanSubmit(decodedText);
                },
                () => { }
              );
              started = true;
            } catch (fallbackErr) {
              console.error("Camera device fallback failed", fallbackErr);
            }
          }

          if (!started) {
            try {
              await scanner.start(
                { facingMode: "user" },
                scanConfig,
                (decodedText) => {
                  handleScanSubmit(decodedText);
                },
                () => { }
              );
              started = true;
            } catch (userModeErr) {
              console.error("User mode fallback failed", userModeErr);
            }
          }
        }

        if (!started) {
          throw new Error("Unable to initialize camera scanner. Please grant camera permissions in your browser.");
        }

        if (isMounted) {
          scannerRef.current = scanner;
          isScanningRef.current = true;
          setError(null);

          try {
            const capabilities = scanner.getRunningTrackCameraCapabilities();
            setTorchSupported(Boolean(capabilities?.torchFeature?.()?.isSupported?.()));
          } catch {
            setTorchSupported(false);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Scanner error", err);
          setError(err instanceof Error ? err.message : "Camera initialization failed. Please check permissions.");
        }
      } finally {
        if (isMounted) {
          setIsCameraLoading(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isAuthenticated, checkingAuth, visit, isCameraActive, selectedCameraId, scannerMode]);

  const handleScanSubmit = useCallback((value: string) => {
    setScanResult(value);
    if (scannerRef.current && isScanningRef.current) {
      scannerRef.current.stop().catch(console.error);
      isScanningRef.current = false;
    }
  }, []);


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
          visitId = parsed.vId || parsed.visitId || parsed.id;

          setOptimisticVisit({
            name: parsed.n || parsed.name,
            purpose: parsed.p || parsed.purpose,
            passType: parsed.t || parsed.passType,
            vehicle: parsed.v || parsed.vehicle,
            email: parsed.e || parsed.email,
          });
        } catch {
          visitId = scanResult.trim();
        }

        const visitData = await api.visits.get(visitId);
        if (!visitData) throw new Error("Visit record not found in database");

        const currentVisit = visitData as Visit;
        if (currentVisit.visitor?.is_blacklisted) {
          playSound("error");
          setError(
            `SECURITY ALERT: Visitor is on the campus blacklist. Reason: ${currentVisit.visitor.blacklist_reason || "Security violation"}`
          );
          setVisit(currentVisit);
          return;
        }
        const now = new Date();
        if (
          currentVisit.status !== "approved" &&
          currentVisit.status !== "checked_in" &&
          currentVisit.status !== "completed"
        ) {
          throw new Error(`Invalid status: Visit is currently '${currentVisit.status}'.`);
        }

        if (currentVisit.valid_until && new Date(currentVisit.valid_until) < now) {
          throw new Error("Expired Pass: This visit registration is no longer valid.");
        }
        if (
          currentVisit.status === "approved" ||
          (currentVisit.pass_type === "multi_day" && currentVisit.status === "completed")
        ) {
          const updated = await api.visits.update(visitId, {
            check_in_time: now.toISOString(),
            status: "checked_in",
            entry_gate: currentGate,
            updated_at: now.toISOString(),
          });
          playSound("success");
          toast.success("Visitor Checked-in successfully");
          setVisit(updated as Visit);
        } else if (currentVisit.status === "checked_in") {
          const updated = await api.visits.update(visitId, {
            check_out_time: now.toISOString(),
            status: "completed",
            exit_gate: currentGate,
            updated_at: now.toISOString(),
          });
          playSound("success");
          toast.success("Visitor Checked-out successfully");
          setVisit(updated as Visit);
        }
      } catch (err: unknown) {
        playSound("error");
        const msg = err instanceof Error ? err.message : "Security verification failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsVerifying(false);
      }
    };

    processVisit();
  }, [scanResult, isAuthenticated, currentGate, playSound]);

  const handleScanAnother = useCallback(() => {
    setScanResult(null);
    setManualInput("");
    setVisit(null);
    setOptimisticVisit(null);
    setError(null);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim() || isVerifying) return;
    handleScanSubmit(manualInput.trim());
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: !isTorchOn }]
      });
      setIsTorchOn(!isTorchOn);
    } catch {
      toast.error("Torch control not available");
    }
  };

  if (checkingAuth)
    return (
      <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest text-xs text-gray-500">
        Verifying Credentials...
      </div>
    );

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <div className="print:hidden">
        <PageHeader
          backTo="/app/dashboard"
          icon={QrCode}
          gradient="from-indigo-600 to-sky-600"
          title="Gate Scanner"
          description="Real-time camera QR verification for visitor passes and student gatepasses."
        />


        <div className="mt-4 sm:mt-6 flex justify-center sm:justify-start">
          <div className="grid grid-cols-2 w-full sm:w-auto p-1.5 bg-gray-100 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-inner gap-1">
            <button
              type="button"
              onClick={() => setScannerMode("students")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${scannerMode === "students"
                  ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-md border border-gray-200/60 dark:border-slate-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span className="truncate">Student Outings</span>
            </button>

            <button
              type="button"
              onClick={() => setScannerMode("visitors")}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${scannerMode === "visitors"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md border border-gray-200/60 dark:border-slate-700"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">External Visitors</span>
            </button>
          </div>
        </div>
      </div>

      {scannerMode === "students" ? (
        <div className="mt-6">
          <StudentGateKiosk />
        </div>
      ) : (
        <div className="mt-6 space-y-6 print:m-0 print:space-y-0">
          {!visit && !optimisticVisit && (
            <>

              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative z-30">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400 tracking-wider">
                        Active Visitor Checkpoint
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Live Gate
                      </span>
                    </div>
                    <div className="w-full sm:w-64 mt-1">
                      <CustomSelect
                        value={currentGate}
                        onChange={setCurrentGate}
                        options={CAMPUS_GATES.map((g) => ({ value: g, label: g }))}
                        className="!py-1.5 !px-3 font-semibold text-xs sm:text-sm shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`btn btn-sm text-xs font-bold py-2.5 px-3.5 shadow-xs flex-1 sm:flex-initial justify-center transition-all ${soundEnabled
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                        : "btn-secondary"
                      }`}
                    title="Toggle Audio Feedback"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                    <span>{soundEnabled ? "Audio ON" : "Muted"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCameraActive(!isCameraActive)}
                    className={`btn btn-sm text-xs font-bold py-2.5 px-4 shadow-xs flex-1 sm:flex-initial justify-center transition-all ${isCameraActive
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 border-rose-500"
                        : "btn-primary shadow-indigo-500/20"
                      }`}
                  >
                    {isCameraActive ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    <span>{isCameraActive ? "Close Camera" : "Camera Scanner"}</span>
                  </button>
                </div>
              </div>


              {isCameraActive && (
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col items-center justify-center animate-fadeIn relative overflow-hidden">

                  <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Camera className="w-4 h-4" /> Live Visitor QR Camera
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {availableCameras.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
                            const nextIndex = (currentIndex + 1) % availableCameras.length;
                            setSelectedCameraId(availableCameras[nextIndex].id);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                          title="Switch Camera Device"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Switch Camera</span>
                        </button>
                      )}

                      {torchSupported && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${isTorchOn
                              ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                            }`}
                          title="Toggle Flashlight"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isTorchOn ? "Flash ON" : "Flash OFF"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsCameraActive(false)}
                        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
                        title="Close Camera"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>


                  <div className="w-full max-w-[340px] sm:max-w-[380px] aspect-square relative rounded-2xl overflow-hidden border-2 border-indigo-500/50 ring-4 ring-indigo-500/10 shadow-2xl bg-black flex items-center justify-center">
                    <div id="qr-reader" className="w-full h-full"></div>

                    {isCameraLoading && (
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-white gap-3 p-4 text-center z-10">
                        <ScanLine className="w-10 h-10 animate-pulse text-indigo-400" />
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
                          Connecting to Camera...
                        </p>
                        <p className="text-[11px] text-slate-500 max-w-[240px]">
                          Please allow camera access when prompted by your browser
                        </p>
                      </div>
                    )}

                    {error && (
                      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-white gap-3 p-6 text-center z-20">
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <AlertTriangle className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-amber-300 leading-relaxed max-w-[260px]">
                          {error}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setIsCameraLoading(true);
                            setSelectedCameraId(null);
                          }}
                          className="btn btn-sm btn-primary text-xs font-bold !px-4 !py-2 mt-1 shadow-lg"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                        </button>
                      </div>
                    )}

                    {!isCameraLoading && !error && (
                      <div className="absolute inset-0 pointer-events-none">

                        <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#818cf8] animate-scan-laser" />

                        <div className="absolute top-3 left-3 w-7 h-7 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                        <div className="absolute top-3 right-3 w-7 h-7 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                        <div className="absolute bottom-3 left-3 w-7 h-7 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                        <div className="absolute bottom-3 right-3 w-7 h-7 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 font-medium mt-3.5 text-center">
                    Point camera directly at Visitor Pass QR Code on mobile or printed badge
                  </p>
                </div>
              )}


              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-500 animate-pulse" />
                    Fast-Track Visitor Pass Scanner (QR / Pass ID / Code)
                  </label>
                  <span className="hidden sm:inline-flex text-[11px] font-medium text-gray-400 dark:text-slate-500">
                    Auto-detects Check-In & Check-Out
                  </span>
                </div>

                <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <div className="relative flex-1">
                    <input
                      ref={manualInputRef}
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      disabled={isVerifying}
                      placeholder="Scan Pass QR or enter Pass ID..."
                      className="w-full py-3 pl-4 pr-10 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-sm font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:font-sans placeholder:font-normal placeholder:text-gray-400 shadow-inner"
                    />
                    {manualInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualInput("");
                          manualInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition-colors"
                        title="Clear input"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying || !manualInput.trim()}
                    className="btn btn-primary py-3 px-6 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md shrink-0 justify-center min-w-[150px]"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify Visitor</span>
                    )}
                  </button>
                </form>

                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Ready for continuous USB/Bluetooth laser barcode scanner or keyboard entry.
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 p-6 rounded-2xl sm:rounded-2xl flex items-start gap-4 animate-fadeIn">
              <AlertTriangle className="w-8 h-8 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-red-900 dark:text-red-400 uppercase tracking-tight">
                  Access Denied / Verification Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed mt-1">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="btn-danger mt-4 !py-2 !px-4 flex items-center gap-2 text-xs font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next / Restart</span>
                </button>
              </div>
            </div>
          )}

          {(visit || optimisticVisit) && !error && (
            <div id="generated-pass" className="print:m-0 w-full flex justify-center animate-in zoom-in-95 duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 w-full shadow-2xl">
                <div
                  className={`p-6 sm:p-8 transition-colors duration-500 flex items-center justify-between ${isVerifying
                      ? "bg-gradient-to-r from-slate-600 to-slate-700 animate-pulse"
                      : visit?.status === "checked_in"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                        : "bg-gradient-to-r from-indigo-500 to-blue-600"
                    } text-white`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {isVerifying ? (
                      <Clock className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
                    ) : visit?.status === "checked_in" ? (
                      <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8" />
                    ) : (
                      <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                    )}
                    <div>
                      <h2 className="font-black uppercase tracking-widest text-sm sm:text-base">
                        {isVerifying
                          ? "Verifying..."
                          : visit?.status === "checked_in"
                            ? "Checked In"
                            : "Verified"}
                      </h2>
                      <p className="text-[10px] sm:text-xs opacity-80 font-medium">
                        {isVerifying ? "Please wait" : formatIST(new Date().toISOString())}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black bg-white/20 backdrop-blur-md px-4 py-1.5 sm:py-2 rounded-full uppercase tracking-widest">
                    {(visit?.pass_type || optimisticVisit?.passType || "Single Day").replace("_", " ")}
                  </span>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8 text-center sm:text-left">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl sm:text-5xl font-black text-slate-300 overflow-hidden shadow-lg border-4 border-white dark:border-slate-800 ring-4 ring-slate-50 dark:ring-slate-900/50 shrink-0">
                      {visit?.visitor?.photo_url ? (
                        <img src={visit.visitor.photo_url} className="w-full h-full object-cover" alt="Visitor" />
                      ) : (
                        (visit?.visitor?.name || optimisticVisit?.name || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate leading-none mb-3">
                        {visit?.visitor?.name || optimisticVisit?.name}
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center sm:items-start justify-center sm:justify-start">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
                          {visit?.visitor?.phone || optimisticVisit?.email || "N/A"}
                        </p>
                        {visit?.visitor?.email && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg truncate max-w-full border border-slate-200 dark:border-slate-700/50">
                            {visit.visitor.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Purpose
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate capitalize">
                        {(visit?.purpose || optimisticVisit?.purpose || "").replace("_", " ")}
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Host
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                        {visit?.host?.name || "Pending..."}
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Vehicle
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 uppercase truncate">
                        <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                        <span className="truncate">{visit?.vehicle_number || optimisticVisit?.vehicle || "None"}</span>
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Gate
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                        <span className="truncate">{currentGate}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 print-hide">
                    <button
                      onClick={handleScanAnother}
                      className="btn-primary flex-1 !py-3.5 !rounded-xl !text-sm font-bold"
                    >
                      Scan Next Visitor
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="btn-secondary !px-6 !py-3.5 !rounded-xl"
                      title="Print Receipt"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
