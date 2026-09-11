import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  UserCheck,
  Package,
  Briefcase,
  Crown,
  Camera,
  Printer,
  RefreshCw,
  Clock,
  ArrowRight,
  MonitorSmartphone,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import QRCode from "qrcode";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import { ThemeSwitcher } from "./ThemeSwitcher";

type KioskCategory = "guest" | "courier" | "interview" | "vip";

export function SelfServiceKiosk() {
  const location = useLocation();
  const isStandalone = !location.pathname.startsWith("/app");
  const [step, setStep] = useState<"category" | "details" | "photo" | "badge">("category");
  const [category, setCategory] = useState<KioskCategory>("guest");
  const [currentTime, setCurrentTime] = useState("");


  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [purpose, setPurpose] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdVisit, setCreatedVisit] = useState<any | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);


  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);


  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Camera access failed:", err);
      toast.error("Camera access unavailable. You can upload a photo file directly.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setPhotoData(dataUrl);
      stopCamera();
      toast.success("Visitor photo captured!");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoData(reader.result as string);
        stopCamera();
        toast.success("Photo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategorySelect = (cat: KioskCategory) => {

    setCategory(cat);
    if (cat === "courier") {
      setPurpose("Campus Courier / Logistics Parcel Delivery");
    } else if (cat === "interview") {
      setPurpose("Candidate Job Interview / Placement Round");
    } else if (cat === "vip") {
      setPurpose("VIP Official Visit / Dignitary Meeting");
    } else {
      setPurpose("");
    }
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !purpose.trim()) {
      toast.error("Please fill in your Name, Phone, and Purpose.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.visits.selfServiceKiosk({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        purpose: purpose.trim(),
        category,
        vehicle_number: vehicleNumber.trim() || undefined,
        photo_url: photoData || undefined,
      });

      setCreatedVisit(res.visit);
      try {
        const qrUrl = await QRCode.toDataURL(res.qrPayload, {
          width: 250,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setQrCodeUrl(qrUrl);
      } catch {

      }
      setStep("badge");
      toast.success("Self check-in completed! Here is your entry badge.");
    } catch (err: any) {
      toast.error(err.message || "Failed to process self check-in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
    setPurpose("");
    setVehicleNumber("");
    setPhotoData(null);
    setCreatedVisit(null);
    setQrCodeUrl(null);
    setStep("category");
  };


  return (
    <div
      className={
        isStandalone
          ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-16 animate-fadeIn space-y-6 min-h-screen"
          : "space-y-6 pb-8 animate-fadeIn"
      }
    >
      {isStandalone && (
        <div className="flex items-center justify-between">
          <BackButton to="/" className="mb-0 flex items-center gap-2" />
          <ThemeSwitcher />
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <PageHeader
          backTo={isStandalone ? undefined : "/app/dashboard"}
          icon={MonitorSmartphone}
          gradient="from-sky-500 via-blue-600 to-indigo-600"
          title="Reception Kiosk"
          description="Self-service visitor check-in, webcam photo capture, and instant QR badge issuance."
        />


        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-sm font-mono font-bold text-gray-700 dark:text-slate-300 shadow-sm">
            <Clock className="w-4 h-4 text-sky-500" />
            <span>{currentTime || "IST"}</span>
          </div>

          {step !== "category" && (
            <button
              onClick={handleReset}
              className="btn btn-secondary text-xs sm:text-sm font-bold flex items-center gap-1.5 py-2.5 px-4 shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start Over</span>
            </button>
          )}
        </div>
      </div>


      {step === "category" && (
        <div className="my-6 space-y-6">

          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
              Welcome to Campus! Please select your visit type:
            </h2>
            <p className="text-base text-gray-500 dark:text-slate-400 font-medium">
              Tap an option below to begin instant self-registration
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2">

            <div
              onClick={() => handleCategorySelect("guest")}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-sky-500/30 bg-sky-50/20 dark:bg-sky-950/20 shadow-sm hover:shadow-md hover:border-sky-500/60 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-sky-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    General Visitor
                  </span>
                  <UserCheck className="w-5 h-5 text-sky-500 shrink-0" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 my-1">
                  General Entry
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 leading-relaxed">
                  Meeting faculty, students, academic departments, or campus tour.
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-sky-500/15 dark:border-sky-500/25 text-xs font-bold text-sky-600 dark:text-sky-400">
                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-bold uppercase text-gray-400">Instant Pass</span>
              </div>
            </div>


            <div
              onClick={() => handleCategorySelect("courier")}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20 shadow-sm hover:shadow-md hover:border-amber-500/60 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-amber-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Courier Drop-Off
                  </span>
                  <Package className="w-5 h-5 text-amber-500 shrink-0" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 my-1">
                  Fast Delivery
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 leading-relaxed">
                  Amazon, Flipkart, Swiggy, Speed Post, or logistics parcel delivery.
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-500/15 dark:border-amber-500/25 text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Fast Drop-Off <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-bold uppercase text-gray-400">Quick Gate</span>
              </div>
            </div>


            <div
              onClick={() => handleCategorySelect("interview")}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm hover:shadow-md hover:border-indigo-500/60 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-indigo-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Candidate Interview
                  </span>
                  <Briefcase className="w-5 h-5 text-indigo-500 shrink-0" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 my-1">
                  Recruitment
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 leading-relaxed">
                  Attending recruitment, academic viva, or placement rounds.
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-indigo-500/15 dark:border-indigo-500/25 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Candidate Entry <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-bold uppercase text-gray-400">HR / Placement</span>
              </div>
            </div>


            <div
              onClick={() => handleCategorySelect("vip")}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-500/40 bg-purple-50/30 dark:bg-purple-950/30 shadow-sm hover:shadow-md hover:border-purple-500/70 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-purple-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    VIP & Dignitary
                  </span>
                  <Crown className="w-5 h-5 text-purple-500 shrink-0" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 my-1">
                  VIP Fast-Pass
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 leading-relaxed">
                  Board of Governors, Guest Speakers, Officials, and Recruiters.
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-500/15 dark:border-purple-500/25 text-xs font-bold text-purple-600 dark:text-purple-400">
                <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Priority Clearance <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">VIP Bay</span>
              </div>
            </div>
          </div>
        </div>
      )}




      {step === "details" && (
        <form onSubmit={handleSubmit} className="my-6 space-y-6 max-w-3xl mx-auto w-full">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white capitalize">
                  {category === "vip" ? "👑 VIP Dignitary Check-In" : category === "courier" ? "📦 Courier Drop-Off" : "Visitor Information"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Please enter your basic contact details for badge generation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("category")}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white underline"
              >
                Change Type
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9823456789"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Email Address <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rajesh@gmail.com"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Company / Organization <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={category === "courier" ? "e.g. BlueDart / Amazon" : "e.g. TCS / Self"}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Purpose of Visit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Meeting Dean of Academics / Delivering package to Hostel A"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Vehicle License Plate <span className="text-gray-400">(If driving)</span>
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH 31 AB 1234"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm font-mono font-bold uppercase text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>


              <div className="flex flex-col justify-end">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Visitor Photo Badge (Optional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {photoData ? (
                    <div className="flex items-center gap-3 p-2 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <img
                        src={photoData}
                        alt="Captured Badge"
                        className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500 shadow-sm"
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoData(null);
                            startCamera();
                          }}
                          className="btn btn-sm btn-secondary text-xs font-bold py-1 px-3"
                        >
                          Retake Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoData(null);
                            stopCamera();
                          }}
                          className="text-[11px] font-bold text-red-500 hover:text-red-600 text-left px-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : isCameraActive ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-700 shadow-xl">
                      <div className="w-36 h-28 rounded-xl overflow-hidden bg-black border border-slate-700 relative">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold uppercase animate-pulse">
                          LIVE
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="btn btn-sm btn-primary text-xs font-bold flex items-center gap-2 py-2 px-3 shadow-md"
                        >
                          <Camera className="w-4 h-4" />
                          <span>📸 Snap Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="btn btn-sm btn-secondary text-xs font-bold py-1 px-3"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="btn btn-sm btn-secondary text-xs font-bold flex items-center gap-2 py-2.5 px-4 shadow-xs"
                      >
                        <Camera className="w-4 h-4 text-sky-500" />
                        <span>Take Photo for Badge</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-sm btn-secondary text-xs font-bold flex items-center gap-2 py-2.5 px-3 shadow-xs"
                      >
                        <UploadCloud className="w-4 h-4 text-slate-400" />
                        <span>Upload Photo</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>



            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep("category")}
                className="btn btn-secondary px-6"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary px-8 py-3 text-sm font-bold flex items-center gap-2 shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Printing Badge...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Complete & Print Badge</span>
                  </>

                )}
              </button>
            </div>
          </div>
        </form>
      )}


      {step === "badge" && createdVisit && (
        <div className="my-6 space-y-6 max-w-md mx-auto w-full animate-fadeIn">

          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border-2 border-sky-500/40 dark:border-sky-500/30 shadow-2xl space-y-5 print:border-none print:shadow-none">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-sky-600 dark:text-sky-400">
                  IIIT NAGPUR • CAMPUS PASS
                </span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {createdVisit.visitor?.name || name}
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${
                createdVisit.is_vip
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-400/40"
                  : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              }`}>
                {createdVisit.is_vip ? "👑 VIP GUEST" : "🟢 ACTIVE PASS"}
              </span>
            </div>


            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 shadow-inner">
              <div className="p-2 bg-white rounded-xl shadow-md">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Visitor Pass QR"
                    className="w-36 h-36 object-contain"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-gray-400 font-mono">
                    Generating QR...
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-gray-400 font-bold mt-2">
                SCAN AT SECURITY CHECKPOINTS
              </span>
            </div>



            <div className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold uppercase">Purpose:</span>
                <span className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                  {createdVisit.purpose}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-400 font-semibold uppercase">Mobile:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {createdVisit.visitor?.phone || phone}
                </span>
              </div>
              {vehicleNumber && (
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                  <span className="text-gray-400 font-semibold uppercase">Vehicle:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {vehicleNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-gray-400 font-semibold uppercase">Valid Until:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  Today, 09:30 PM IST
                </span>
              </div>
            </div>


            <div className="pt-3 flex flex-col gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Badge</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary w-full text-xs font-bold"
              >
                Done • Next Visitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
