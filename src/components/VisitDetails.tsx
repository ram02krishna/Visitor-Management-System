"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import { 
  X, 
  User, 
  CheckCircle2, 
  Phone, 
  Mail, 
  ShieldAlert, 
  ShieldCheck, 
  FileText,
  History
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { toast } from "react-hot-toast";
import { formatIST } from "../lib/dateIST";
import emailjs from "@emailjs/browser";
import QRCode from "qrcode";
import type { Database } from "../lib/database.types";

export type VisitWithDetails = Database["public"]["Tables"]["visits"]["Row"] & {
  visitor?: Database["public"]["Tables"]["visitors"]["Row"] | null;
  visitors?: Database["public"]["Tables"]["visitors"]["Row"] | null;
  host?: Database["public"]["Tables"]["hosts"]["Row"] | null;
  hosts?: Database["public"]["Tables"]["hosts"]["Row"] | null;
};

interface VisitDetailsProps {
  visit: VisitWithDetails;
  onClose: () => void;
  onUpdate?: () => void;
}

export function VisitDetails({ visit, onClose, onUpdate }: VisitDetailsProps) {
  const { user } = useAuthStore();
  const visitor = visit.visitor || visit.visitors;
  const [isBlacklisted, setIsBlacklisted] = useState(visitor?.is_blacklisted || false);
  const [loading, setLoading] = useState(false);

  const isGuardOrAdmin = user?.role === "admin" || user?.role === "guard";
  const isHost = visit.host_id === user?.id;
  const canApprove = isGuardOrAdmin || isHost;

  const handleStatusUpdate = async (newStatus: 'approved' | 'denied') => {
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }

      const { error } = await supabase
        .from("visits")
        .update(updateData)
        .eq("id", visit.id);

      if (error) throw error;

      // Send Email Notification
      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      const approvalTemplateId = import.meta.env.VITE_EMAILJS_APPROVAL_TEMPLATE_ID;
      const denialTemplateId = import.meta.env.VITE_EMAILJS_DENIAL_TEMPLATE_ID;

      const templateId = newStatus === 'approved' ? approvalTemplateId : denialTemplateId;

      if (emailServiceId && templateId && emailPublicKey && visitor?.email) {
        try {
          // Enrich QR Data with more details as requested - Shortened keys for better scannability
          const qrData = JSON.stringify({ 
            vId: visit.id,
            n: visitor.name,
            e: visitor.email,
            p: visit.purpose,
            t: visit.pass_type,
            d: visit.valid_from?.split('T')[0],
            u: visit.valid_until?.split('T')[0],
            v: visit.vehicle_number || 'None'
          });
          const qrUrl = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'M',
            margin: 3,
            scale: 10
          });
          await emailjs.send(emailServiceId, templateId, {
            to_name: visitor.name,
            to_email: visitor.email,
            email: visitor.email,
            qr_code: qrUrl,
            visit_id: visit.id,
            visit_purpose: visit.purpose,
            host_name: visit.host?.name || visit.hosts?.name || "Campus Administration",
            approved_by: user?.name || "Campus Administration",
            denied_by: user?.name || "Campus Administration",
            status_approved: newStatus === 'approved'
          }, emailPublicKey);
        } catch (e) {
          console.error("Failed to send approval/denial email:", e);
        }
      }

      toast.success(newStatus === 'approved' ? "Visit successfully Approved" : "Visit successfully Denied");
      if (onUpdate) onUpdate();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlacklist = async () => {
    if (!visitor?.id) return;
    setLoading(true);
    const newStatus = !isBlacklisted;

    try {
      const { error } = await supabase
        .from("visitors")
        .update({ 
          is_blacklisted: newStatus,
          blacklist_reason: newStatus ? `Flagged during visit: ${visit.purpose}` : null 
        })
        .eq("id", visitor.id);

      if (error) throw error;

      setIsBlacklisted(newStatus);
      toast.success(newStatus ? "Visitor successfully Blacklisted" : "Visitor removed from Blacklist");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] w-full max-w-sm overflow-hidden animate-scaleIn border border-white dark:border-slate-700 flex flex-col ring-1 ring-black/5 dark:ring-white/10">
        {/* Premium Header */}
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center justify-between bg-gradient-to-b from-gray-50/50 to-transparent dark:from-slate-800/50 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center text-white font-bold shadow-lg bg-gradient-to-br ${isBlacklisted ? 'from-rose-500 to-red-600 shadow-red-500/30' : 'from-blue-500 to-indigo-600 shadow-blue-500/30'}`}>
              {isBlacklisted ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Visit Detail</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] scrollbar-hide">
          {/* Identity - Sleek Profile Row */}
          <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-800/30 p-3 rounded-3xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-md">
            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-2xl font-black text-gray-400 overflow-hidden shrink-0 shadow-inner border border-white dark:border-slate-600">
              {visitor?.photo_url ? (
                <img src={visitor.photo_url} className="w-full h-full object-cover" />
              ) : (visitor?.name || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight">{visitor?.name || "Unknown"}</h3>
              <div className="flex flex-col mt-1 gap-1">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 truncate flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-500" /> {visitor?.email}</span>
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-500" /> {visitor?.phone}</span>
              </div>
            </div>
          </div>

          {/* Elevated Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1 p-4 rounded-[1.25rem] bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-indigo-400" /> Purpose</span>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 leading-snug">{visit.purpose || "General"}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-4 rounded-[1.25rem] bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pass Type</span>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 uppercase">{visit.pass_type?.replace('_', ' ') || "Single Day"}</p>
            </div>
            <div className="col-span-2 p-4 rounded-[1.25rem] bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><User className="w-3.5 h-3.5 text-blue-400" /> Host</span>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200">{visit.host?.name || "Campus Administration"}</p>
            </div>
          </div>

          {/* Modern Timeline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <History className="w-4 h-4 text-gray-400" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Activity Log</span>
            </div>
            <div className="relative pl-4 border-l-2 border-gray-100 dark:border-slate-800 ml-1.5 space-y-4">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">Created</p>
                <p className="text-[11px] font-bold text-gray-500">{formatIST(visit.created_at)}</p>
              </div>
              {visit.check_in_time && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase">Check-in</p>
                  <p className="text-[11px] font-bold text-gray-500">{formatIST(visit.check_in_time)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Block - More Discreet */}
          {visit.status === 'pending' && canApprove && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleStatusUpdate('approved')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusUpdate('denied')}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl font-black uppercase tracking-widest text-[9px] transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50"
              >
                Deny
              </button>
            </div>
          )}

          {isGuardOrAdmin && (
            <button
              onClick={toggleBlacklist}
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                isBlacklisted 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100' 
                : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'
              }`}
            >
              {isBlacklisted ? 'Unblock Visitor' : 'Blacklist Visitor'}
            </button>
          )}
        </div>

        {/* Action Footer */}
        {visitor?.id_proof_url && (
          <div className="p-4 bg-gray-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800">
            <a 
              href={visitor.id_proof_url}
              target="_blank"
              className="w-full py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" /> View Government ID Proof
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
