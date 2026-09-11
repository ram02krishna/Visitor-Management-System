import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../store/auth";
import { useVisitRegistration, type UnifiedVisitFormData } from "../hooks/useVisitRegistration";

import {
  Camera,
  UserPlus,
  Calendar,
  FileText,
  User,
  QrCode,
  Download,
  ShieldCheck,
  Users,
  Car,
  FileUp,
  AlertTriangle,
  Printer,
} from "lucide-react";

import { PageHeader } from "./PageHeader";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { CustomSelect } from "./ui/CustomSelect";
import { BackButton } from "./BackButton";

export function UnifiedVisitRegistration() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isStandalone = !location.pathname.startsWith("/app");

  useEffect(() => {
    if (user?.role === "student") {
      navigate("/app/student-pass");
    }
  }, [user?.role, navigate]);

  const formMethods = useForm<UnifiedVisitFormData>({
    defaultValues: {
      passType: "single_day",
      additionalGuests: 0,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = formMethods;

  const {
    loading,
    errorMessage,
    previewPhoto,
    previewIdProof,
    qrImageUrl,
    lastVisitId,
    isBlacklisted,
    isVisitor,
    handleFilePreview,
    onSubmit,
    handleReset,
    setPreviewPhoto,
    setPreviewIdProof,
    passType,
  } = useVisitRegistration(formMethods);

  const visitDate = watch("visitDate");

  const registrationContent = (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden print:shadow-none print:border-none">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-8 print:hidden">
          {errorMessage && (
            <div
              className={`rounded-xl p-4 flex items-center gap-3 border ${
                isBlacklisted
                  ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
              }`}
            >
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  Identity Details
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Personal contact information of the primary visitor
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="words"
                  autoComplete="name"
                  {...register("name", {
                    required: "Name is required",
                    onChange: (e) => {
                      const val = e.target.value;
                      if (val.length > 0) {
                        e.target.value = val.charAt(0).toUpperCase() + val.slice(1);
                      }
                    },
                  })}
                  disabled={isVisitor}
                  className="block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="John Doe"
                />
                {errors.name && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.name.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  {...register("email", { required: "Email is required" })}
                  disabled={isVisitor}
                  className="block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={10}
                  {...register("phone", {
                    required: "Phone is required",
                    pattern: { value: /^\d{10}$/, message: "Exactly 10 digits required" },
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    },
                  })}
                  className={`block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs ${
                    errors.phone ? "border-red-500 ring-1 ring-red-500" : ""
                  }`}
                  placeholder="9876543210"
                />
                {errors.phone && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.phone.message}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Additional Guests
                </label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min={0}
                    max={10}
                    {...register("additionalGuests", { min: 0, max: 10 })}
                    className="block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs font-semibold"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  Documents & Vehicle
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Optional ID verification and campus parking clearance
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Verification Photos <span className="lowercase font-normal text-gray-400">(optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="group relative flex flex-col items-center justify-center h-28 sm:h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-400 transition-all cursor-pointer overflow-hidden bg-gray-50/50 dark:bg-slate-800/30">
                    {previewPhoto ? (
                      <div className="relative w-full h-full group">
                        <img src={previewPhoto} className="w-full h-full object-cover" alt="Live Photo Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs text-white font-semibold">Change</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-2">
                        <Camera className="mx-auto h-6 w-6 text-gray-400 group-hover:text-sky-500 transition-colors" />
                        <span className="mt-1.5 block text-xs font-bold text-gray-600 dark:text-slate-300">
                          Live Photo
                        </span>
                        <span className="text-[10px] text-gray-400">Upload photo</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      {...register("photo")}
                      onChange={(e) => handleFilePreview(e, setPreviewPhoto)}
                    />
                  </label>

                  <label className="group relative flex flex-col items-center justify-center h-28 sm:h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer overflow-hidden bg-gray-50/50 dark:bg-slate-800/30">
                    {previewIdProof ? (
                      <div className="relative w-full h-full group">
                        <img src={previewIdProof} className="w-full h-full object-cover" alt="Govt ID Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-xs text-white font-semibold">Change</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-2">
                        <FileText className="mx-auto h-6 w-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        <span className="mt-1.5 block text-xs font-bold text-gray-600 dark:text-slate-300">
                          Govt ID Proof
                        </span>
                        <span className="text-[10px] text-gray-400">Aadhaar/License</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      {...register("idProof")}
                      onChange={(e) => handleFilePreview(e, setPreviewIdProof)}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Vehicle Number
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      {...register("vehicleNumber")}
                      className="block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs font-semibold uppercase"
                      placeholder="MH-31-AB-1234"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Vehicle Type
                  </label>
                  <CustomSelect
                    value={watch("vehicleType") || ""}
                    onChange={(val) => setValue("vehicleType", val as "2-wheeler" | "4-wheeler" | "other" | "")}
                    options={[
                      { value: "", label: "No Vehicle" },
                      { value: "2-wheeler", label: "2-Wheeler (Bike/Scooter)" },
                      { value: "4-wheeler", label: "4-Wheeler (Car/Cab)" },
                      { value: "other", label: "Other" }
                    ]}
                    placeholder="Select Vehicle Type"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                  Visit Logistics
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Pass duration, dates, and purpose of visit
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Pass Type
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setValue("passType", "single_day")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      passType === "single_day"
                        ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                  >
                    Single Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("passType", "multi_day")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      passType === "multi_day"
                        ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                        : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                  >
                    Multi-Day
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Approver Email
                </label>
                <input
                  type="email"
                  {...register("hostEmail")}
                  disabled
                  placeholder={isVisitor || !user ? "Campus Administration" : "Assigned to You"}
                  className="block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/80 px-4 py-2.5 text-sm text-gray-600 dark:text-slate-400 italic cursor-not-allowed opacity-80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {passType === "multi_day" ? "Valid From *" : "Visit Date *"}
                </label>
                <input
                  type="date"
                  {...register("visitDate", { required: "Date is required" })}
                  min={new Date().toISOString().split("T")[0]}
                  className="block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
                />
                {errors.visitDate && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.visitDate.message}
                  </span>
                )}
              </div>

              {passType === "multi_day" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    {...register("validUntil", { required: "End date is required" })}
                    min={visitDate || new Date().toISOString().split("T")[0]}
                    className="block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
                  />
                  {errors.validUntil && (
                    <span className="text-xs text-red-500 font-medium block mt-1">
                      {errors.validUntil.message}
                    </span>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Purpose of Visit *
                </label>
                <input
                  type="text"
                  {...register("purpose", { required: "Purpose is required" })}
                  className="block w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
                  placeholder="e.g. Official Meeting, Campus Tour, Guest Lecture, Parent Visit..."
                />
                {errors.purpose && (
                  <span className="text-xs text-red-500 font-medium block mt-1">
                    {errors.purpose.message}
                  </span>
                )}
              </div>
            </div>
          </section>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="btn-primary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>
                    {isVisitor || !user
                      ? "Submit Request & Generate Pass"
                      : "Register Visit & Generate Pass"}
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary !px-6 !py-3 text-sm font-semibold"
            >
              Reset
            </button>
          </div>
        </form>

        {qrImageUrl && (
          <div
            id="generated-pass"
            className="px-4 sm:px-8 pb-8 print:m-0"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent mb-8 print-hide" />
            <div className="flex justify-center">
              <div className="w-full max-w-sm relative">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border border-gray-200 dark:border-slate-800">
                  <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600" />

                  <div className="p-6 sm:p-7 flex flex-col items-center">
                    <div className="w-full flex items-start justify-between mb-5">
                      <div>
                        <h4 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                          Entry Pass
                        </h4>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 font-semibold uppercase tracking-widest">
                          IIIT Nagpur Campus
                        </p>
                      </div>
                    </div>

                    <div className="w-full mb-5">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-3 flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse shrink-0" />
                        <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider">
                          Pending Approval
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 rounded-2xl p-4 shadow-xs border border-gray-200 dark:border-slate-800 mb-5 opacity-90 transition-all hover:opacity-100">
                      <img src={qrImageUrl} alt="QR Code" className="w-44 h-44 sm:w-48 sm:h-48" />
                    </div>

                    <div className="w-full bg-gray-50/80 dark:bg-slate-800/40 rounded-xl p-4 mb-5 border border-gray-100 dark:border-slate-800 space-y-3.5">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                          Reference ID
                        </p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white break-all">
                          {lastVisitId || "Pending"}
                        </p>
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-slate-700/50" />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                            Visitor Name
                          </p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                            {watch("name") || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                            Host
                          </p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                            {isVisitor ? "Campus Administration" : watch("hostEmail")}
                          </p>
                        </div>
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-slate-700/50" />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                            {watch("passType") === "multi_day" ? "Valid From" : "Visit Date"}
                          </p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-200">
                            {watch("visitDate")
                              ? new Date(watch("visitDate")).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "---"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                            Pass Type
                          </p>
                          <p className="text-xs sm:text-sm font-semibold text-sky-600 dark:text-sky-400 capitalize">
                            {watch("passType")?.replace("_", " ")}
                          </p>
                        </div>
                        {watch("passType") === "multi_day" && watch("validUntil") && (
                          <div className="col-span-2">
                            <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                              Valid Until
                            </p>
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-slate-200">
                              {new Date(watch("validUntil")!).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-slate-700/50" />

                      <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                          Purpose of Visit
                        </p>
                        <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-slate-200 capitalize">
                          {watch("purpose")?.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-3">
                      <a
                        href={qrImageUrl}
                        download={`iiitn-pass-${watch("name")?.replace(/\s+/g, "-").toLowerCase()}.png`}
                        className="btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Save
                      </a>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                    </div>
                  </div>

                  <div className="px-6 pb-4 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                      Secured by IIIT Nagpur VMS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-16 animate-fadeIn space-y-6 min-h-screen">
        <div className="flex items-center justify-between">
          <BackButton to="/" className="mb-0 flex items-center gap-2" />
          <ThemeSwitcher />
        </div>

        <PageHeader
          icon={UserPlus}
          gradient="from-cyan-500 to-blue-600"
          title="Request Campus Visit"
          description="Submit your visitor information and verification details to request entry authorization."
        />

        {registrationContent}

        <footer className="pt-8 text-center text-xs text-gray-400 dark:text-slate-500 border-t border-gray-200/60 dark:border-slate-800/60 print:hidden">
          IIIT Nagpur VMS — Smart Visitor & Campus Security System
        </footer>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <div className="print:hidden">
        <PageHeader
          backTo="/app/dashboard"
          icon={UserPlus}
          gradient="from-cyan-500 to-blue-600"
          title="Register Visit"
          description="Register visitors with ID verification."
        />
      </div>
      {registrationContent}
    </div>
  );
}
