"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle, XCircle, Search, ShieldAlert, Calendar, FileText, X, History, CheckCircle2, Hourglass, LogIn } from "lucide-react";
import { BackButton } from "./BackButton";
import emailjs from "@emailjs/browser";
import { toast } from "../../hooks/use-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { useDebounce } from "../../hooks/use-debounce";
import type { Database } from "../lib/database.types";
import QRCode from "qrcode";

type VisitorApprovalVisit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitors: Database["public"]["Tables"]["visitors"]["Row"];
};

type VisitHistory = {
  id: string;
  purpose: string;
  status: string;
  created_at: string;
  check_in_time: string | null;
  check_out_time: string | null;
};

const historyStatusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pending", icon: Hourglass, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  denied: { label: "Denied", icon: XCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  "checked-in": { label: "Checked In", icon: LogIn, className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400" },
};

function VisitorHistoryDrawer({ visitor, visitorId, onClose }: {
  visitor: Database["public"]["Tables"]["visitors"]["Row"];
  visitorId: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<VisitHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("visits")
        .select("id, purpose, status, created_at, check_in_time, check_out_time")
        .eq("visitor_id", visitorId)
        .order("created_at", { ascending: false })
        .limit(8);
      setHistory((data as VisitHistory[]) || []);
      setLoading(false);
    })();
  }, [visitorId]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-slideInRight border-l border-gray-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-inner">
              {visitor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">{visitor.name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{visitor.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History Label */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Visit History</span>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 p-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500 px-6 text-center">
              <History className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No previous visits found</p>
              <p className="text-xs mt-1">This is their first visit request.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {history.map((h, i) => {
                const cfg = historyStatusConfig[h.status] || historyStatusConfig["pending"];
                const StatusIcon = cfg.icon;
                return (
                  <div key={h.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors animate-fadeInUp" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">{h.purpose}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${cfg.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                      <span>{format(new Date(h.created_at), "dd MMM yyyy")}</span>
                      {h.check_in_time && (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Checked in {format(new Date(h.check_in_time), "HH:mm")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function VisitorApproval() {
  const user = useAuthStore((state) => state.user);
  const [visits, setVisits] = useState<VisitorApprovalVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [drawerVisitor, setDrawerVisitor] = useState<{ visitor: Database["public"]["Tables"]["visitors"]["Row"]; visitorId: string } | null>(null);

  const canApprove = user?.role === "admin" || user?.role === "guard" || user?.role === "host";
  const canView = user?.role === "admin" || user?.role === "guard" || user?.role === "host";

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("visits")
        .select("*, visitors(*), check_in_time, check_out_time")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      // For hosts, only show their own pending visits
      if (user?.role === "host") {
        // We look for visits where host_id matches OR where the host email (stored as entity_email or host_email) matches
        // Since we aren't sure of the exact column name, we'll try to filter by host_id which is the most reliable if set
        // If the user said lookups aren't working, we might need to check other fields if they exist
        query = query.or(`host_id.eq.${user.id}`);
      }

      if (debouncedSearchTerm) {
        query = query.or(
          `visitors.name.ilike.%${debouncedSearchTerm}%,visitors.email.ilike.%${debouncedSearchTerm}%,purpose.ilike.%${debouncedSearchTerm}%`
        );
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setVisits(data as VisitorApprovalVisit[]);
    } catch {
      toast.error("Failed to load pending visits");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, debouncedSearchTerm]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const handleApproval = async (visitId: string, approved: boolean) => {
    if (!canApprove) {
      toast.error("You do not have permission to approve visits");
      return;
    }

    try {
      const { data: updatedData, error: updateError } = await supabase
        .from("visits")
        .update({
          status: approved ? "approved" : "denied",
          updated_at: new Date().toISOString(),
        })
        .eq("id", visitId)
        .select("*, visitors(*)")
        .single();

      if (updateError) {
        throw updateError;
      }

      toast.success(`Visit ${approved ? "approved" : "denied"} successfully`);

      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (emailServiceId && emailPublicKey && updatedData.visitors.email) {
        try {
          if (approved) {
            // Send APPROVAL email with QR code
            const qrData = JSON.stringify({
              visitId: updatedData.id,
              name: updatedData.visitors.name,
              email: updatedData.visitors.email,
              purpose: updatedData.purpose,
              validUntil: updatedData.valid_until,
            });

            const qrUrl = await QRCode.toDataURL(qrData);
            const approvalTemplateId = import.meta.env.VITE_EMAILJS_APPROVAL_TEMPLATE_ID;

            if (approvalTemplateId) {
              await emailjs.send(
                emailServiceId,
                approvalTemplateId,
                {
                  to_name: updatedData.visitors.name,
                  email: updatedData.visitors.email,
                  visitor_email: updatedData.visitors.email,
                  qr_code: qrUrl,
                  visit_id: updatedData.id,
                  visit_purpose: updatedData.purpose,
                  host_name: updatedData.host_id ? "Your Host" : "Not specified",
                  valid_until: new Date(updatedData.valid_until).toLocaleString(),
                },
                emailPublicKey
              );
              toast.success("Approval email with QR code sent successfully!");
            }
          } else {
            // Send DENIAL email
            const denialTemplateId = import.meta.env.VITE_EMAILJS_DENIAL_TEMPLATE_ID;

            if (denialTemplateId) {
              await emailjs.send(
                emailServiceId,
                denialTemplateId,
                {
                  to_name: updatedData.visitors.name,
                  email: updatedData.visitors.email,
                  visitor_email: updatedData.visitors.email,
                  visit_id: updatedData.id,
                  visit_purpose: updatedData.purpose,
                  host_name: updatedData.host_id ? "Your Host" : "Not specified",
                },
                emailPublicKey
              );
              toast.success("Denial notification email sent to visitor!");
            }
          }
        } catch (emailError) {
          console.error(`Failed to send ${approved ? "approval" : "denial"} email:`, emailError);
          toast.error(`Visit ${approved ? "approved" : "denied"}, but failed to send email notification.`);
        }
      } else if (!emailServiceId || !emailPublicKey) {
        console.warn("EmailJS credentials not configured — skipping notification email.");
      }

      loadVisits();
    } catch {
      toast.error("Failed to update visit status");
    }
  };

  if (!canView) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-full mb-6 relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
            <ShieldAlert className="h-16 w-16 text-red-500 dark:text-red-400 relative z-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md leading-relaxed">
            Only guards, administrators, and hosts have permission to view visitor requests. If you believe this is an error, please contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12 animate-fadeIn">
      <BackButton />
      {drawerVisitor && (
        <VisitorHistoryDrawer
          visitor={drawerVisitor.visitor}
          visitorId={drawerVisitor.visitorId}
          onClose={() => setDrawerVisitor(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="sm:flex sm:items-center justify-between mb-8 animate-fadeInUp">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.role === "host" ? "My Pending Approvals" : "Pending Approvals"}
                </h1>
                {!loading && visits.length > 0 && (
                  <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-bold leading-none text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 rounded-full">
                    {visits.length} {visits.length === 1 ? "request" : "requests"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {user?.role === "host"
                  ? "Review and approve visitor requests assigned specifically to you."
                  : "Review and manage incoming visitor requests needing approval."}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 sm:mt-0 w-full sm:w-auto sm:ml-6">
          <div className="relative w-full sm:w-80">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all duration-300"
              placeholder="Search by name, email, or purpose..."
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-32 w-full rounded-2xl"></div>
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 mt-8 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-300 dark:border-slate-700">
            <div className="p-4 bg-sky-50 dark:bg-sky-900/20 text-sky-500 dark:text-sky-400 rounded-full mb-4">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're all caught up!</h3>
            <p className="text-gray-500 dark:text-slate-400 text-center max-w-sm">
              There are no pending visitor requests waiting for approval at this time.
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile View: Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {visits.map((visit, index) => (
                <div
                  key={visit.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fadeInUp flex flex-col"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="flex items-center gap-3 cursor-pointer group/avatar"
                        onClick={() => setDrawerVisitor({ visitor: visit.visitors, visitorId: visit.visitors.id })}
                        title="View visit history"
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold shadow-inner group-hover/avatar:ring-2 group-hover/avatar:ring-sky-400 transition-all">
                          {visit.visitors.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white leading-tight group-hover/avatar:text-sky-600 dark:group-hover/avatar:text-sky-400 transition-colors">{visit.visitors.name}</h4>
                          <span className="text-xs text-gray-500 dark:text-slate-400">{visit.visitors.email}</span>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wide">
                        Pending
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-slate-300">
                        <FileText className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                        <div>
                          <span className="block text-xs font-medium text-gray-400 dark:text-slate-500 uppercase">Purpose</span>
                          <span className="font-medium">{visit.purpose}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-slate-300">
                        <Calendar className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                        <div>
                          <span className="block text-xs font-medium text-gray-400 dark:text-slate-500 uppercase">Requested Date</span>
                          <span className="font-medium">{visit.valid_until ? format(new Date(visit.valid_until), "PPP") : "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-800/50 p-3 flex gap-3 border-t border-gray-100 dark:border-slate-800 shrink-0">
                    {canApprove ? (
                      <>
                        <button
                          onClick={() => handleApproval(visit.id, false)}
                          className="flex-1 inline-flex justify-center items-center py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors duration-200"
                        >
                          <XCircle className="w-4 h-4 mr-1.5" /> Deny
                        </button>
                        <button
                          onClick={() => handleApproval(visit.id, true)}
                          className="flex-1 inline-flex justify-center items-center py-2.5 px-4 rounded-xl text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-500/20 font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4 mr-1.5 align-text-bottom" /> Approve
                        </button>
                      </>
                    ) : (
                      <div className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded-xl border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 font-semibold text-sm">
                        <Hourglass className="w-4 h-4 mr-1.5" /> Views Only - Awaiting Guard/Admin Decision
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
