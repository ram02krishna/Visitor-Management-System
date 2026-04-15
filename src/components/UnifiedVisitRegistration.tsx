"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import emailjs from "@emailjs/browser";
import { 
  Camera, 
  UserRoundPlus, 
  CalendarPlus, 
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
  Printer
} from "lucide-react";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import log from "../lib/logger";

type UnifiedVisitFormData = {
  name: string;
  email: string;
  phone: string;
  purpose: string;
  visitDate: string;
  validUntil?: string;
  hostEmail: string;
  photo?: FileList;
  idProof?: FileList;
  notes?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  additionalGuests?: number;
  passType: "single_day" | "multi_day";
};

export function UnifiedVisitRegistration() {
  const { user } = useAuthStore();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UnifiedVisitFormData>({
    defaultValues: {
      passType: "single_day",
      additionalGuests: 0
    }
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewIdProof, setPreviewIdProof] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);

  const userRole = user?.role;
  const isVisitor = userRole === "visitor";
  const isGuardOrAdmin = userRole === "guard" || userRole === "admin";
  
  const passType = watch("passType");
  const visitorEmail = watch("email");

  useEffect(() => {
    if (user) {
      if (isVisitor) {
        setValue("name", user.name || "");
        setValue("email", user.email || "");
        setValue("hostEmail", "");
      } else {
        setValue("hostEmail", user.email || "");
      }
    }
  }, [user, isVisitor, setValue]);

  // Check blacklist whenever email changes
  useEffect(() => {
    if (visitorEmail && visitorEmail.includes("@")) {
      const checkBlacklist = async () => {
        const { data } = await supabase
          .from("visitors")
          .select("is_blacklisted, blacklist_reason")
          .eq("email", visitorEmail.trim())
          .maybeSingle();
        
        if (data?.is_blacklisted) {
          setIsBlacklisted(true);
          setErrorMessage(`Warning: This visitor is on the campus watchlist. Reason: ${data.blacklist_reason || "Not specified"}`);
        } else {
          setIsBlacklisted(false);
          if (errorMessage.includes("watchlist")) setErrorMessage("");
        }
      };
      checkBlacklist();
    }
  }, [visitorEmail, errorMessage]);

  const handleFilePreview = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadToStorage = async (file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) {
      log.error(`[UnifiedVisit] ${bucket} upload error:`, uploadError);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  };

  const onSubmit = async (formData: UnifiedVisitFormData) => {
    if (isBlacklisted && isVisitor) {
      toast.error("You are not permitted to register. Please contact security.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setQrImageUrl(null);

    try {
      log.info("[UnifiedVisit] Starting advanced registration for role:", userRole);

      const effectiveHostEmail = isVisitor ? formData.hostEmail : user?.email;
      let approverId = null;
      let approverName = "Campus Administration";

      if (effectiveHostEmail && effectiveHostEmail.trim() !== "") {
        const { data: approver, error: approverError } = await supabase
          .from("hosts")
          .select("id, name")
          .ilike("email", effectiveHostEmail.trim())
          .maybeSingle();

        if (approverError) throw approverError;
        if (!approver) throw new Error(`Approver not found with email: ${effectiveHostEmail}`);
        approverId = approver.id;
        approverName = approver.name;
      }

      // Handle File Uploads
      let photoUrl = null;
      if (formData.photo?.[0]) {
        photoUrl = await uploadToStorage(formData.photo[0], "identification-images");
      }

      let idProofUrl = null;
      if (formData.idProof?.[0]) {
        idProofUrl = await uploadToStorage(formData.idProof[0], "visitor-documents");
      }

      // Create or Update Visitor
      let visitorId;
      const { data: existingVisitor } = await supabase
        .from("visitors")
        .select("id, is_blacklisted")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingVisitor?.is_blacklisted && !isGuardOrAdmin) {
        throw new Error("This visitor is blacklisted and cannot be registered.");
      }

      const visitorPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "N/A",
        photo_url: photoUrl || undefined,
        id_proof_url: idProofUrl || undefined,
        updated_at: new Date().toISOString()
      };

      if (existingVisitor) {
        visitorId = existingVisitor.id;
        await supabase.from("visitors").update(visitorPayload).eq("id", visitorId);
      } else {
        const { data: newVisitor, error: createError } = await supabase
          .from("visitors")
          .insert(visitorPayload)
          .select("id")
          .single();
        if (createError) throw createError;
        visitorId = newVisitor.id;
      }

      // Create Visit
      const visitId = uuidv4();
      setVisitId(visitId);
      const visitDate = formData.visitDate ? new Date(formData.visitDate) : new Date();
      const validUntil = formData.validUntil ? new Date(formData.validUntil) : new Date(visitDate);
      if (formData.passType === 'single_day') validUntil.setHours(23, 59, 59);

      const { error: visitError } = await supabase.from("visits").insert({
        id: visitId,
        visitor_id: visitorId,
        host_id: approverId,
        purpose: formData.purpose,
        status: "pending",
        scheduled_time: visitDate.toISOString(),
        valid_until: validUntil.toISOString(),
        valid_from: visitDate.toISOString(),
        expected_out_time: validUntil.toISOString(),
        notes: formData.notes || null,
        vehicle_number: formData.vehicleNumber || null,
        vehicle_type: formData.vehicleType || null,
        additional_guests: Number(formData.additionalGuests) || 0,
        pass_type: formData.passType,
      });

      if (visitError) throw visitError;

      // Enrich QR Data with more details as requested - Shortened keys for better scannability
      const qrData = JSON.stringify({ 
        vId: visitId,
        n: formData.name,
        e: formData.email,
        p: formData.purpose,
        t: formData.passType,
        d: visitDate.toISOString().split('T')[0],
        u: validUntil.toISOString().split('T')[0],
        v: formData.vehicleNumber || 'None'
      });
      const qrUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 3,
        scale: 10
      });
      setQrImageUrl(qrUrl);

      // Email Notification
      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const emailTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (emailServiceId && emailTemplateId && emailPublicKey) {
        try {
          await emailjs.send(emailServiceId, emailTemplateId, {
            to_name: formData.name,
            to_email: formData.email,
            email: formData.email,
            qr_code: qrUrl,
            visit_id: visitId,
            visit_purpose: formData.purpose,
            host_name: approverName,
            host_email: effectiveHostEmail || "Campus Admin",
            pass_type: formData.passType.replace('_', ' ')
          }, emailPublicKey);
        } catch (e) {
          log.error("[UnifiedVisit] Email failed:", e);
        }
      }

      toast.success("Visitor successfully Registered");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to process registration.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <BackButton />

        <PageHeader
          icon={isVisitor ? CalendarPlus : UserRoundPlus}
          gradient={isVisitor ? "from-purple-500 to-indigo-600" : "from-cyan-500 to-blue-600"}
          title="Register Visit"
          description={isVisitor 
            ? "Submit your visit details including vehicle and guest info for campus entry." 
            : "Register visitors with ID verification and multi-day pass options."}
        />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-5">
            {errorMessage && (
              <div className={`mb-6 rounded-lg p-4 flex items-center gap-3 border ${isBlacklisted ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`}>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Visitor Information Section */}
              <section>
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Identity Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Full Name *</label>
                    <input
                      type="text"
                      {...register("name", { 
                        required: "Name is required",
                        onChange: (e) => {
                          const val = e.target.value;
                          if (val.length > 0) {
                            e.target.value = val.charAt(0).toUpperCase() + val.slice(1);
                          }
                        }
                      })}
                      disabled={isVisitor}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Email Address *</label>
                    <input
                      type="email"
                      {...register("email", { required: "Email is required" })}
                      disabled={isVisitor}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      maxLength={10}
                      {...register("phone", { 
                        required: "Phone is required", 
                        pattern: { value: /^\d{10}$/, message: "Exactly 10 digits required" },
                        onChange: (e) => {
                          e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        }
                      })}
                      className={`block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white ${errors.phone ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="1234567890"
                    />
                    {errors.phone && <span className="text-[10px] text-red-500 font-bold block mt-1">{errors.phone.message}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Additional Guests</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        {...register("additionalGuests", { min: 0, max: 10 })}
                        className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Security & Documents */}
              <section>
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <FileUp className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Documents & Vehicle</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Photo & ID Row */}
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Verification Photos</label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="group relative flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all cursor-pointer overflow-hidden bg-gray-50/30 dark:bg-slate-800/20">
                          {previewPhoto ? (
                            <img src={previewPhoto} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <Camera className="mx-auto h-6 w-6 text-gray-400 group-hover:text-blue-500" />
                              <span className="mt-2 block text-[10px] font-bold text-gray-400 uppercase">Live Photo</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" className="sr-only" {...register("photo")} onChange={(e) => handleFilePreview(e, setPreviewPhoto)} />
                        </label>
                      </div>
                      <div className="flex-1">
                        <label className="group relative flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all cursor-pointer overflow-hidden bg-gray-50/30 dark:bg-slate-800/20">
                          {previewIdProof ? (
                            <img src={previewIdProof} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <FileText className="mx-auto h-6 w-6 text-gray-400 group-hover:text-indigo-500" />
                              <span className="mt-2 block text-[10px] font-bold text-gray-400 uppercase">Govt ID Proof</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" className="sr-only" {...register("idProof")} onChange={(e) => handleFilePreview(e, setPreviewIdProof)} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Tracking */}
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Vehicle Information</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <div className="relative">
                          <Car className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            {...register("vehicleNumber")}
                            className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold uppercase"
                            placeholder="Vehicle Number (e.g. MH-31...)"
                          />
                        </div>
                      </div>
                      <select
                        {...register("vehicleType")}
                        className="col-span-2 block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold"
                      >
                        <option value="">No Vehicle</option>
                        <option value="2-wheeler">2-Wheeler</option>
                        <option value="4-wheeler">4-Wheeler</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Visit Logistics */}
              <section>
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-slate-800 pb-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Visit Logistics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Pass Type</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 dark:bg-slate-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setValue("passType", "single_day")}
                        className={`py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${passType === "single_day" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-gray-400"}`}
                      >Single Day</button>
                      <button
                        type="button"
                        onClick={() => setValue("passType", "multi_day")}
                        className={`py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${passType === "multi_day" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-gray-400"}`}
                      >Multi-Day</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Approver Email</label>
                    <input
                      type="email"
                      {...register("hostEmail")}
                      disabled
                      placeholder={isVisitor ? "Campus Administration" : "Assigned to You"}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 py-3 px-4 text-sm dark:text-slate-400 italic cursor-not-allowed opacity-70"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                      {passType === "multi_day" ? "Valid From *" : "Visit Date *"}
                    </label>
                    <input
                      type="date"
                      {...register("visitDate", { required: "Date is required" })}
                      min={new Date().toISOString().split("T")[0]}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                    />
                  </div>

                  {passType === "multi_day" && (
                    <div className="animate-fadeIn">
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Valid Until *</label>
                      <input
                        type="date"
                        {...register("validUntil", { required: "End date is required" })}
                        min={watch("visitDate")}
                        className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Purpose of Visit *</label>
                    <input
                      type="text"
                      {...register("purpose", { required: "Purpose is required" })}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                      placeholder="Meeting, Maintenance, Guest Lecture..."
                    />
                  </div>
                </div>
              </section>
            </div>

            {qrImageUrl && (
              <div className="mt-12 flex justify-center animate-scaleIn print:m-0">
                <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-gray-200 dark:border-slate-800">
                  {/* Subtle color top bar */}
                  <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                  
                  <div className="p-8 flex flex-col items-center relative">
                    {/* Status Badge floating */}
                    <div className="absolute top-6 right-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        isVisitor 
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        {isVisitor ? "Pending" : "Approved"}
                      </span>
                    </div>

                    <div className="w-full mb-8">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Entry Pass</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">IIIT Nagpur Campus</p>
                    </div>

                    <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 mb-8 aspect-square flex items-center justify-center">
                       <img src={qrImageUrl} alt="QR Code" className="w-48 h-48" />
                    </div>

                    <div className="w-full bg-gray-50/50 dark:bg-slate-800/30 rounded-2xl p-5 mb-8 border border-gray-100 dark:border-slate-700/50">
                      <div className="mb-4 text-left">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Visitor Name</p>
                        <p className="text-base font-bold text-gray-900 dark:text-white truncate">{watch("name") || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Visit Date</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                            {watch("visitDate") ? new Date(watch("visitDate")).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '---'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Pass Type</p>
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                            {watch("passType")?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-3">
                      <a 
                        href={qrImageUrl} 
                        download={`iiitn-pass-${watch("name")?.replace(/\s+/g, '-').toLowerCase()}.png`}
                        className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                      >
                        <Download className="w-4 h-4" /> Save
                      </a>
                      <button 
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95"
                      >
                        <Printer className="w-4 h-4" /> Print
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting || loading || (isBlacklisted && isVisitor)}
                className={`btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 ${isBlacklisted && isVisitor ? '!bg-gray-400 !shadow-none' : ''}`}
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                  <>
                    <QrCode className="h-5 w-5" />
                    {isVisitor ? "Submit Visit Request" : "Register & Generate Pass"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { reset(); setPreviewPhoto(null); setPreviewIdProof(null); setQrImageUrl(null); }}
                className="px-8 py-3.5 border-2 border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 transition-all active:scale-[0.98]"
              >
                Reset Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
