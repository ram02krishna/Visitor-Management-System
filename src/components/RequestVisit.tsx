"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { 
  Camera, 
  Download, 
  User, 
  Mail, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  QrCode, 
  Users, 
  Car, 
  AlertTriangle,
  FileUp,
  CalendarPlus,
  Printer
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import emailjs from "@emailjs/browser";
import { supabase } from "../lib/supabase";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import { ThemeSwitcher } from "./ThemeSwitcher";
import QRCode from "qrcode";
import { toast } from "react-hot-toast";

type RequestVisitFormData = {
  name: string;
  email: string;
  phone: string;
  purpose: string;
  visitDate: string;
  validUntil?: string;
  hostEmail: string;
  notes?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  additionalGuests?: number;
  photo?: FileList;
  idProof?: FileList;
  passType: "single_day" | "multi_day";
};

export function RequestVisit() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestVisitFormData>({
    defaultValues: {
      visitDate: new Date().toISOString().split("T")[0],
      additionalGuests: 0,
      passType: "single_day",
      hostEmail: ""
    }
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const passType = watch("passType");

  const handleFilePreview = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, bucket: string) => {
    const fileName = `${uuidv4()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw new Error(`${bucket} upload failed.`);
    return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
  };

  const onSubmit = async (formData: RequestVisitFormData) => {
    setLoading(true);
    setErrorMessage("");

    try {
      let photoUrl = null;
      if (formData.photo?.[0]) photoUrl = await uploadFile(formData.photo[0], "identification-images");
      
      let idProofUrl = null;
      if (formData.idProof?.[0]) idProofUrl = await uploadFile(formData.idProof[0], "visitor-documents");

      const { data: existing } = await supabase.from("visitors").select("id, is_blacklisted").eq("email", formData.email).maybeSingle();
      if (existing?.is_blacklisted) throw new Error("Campus access restricted. Contact security.");

      const payload = { 
        name: formData.name, 
        email: formData.email, 
        phone: formData.phone, 
        photo_url: photoUrl || undefined,
        id_proof_url: idProofUrl || undefined
      };

      let visitorId;
      if (existing) {
        visitorId = existing.id;
        await supabase.from("visitors").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", visitorId);
      } else {
        const { data: created, error: cErr } = await supabase.from("visitors").insert(payload).select().single();
        if (cErr) throw cErr;
        visitorId = created.id;
      }

      const vId = uuidv4();
      const visitDate = new Date(formData.visitDate);
      const validUntil = formData.validUntil ? new Date(formData.validUntil) : new Date(visitDate);
      if (formData.passType === 'single_day') validUntil.setHours(23, 59, 59);

      let hostId = null;
      if (formData.hostEmail && formData.hostEmail.trim() !== "") {
        const { data: host } = await supabase.from("hosts").select("id").ilike("email", formData.hostEmail.trim()).maybeSingle();
        hostId = host?.id || null;
      }

      const { error: vErr } = await supabase.from("visits").insert({
        id: vId,
        visitor_id: visitorId,
        host_id: hostId,
        purpose: formData.purpose,
        status: "pending",
        scheduled_time: visitDate.toISOString(),
        valid_from: visitDate.toISOString(),
        valid_until: validUntil.toISOString(),
        notes: formData.notes || null,
        vehicle_number: formData.vehicleNumber || null,
        vehicle_type: formData.vehicleType || null,
        additional_guests: Number(formData.additionalGuests) || 0,
        pass_type: formData.passType,
      });
      if (vErr) throw vErr;

      // Enrich QR Data with more details as requested - Shortened keys for better scannability
      const qrData = JSON.stringify({ 
        vId: vId,
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
      setQrCode(qrUrl);
      setVisitId(vId);

      const svc = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const tmp = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const key = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (svc && tmp && key) {
        await emailjs.send(svc, tmp, {
          to_name: formData.name,
          email: formData.email,
          to_email: formData.email,
          qr_code: qrUrl,
          visit_id: vId,
          visit_purpose: formData.purpose,
          host_email: formData.hostEmail || "Campus Admin",
          pass_type: formData.passType.replace('_', ' ')
        }, key);
      }

      setSuccess(true);
      toast.success("Visit Request successfully Submitted");
      
      // Scroll to pass after short delay
      setTimeout(() => {
        document.getElementById('entry-pass-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12 animate-fadeIn relative">
      <div className="absolute top-6 right-6 z-50">
        <ThemeSwitcher />
      </div>

      <div className="absolute top-6 left-6 z-50">
        <BackButton to="/" className="flex items-center gap-3 max-sm:bg-white/80 max-sm:dark:bg-slate-900/80 max-sm:p-1 max-sm:rounded-full max-sm:backdrop-blur-md" />
      </div>

      <div className="max-w-4xl mx-auto mt-12 sm:mt-8">

        <PageHeader
          icon={CalendarPlus}
          gradient="from-blue-600 to-indigo-600"
          title="Public Visit Request Registration"
          description="Official campus entry application for guests, vendors, and contractors."
        />

        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800">
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-5">
            {errorMessage && (
              <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center gap-3 text-red-800 dark:text-red-300">
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
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Full Legal Name *</label>
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
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Email Address *</label>
                    <input
                      type="email"
                      {...register("email", { required: "Email is required" })}
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
                      className={`block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold ${errors.phone ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      placeholder="1234567890"
                    />
                    {errors.phone && <span className="text-[10px] text-red-500 font-bold block mt-1">{errors.phone.message}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Additional Guests</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
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

              {/* Documents & Vehicle Section */}
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
                          {previewId ? (
                            <img src={previewId} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <FileText className="mx-auto h-6 w-6 text-gray-400 group-hover:text-indigo-500" />
                              <span className="mt-2 block text-[10px] font-bold text-gray-400 uppercase">Govt ID Proof</span>
                            </div>
                          )}
                          <input type="file" accept="image/*" className="sr-only" {...register("idProof")} onChange={(e) => handleFilePreview(e, setPreviewId)} />
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
                          <Car className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
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

              {/* Visit Logistics Section */}
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
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Approver Email (Optional)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        {...register("hostEmail")}
                        placeholder="host@iiitn.ac.in"
                        className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                      {passType === "multi_day" ? "Valid From *" : "Visit Date *"}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        {...register("visitDate", { required: "Date is required" })}
                        min={new Date().toISOString().split("T")[0]}
                        className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  {passType === "multi_day" && (
                    <div className="animate-fadeIn">
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Valid Until *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                        <input
                          type="date"
                          {...register("validUntil", { required: "End date is required" })}
                          min={watch("visitDate")}
                          className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Purpose of Access *</label>
                    <textarea
                      required
                      {...register("purpose", { required: "Purpose is required" })}
                      rows={2}
                      className="w-full bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white font-medium resize-none"
                      placeholder="E.g. Meeting with Head of Dept, System Maintenance..."
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Submit Application <QrCode size={18} /></>
                )}
              </button>
              <button
                type="button"
                onClick={() => { reset(); setPreviewPhoto(null); setPreviewId(null); setSuccess(false); setQrCode(null); }}
                className="px-8 py-3.5 border-2 border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 transition-all active:scale-[0.98]"
              >
                Reset Application
              </button>
            </div>
          </form>

          {success && qrCode && (
            <div id="entry-pass-section" className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 animate-fadeIn">
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-[320px] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col items-center animate-scaleIn">
                  
                  {/* Decorative Header */}
                  <div className="w-full bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-500 p-8 text-white relative text-center">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative z-10 space-y-1">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2 backdrop-blur-md border border-white/30 shadow-xl">
                        <ShieldCheck className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-[0.4em] text-emerald-100/80">Authorized Request</p>
                      <h4 className="text-xl font-black tracking-tighter leading-none italic">IIIT NAGPUR</h4>
                    </div>
                  </div>

                  {/* Pass Body */}
                  <div className="w-full p-8 flex flex-col items-center space-y-6 relative">
                    
                    {/* Status Badge */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[8px] font-black tracking-[0.2em] border-4 border-white dark:border-slate-900 shadow-xl bg-amber-500 text-white uppercase">
                        Pending Approval
                      </span>
                    </div>

                    {/* QR Section */}
                    <div className="pt-2">
                      <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-[2rem] shadow-inner border border-gray-100 dark:border-slate-800 relative group transition-all hover:scale-105">
                        <div className="absolute inset-0 bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-all rounded-full" />
                        <div className="relative bg-white p-3 rounded-[1.5rem] shadow-sm">
                           <img src={qrCode} alt="Entry Pass QR" className="w-36 h-36" />
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="w-full space-y-4">
                      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                        <div className="col-span-2 pb-1 border-b border-gray-100 dark:border-slate-800/50">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Visitor Identity</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase">{watch("name")}</p>
                        </div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Visit Date</p>
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {watch("visitDate") ? new Date(watch("visitDate")).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '---'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pass Type</p>
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                            {watch("passType")?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full grid grid-cols-2 gap-3 pt-1">
                      <a 
                        href={qrCode} 
                        download={`iiitn-pass-${visitId?.substring(0,8)}.png`}
                        className="flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[8px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                      >
                        <Download className="w-3.5 h-3.5" /> Save
                      </a>
                      <button 
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black uppercase tracking-widest text-[8px] hover:bg-gray-50 dark:hover:bg-slate-900 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print
                      </button>
                    </div>
                  </div>

                  {/* Security Footer */}
                  <div className="w-full bg-slate-50 dark:bg-slate-800/50 py-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-center gap-2">
                     <ShieldCheck className="w-3 h-3 text-emerald-500" />
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">SECURED BY IIIT NAGPUR VMS</span>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                    Digital backup transmitted to <span className="text-emerald-600 font-black underline decoration-2 underline-offset-4">{watch("email")}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
