import { useState, useEffect, useRef, useCallback } from "react";
import { 
  QrCode, 
  AlertTriangle, 
  MapPin, 
  Clock, 
  User, 
  LogOut, 
  LogIn, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Camera, 
  X,
  Bike,
  CheckCircle2,
  Zap,
  Search
} from "lucide-react";

import { api } from "../lib/api";
import { toast } from "react-hot-toast";
import { formatIST } from "../lib/dateIST";
import { CustomSelect } from "./ui/CustomSelect";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { CAMPUS_GATES } from "../lib/constants";
import { dataSync } from "../lib/dataSync";

export function StudentGateKiosk() {
  const [selectedGate, setSelectedGate] = useState<string>(CAMPUS_GATES[0]);

  const [scanInput, setScanInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);


  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);


  const [plateQuery, setPlateQuery] = useState("");
  const [vehicleResult, setVehicleResult] = useState<any>(null);
  const [vehicleSearching, setVehicleSearching] = useState(false);
  

  const [lastScan, setLastScan] = useState<{
    success: boolean;
    action: "exit" | "entry";
    movement_type: string;
    message: string;
    expected_in?: string;
    is_overdue?: boolean;
    curfew_delay_minutes?: number;
    strikes?: number;
    is_flagged?: boolean;
    has_extension?: boolean;
    student: {
      id: string;
      roll_number: string;
      name: string;
      phone: string;
      hostel_block: string;
      room_number: string;
      branch: string;
      year: number;
      photo_url?: string | null;
      parent_name: string;
      parent_phone: string;
      status: string;
      late_strike_count?: number;
      is_flagged?: boolean;
    };
  } | null>(null);

  const [recentScans, setRecentScans] = useState<Array<typeof lastScan>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);


  const playSound = useCallback((type: "success" | "warning" | "error" | "siren") => {
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
      } else if (type === "siren") {
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
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


  const handleVehicleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateQuery.trim()) return;
    setVehicleSearching(true);
    try {
      const res = await api.vehicles.lookup(plateQuery.trim());
      setVehicleResult(res.pass);
      playSound("success");
      toast.success(`Authorized: ${res.pass.license_plate} (${res.pass.owner_name})`);
    } catch (err: unknown) {
      setVehicleResult({ unauthorized: true, plate: plateQuery.trim() });
      playSound("error");
      toast.error(err instanceof Error ? err.message : "Vehicle not registered");
    } finally {
      setVehicleSearching(false);
    }
  };


  useEffect(() => {
    if (!isCameraActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [lastScan, isCameraActive]);

  const handleScanSubmit = useCallback(async (value: string) => {
    if (!value || processing) return;
    const clean = value.trim();
    if (!clean) return;

    setProcessing(true);
    setScanInput("");

    try {
      const res = await api.students.scanPass({
        scanData: clean,
        gate: selectedGate
      });

      setLastScan(res);
      setRecentScans((prev) => [res, ...prev.slice(0, 9)]);
      dataSync.notify("students");

      if (res.is_flagged) {
        playSound("siren");
        toast.error(`🚨 HABITUAL DEFAULTER: ${res.student.name} (3/3 Strikes)! Report to Warden.`);
      } else if (res.is_overdue) {
        playSound("warning");
        toast.error(`Late Entry: ${res.student.name} (+${res.curfew_delay_minutes}m)`);
      } else {
        playSound("success");
        toast.success(`${res.action === "exit" ? "Exit" : "Entry"} Approved: ${res.student.name}`);
      }
    } catch (err: unknown) {
      playSound("error");
      const msg = err instanceof Error ? err.message : "Invalid or unrecognized Student ID";
      toast.error(msg);
    } finally {
      setProcessing(false);
      setTimeout(() => {
        if (!isCameraActive && inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [processing, selectedGate, playSound, isCameraActive]);


  useEffect(() => {
    let isMounted = true;

    const stopExistingScanner = async () => {
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

    if (!isCameraActive) {
      stopExistingScanner();
      return;
    }

    const startCamera = async () => {
      setIsCameraLoading(true);
      setCameraError(null);

      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!isMounted) return;

      const container = document.getElementById("student-qr-reader");
      if (!container) {
        if (isMounted) {
          setCameraError("Camera container element not found. Please try again.");
          setIsCameraLoading(false);
        }
        return;
      }

      await stopExistingScanner();

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
        } catch (camListErr) {
          console.warn("Could not pre-fetch camera list:", camListErr);
        }

        const scanner = new Html5Qrcode("student-qr-reader", {
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
            () => {}
          );
          started = true;
        } catch (firstErr) {
          console.warn("Camera start failed with primary target, trying fallback...", firstErr);
          if (devices.length > 0) {
            try {
              await scanner.start(
                devices[0].id,
                scanConfig,
                (decodedText) => {
                  handleScanSubmit(decodedText);
                },
                () => {}
              );
              started = true;
            } catch (fallbackErr) {
              console.error("Device ID fallback failed:", fallbackErr);
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
                () => {}
              );
              started = true;
            } catch (userModeErr) {
              console.error("User facing fallback failed:", userModeErr);
            }
          }
        }

        if (!started) {
          throw new Error("Unable to start video stream. Please check camera permissions in browser.");
        }

        if (isMounted) {
          scannerRef.current = scanner;
          isScanningRef.current = true;
          setCameraError(null);

          try {
            const capabilities = scanner.getRunningTrackCameraCapabilities();
            setTorchSupported(Boolean(capabilities?.torchFeature?.()?.isSupported?.()));
          } catch {
            setTorchSupported(false);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Camera access denied or camera is in use by another app.";
          setCameraError(msg);
          toast.error("Camera scanner error");
        }
      } finally {
        if (isMounted) {
          setIsCameraLoading(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopExistingScanner();
    };
  }, [isCameraActive, selectedCameraId, handleScanSubmit]);


  const toggleCamera = () => {
    setIsCameraActive((prev) => !prev);
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

  return (
    <div className="space-y-6">

      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/40 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400 tracking-wider">
                Checkpoint Gate
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Gate
              </span>
            </div>
            <div className="w-full sm:w-64 mt-1">
              <CustomSelect
                value={selectedGate}
                onChange={setSelectedGate}
                options={CAMPUS_GATES.map((gate) => ({ value: gate, label: gate }))}
                className="!py-1.5 !px-3 text-xs sm:text-sm font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto justify-end shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`btn btn-sm text-xs font-bold py-2.5 px-3.5 shadow-xs flex-1 sm:flex-initial justify-center transition-all ${
              soundEnabled
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
            onClick={toggleCamera}
            className={`btn btn-sm text-xs font-bold py-2.5 px-4 shadow-xs flex-1 sm:flex-initial justify-center transition-all ${
              isCameraActive 
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 border-rose-500" 
                : "btn-primary shadow-sky-500/20"
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
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> Live Camera Scanner
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
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                    isTorchOn
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
                onClick={toggleCamera}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
                title="Close Camera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>


          <div className="w-full max-w-[340px] sm:max-w-[380px] aspect-square relative rounded-2xl overflow-hidden border-2 border-sky-500/50 ring-4 ring-sky-500/10 shadow-2xl bg-black flex items-center justify-center">
            <div id="student-qr-reader" className="w-full h-full" />

            {isCameraLoading && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-white gap-3 p-4 text-center z-10">
                <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  Connecting to Camera...
                </p>
                <p className="text-[11px] text-slate-500 max-w-[240px]">
                  Please allow camera access when prompted by your browser
                </p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-white gap-3 p-6 text-center z-20">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <p className="text-xs font-bold text-amber-300 leading-relaxed max-w-[260px]">
                  {cameraError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setIsCameraLoading(true);
                    setSelectedCameraId(null);
                  }}
                  className="btn btn-sm btn-primary text-xs font-bold !px-4 !py-2 mt-1 shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </button>
              </div>
            )}

            {!isCameraLoading && !cameraError && (
              <div className="absolute inset-0 pointer-events-none">

                <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-scan-laser" />

                <div className="absolute top-3 left-3 w-7 h-7 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                <div className="absolute top-3 right-3 w-7 h-7 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-7 h-7 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 w-7 h-7 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 font-medium mt-3.5 text-center">
            Align Student Pass QR Code within the viewfinder for instant verification
          </p>
        </div>
      )}


      <div className="p-5 sm:p-6 rounded-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <QrCode className="w-4 h-4 text-sky-500 animate-pulse" />
            Fast-Track Pass Scanner (QR / Barcode / Roll No)
          </label>
          <span className="hidden sm:inline-flex text-[11px] font-medium text-gray-400 dark:text-slate-500">
            Auto-detects Exit & Entry
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScanSubmit(scanInput);
          }}
          className="flex flex-col sm:flex-row items-stretch gap-2.5"
        >
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              disabled={processing}
              autoFocus
              placeholder="Scan QR or enter Roll No (e.g. BT23CSE026)..."
              className="w-full py-3 pl-4 pr-10 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl sm:rounded-2xl text-sm font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:font-sans placeholder:font-normal placeholder:text-gray-400 shadow-inner"
            />
            {scanInput && (
              <button
                type="button"
                onClick={() => {
                  setScanInput("");
                  inputRef.current?.focus();
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
            disabled={processing || !scanInput.trim()}
            className="btn btn-primary py-3 px-6 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md shrink-0 justify-center min-w-[140px]"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify Pass</span>
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Ready for continuous USB/Bluetooth laser barcode scanner or keyboard entry.
        </p>
      </div>


      <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        <form onSubmit={handleVehicleLookup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0 shadow-sm">
              <Bike className="w-4 h-4" />
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={plateQuery}
                onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
                placeholder="Vehicle Plate (e.g. MH 31 AB 1234)..."
                className="w-full py-2 pl-3 pr-8 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800/60 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-purple-500 dark:text-white placeholder:font-sans placeholder:font-normal"
              />
              {plateQuery && (
                <button
                  type="button"
                  onClick={() => setPlateQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  title="Clear plate query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={vehicleSearching || !plateQuery.trim()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs shrink-0 self-stretch sm:self-auto flex items-center justify-center gap-1.5 transition-all"
          >
            {vehicleSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>{vehicleSearching ? "Checking..." : "Check"}</span>
          </button>
        </form>

        {vehicleResult && (
          <div className="flex items-center gap-2 self-stretch sm:self-auto text-xs animate-fadeIn justify-between sm:justify-start">
            {vehicleResult.unauthorized ? (
              <span className="px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold flex items-center gap-1.5 border border-red-500/30">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Unregistered Vehicle ({vehicleResult.plate})
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Authorized: {vehicleResult.license_plate} ({vehicleResult.owner_name})
              </span>
            )}
            <button
              onClick={() => { setVehicleResult(null); setPlateQuery(""); }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>


      {lastScan && (
        <div
          className={`p-5 sm:p-6 rounded-2xl sm:rounded-2xl border shadow-xl transition-all animate-fadeIn relative ${
            lastScan.is_overdue
              ? "bg-red-50/90 dark:bg-red-950/40 border-red-500/50"
              : lastScan.action === "exit"
              ? "bg-amber-50/90 dark:bg-amber-950/30 border-amber-500/50"
              : "bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-500/50"
          }`}
        >
          <button
            type="button"
            onClick={() => setLastScan(null)}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-slate-300 transition-all"
            title="Dismiss result"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-gray-200/60 dark:border-slate-800 pr-8 md:pr-0">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-2xl font-black text-sky-600">
                {lastScan.student.photo_url ? (
                  <img
                    src={lastScan.student.photo_url}
                    alt={lastScan.student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  lastScan.student.name ? lastScan.student.name.charAt(0).toUpperCase() : <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                      lastScan.action === "exit"
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    {lastScan.action === "exit" ? (
                      <>
                        <LogOut className="w-3.5 h-3.5" /> CAMPUS EXIT
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3.5 h-3.5" /> CAMPUS ENTRY
                      </>
                    )}
                  </span>

                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase">
                    {lastScan.movement_type === "hostel_leave" ? "Hostel Leave" : "Day Outing"}
                  </span>
                  
                  {lastScan.is_overdue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-black uppercase tracking-wider animate-bounce">
                      <AlertTriangle className="w-3.5 h-3.5" /> LATE ENTRY {lastScan.curfew_delay_minutes ? `(+${lastScan.curfew_delay_minutes}m)` : ""}
                    </span>
                  )}

                  {((lastScan.student as any).is_flagged || (lastScan.student as any).late_strike_count >= 3) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-600 text-white text-xs font-black uppercase tracking-wider animate-pulse">
                      🚨 HABITUAL DEFAULTER (3/3 Strikes)
                    </span>
                  ) : (lastScan.student as any).late_strike_count > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-xs font-black uppercase tracking-wider">
                      ⚠️ Strike {(lastScan.student as any).late_strike_count}/3
                    </span>
                  ) : null}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {lastScan.student.name}
                </h2>
                <p className="text-xs font-mono font-bold text-gray-500 dark:text-slate-400">
                  {lastScan.student.roll_number} • B.Tech {lastScan.student.branch} (Year {lastScan.student.year || 1})
                </p>
              </div>
            </div>

            <div className="text-left md:text-right bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-gray-200/50 dark:border-slate-800 shadow-xs w-full md:w-auto">
              <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                Expected In-Time / Curfew
              </p>
              <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5 md:justify-end mt-0.5">
                <Clock className="w-4 h-4 text-sky-500" />
                {lastScan.expected_in ? formatIST(lastScan.expected_in) : "09:30 PM (IST)"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/40 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hostel & Room</span>
              <p className="font-bold text-gray-900 dark:text-white mt-0.5 truncate text-sm">
                {lastScan.student.hostel_block}, Rm {lastScan.student.room_number}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/40 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student Phone</span>
              <p className="font-mono font-bold text-gray-900 dark:text-white mt-0.5 truncate text-sm">
                {lastScan.student.phone || "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/40 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parent Phone</span>
              <p className="font-mono font-bold text-gray-900 dark:text-white mt-0.5 truncate text-sm">
                {lastScan.student.parent_phone || "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-gray-200/40 dark:border-slate-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Curfew Status</span>
              <p className={`font-bold mt-0.5 truncate text-sm ${lastScan.is_overdue ? "text-red-500" : "text-emerald-500"}`}>
                {lastScan.is_overdue ? "Curfew Violated" : "Within Curfew"}
              </p>
            </div>
          </div>
        </div>
      )}


      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-500" /> Recent Checkpoint Activity
        </h3>

        {recentScans.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center font-medium">
            No student scans recorded yet this session.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
            {recentScans.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      item?.action === "exit" ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {item?.student.name}
                  </span>
                  <span className="font-mono text-gray-400 text-[11px]">({item?.student.roll_number})</span>
                  <span className="hidden sm:inline text-gray-400">
                    • {item?.student.hostel_block}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      item?.action === "exit"
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {item?.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
