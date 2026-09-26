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
  History,
  Car,
  Calendar,
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { toast } from "react-hot-toast";
import { formatIST } from "../lib/dateIST";
import { api } from "../lib/api";
import { CustomSelect } from "./ui/CustomSelect";
import { CAMPUS_GATES } from "../lib/constants";

import type { Database } from "../lib/database.types";

export type VisitWithDetails = Database["public"]["Tables"]["visits"]["Row"] & {
  visitor?: Database["public"]["Tables"]["visitors"]["Row"];
  visitors?: Database["public"]["Tables"]["visitors"]["Row"];
  host?: Database["public"]["Tables"]["hosts"]["Row"] | null;
  hosts?: Database["public"]["Tables"]["hosts"]["Row"] | null;
  approved_at?: string | null;
  approved_by?: string | null;
};

interface VisitDetailsProps {

  visit: VisitWithDetails;
  onClose: () => void;
  onUpdate?: () => void;
}

export function VisitDetails({ visit, onClose, onUpdate }: VisitDetailsProps) {

  const { user } = useAuthStore();
  const visitor = visit.visitor || visit.visitors;
  const isStudentMovement = Boolean(
    visit.id?.startsWith("mov-") || visit.purpose?.includes("[GATE TELEMETRY]")
  );
  const [isBlacklisted, setIsBlacklisted] = useState(visitor?.is_blacklisted || false);
  const [loading, setLoading] = useState(false);
  const [showBlacklistPrompt, setShowBlacklistPrompt] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [showGatePrompt, setShowGatePrompt] = useState(false);
  const [selectedGate, setSelectedGate] = useState<string>(CAMPUS_GATES[0]);

  const formatGateName = (gate?: string | null) => {
    if (!gate) return null;
    const lower = gate.toLowerCase();
    if (lower.includes("hostel")) return "Hostel Gate";
    return "Main Gate";
  };

  const isGuardOrAdmin = user?.role === "admin" || user?.role === "guard";
  const isHost = visit.host_id === user?.id;
  const canApprove = isGuardOrAdmin || isHost;

  const handleStatusUpdate = async (newStatus: "approved" | "denied") => {
    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }

      await api.visits.update(visit.id, updateData);

      toast.success(
        newStatus === "approved" ? "Visit successfully Approved" : "Visit successfully Denied"
      );
      if (onUpdate) onUpdate();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklistAction = async (isBlocking: boolean, reason: string | null = null) => {
    if (!isGuardOrAdmin) {
      toast.error("Operation not permitted. Only guards or admins can manage the blacklist.");
      return;
    }
    if (!visitor?.id) return;

    setLoading(true);

    try {
      await api.visitors.update(visitor.id, {
        is_blacklisted: isBlocking,
        blacklist_reason: reason,
      });

      setIsBlacklisted(isBlocking);
      setShowBlacklistPrompt(false);
      setBlacklistReason("");
      toast.success(
        isBlocking ? "Visitor successfully Blacklisted" : "Visitor removed from Blacklist"
      );
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklistClick = () => {
    if (isBlacklisted) {
      handleBlacklistAction(false);
    } else {
      setShowBlacklistPrompt(true);
    }
  };

  const handleCompleteVisit = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      if (isStudentMovement) {
        await api.visits.update(visit.id, {
          status: "completed",
          check_in_time: now,
          entry_gate: selectedGate,
          updated_at: now,
        });
        toast.success(`Student Entry / Return Recorded via ${selectedGate}`);
      } else {
        await api.visits.update(visit.id, {
          status: "completed",
          check_out_time: now,
          exit_gate: selectedGate,
          updated_at: now,
        });
        toast.success(`Visit Completed via ${selectedGate}`);
      }
      if (onUpdate) onUpdate();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200/80 dark:border-slate-800 flex flex-col max-h-[90vh] animate-scaleIn my-auto">
        <div className="px-5 py-3.5 border-b border-gray-200/50 dark:border-slate-700/50 flex items-center justify-between bg-gradient-to-b from-gray-50/50 to-transparent dark:from-slate-800/50 dark:to-transparent shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold border shrink-0 ${
                isBlacklisted
                  ? "bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 dark:shadow-[0_0_12px_-2px_rgba(244,63,94,0.3)]"
                  : "bg-sky-50 text-sky-600 border-sky-200/60 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30 dark:shadow-[0_0_12px_-2px_rgba(14,165,233,0.3)]"
              }`}
            >
              {isBlacklisted ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
              Visit Detail
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xl font-black text-gray-400 overflow-hidden shrink-0 shadow-inner border border-white dark:border-slate-600">
              {visitor?.photo_url ? (
                <img src={visitor.photo_url} className="w-full h-full object-cover" />
              ) : (
                (visitor?.name || "U")[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight truncate leading-tight">
                {visitor?.name || "Unknown"}
              </h3>
              <div className="flex flex-col mt-1 gap-1">
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-500" /> {visitor?.email}
                </span>
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" /> {visitor?.phone}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-[1rem] bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-indigo-400" /> Purpose
              </span>
              <p className="text-xs font-bold text-gray-800 dark:text-slate-200 leading-snug">
                {visit.purpose || "General"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-[1rem] bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 border border-gray-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pass Type
              </span>
              <p className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase">
                {visit.pass_type?.replace("_", " ") || "Single Day"}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-500" /> Valid From
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                {visit.valid_from ? formatIST(visit.valid_from) : "N/A"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-500" /> Valid Until
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                {visit.valid_until ? formatIST(visit.valid_until) : "N/A"}
              </p>
            </div>

            <div className="col-span-2 p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-500" /> Host
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                {visit.host?.name || "Campus Administration"}
              </p>
            </div>
            {visit.vehicle_number && (
              <div className="col-span-2 p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-500" /> Vehicle
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                    {visit.vehicle_number}
                  </p>
                  {visit.vehicle_type && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/40">
                      {visit.vehicle_type}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Activity Log
              </span>
            </div>
            <div className="relative pl-4 border-l-2 border-gray-100 dark:border-slate-800 ml-1.5 space-y-3.5">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
                <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">
                  Created
                </p>
                <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                  {formatIST(visit.created_at)}
                </p>
              </div>
              {visit.approved_at && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">
                    Approved{" "}
                    {visit.approved_by ? (
                      <span className="text-indigo-600 dark:text-indigo-400 capitalize font-bold">
                        ({visit.approved_by === visit.host_id ? "by Faculty Host" : "by Admin / Chief Warden"})
                      </span>
                    ) : (
                      ""
                    )}
                  </p>

                  <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                    {formatIST(visit.approved_at)}
                  </p>
                </div>
              )}
              {visit.status === "denied" && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">
                    Denied
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                    {formatIST(visit.updated_at)}
                  </p>
                </div>
              )}
              {isStudentMovement ? (
                <>
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-white dark:ring-slate-900" />
                    <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">
                      Exited Campus{" "}
                      {visit.exit_gate ? (
                        <span className="text-purple-600 dark:text-purple-400 lowercase">
                          ({formatGateName(visit.exit_gate)})
                        </span>
                      ) : (
                        ""
                      )}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                      {formatIST(visit.check_out_time || visit.valid_from)}
                    </p>
                  </div>
                  {visit.check_in_time && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
                      <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">
                        Entered Campus{" "}
                        {visit.entry_gate ? (
                          <span className="text-emerald-600 dark:text-emerald-400 lowercase">
                            ({formatGateName(visit.entry_gate)})
                          </span>
                        ) : (
                          ""
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                        {formatIST(visit.check_in_time)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {visit.check_in_time && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
                      <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">
                        Check-in{" "}
                        {visit.entry_gate ? (
                          <span className="text-emerald-600 dark:text-emerald-400 lowercase">
                            ({formatGateName(visit.entry_gate)})
                          </span>
                        ) : (
                          ""
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                        {formatIST(visit.check_in_time)}
                      </p>
                    </div>
                  )}
                  {visit.check_out_time && (
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-white dark:ring-slate-900" />
                      <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">
                        Check-out{" "}
                        {visit.exit_gate ? (
                          <span className="text-purple-600 dark:text-purple-400 lowercase">
                            ({formatGateName(visit.exit_gate)})
                          </span>
                        ) : (
                          ""
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                        {formatIST(visit.check_out_time)}
                      </p>
                    </div>
                  )}
                </>
              )}
              {visit.status === "cancelled" && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-white dark:ring-slate-900" />
                  <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none">
                    Cancelled
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                    {formatIST(visit.updated_at)}
                  </p>
                </div>
              )}
            </div>
          </div>
          {visit.status === "pending" && canApprove && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleStatusUpdate("approved")}
                disabled={loading}
                className="btn-success !py-2.5 !text-xs"
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusUpdate("denied")}
                disabled={loading}
                className="btn-secondary !py-2.5 !text-xs"
              >
                Deny
              </button>
            </div>
          )}

          {visit.status === "checked_in" && isGuardOrAdmin && (
            <div className="w-full space-y-3">
              {showGatePrompt ? (
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/50">
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2 px-1">
                    {isStudentMovement ? "Select Entry Gate" : "Select Exit Gate"}
                  </p>
                  <div className="mb-3">
                    <CustomSelect
                      value={selectedGate}
                      onChange={setSelectedGate}
                      options={CAMPUS_GATES.map((gate) => ({ value: gate, label: gate }))}
                      className="w-full text-xs font-bold py-2 px-3 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 shadow-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCompleteVisit}
                      disabled={loading}
                      className="btn-primary flex-1 !py-2 !text-xs"
                    >
                      {isStudentMovement ? "Confirm Entry" : "Confirm Exit"}
                    </button>
                    <button
                      onClick={() => setShowGatePrompt(false)}
                      className="btn-secondary flex-1 !py-2 !text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowGatePrompt(true)}
                  disabled={loading}
                  className="btn-primary w-full !py-2.5 !text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> {isStudentMovement ? "Record Campus Entry" : "Complete Visit"}
                </button>
              )}
            </div>
          )}

          {isGuardOrAdmin && (
            <div className="w-full">
              {showBlacklistPrompt ? (
                <div className="w-full bg-red-50 dark:bg-red-900/10 p-3 rounded-2xl border border-red-200 dark:border-red-900/50">
                  <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-2 px-1">
                    Block Reason Required
                  </p>
                  <input
                    type="text"
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                    placeholder="Why is this visitor being blocked?"
                    className="w-full text-xs font-bold py-2 px-3 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white mb-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBlacklistAction(true, blacklistReason.trim())}
                      disabled={loading || !blacklistReason.trim()}
                      className="btn-danger flex-1 !py-2 !text-xs"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setShowBlacklistPrompt(false);
                        setBlacklistReason("");
                      }}
                      className="btn-secondary flex-1 !py-2 !text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleBlacklistClick}
                  disabled={loading}
                  className={`btn w-full !py-2 !text-xs ${
                    isBlacklisted
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                      : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
                  }`}
                >
                  {isBlacklisted ? "Unblock Visitor" : "Blacklist"}
                </button>
              )}
            </div>
          )}
        </div>
        {visitor?.id_proof_url && (
          <div className="p-3 bg-gray-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 shrink-0">
            <a
              href={visitor.id_proof_url}
              target="_blank"
              className="btn-secondary w-full !py-2 !text-xs"
            >
              <FileText className="w-3.5 h-3.5" /> View ID Proof
            </a>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
