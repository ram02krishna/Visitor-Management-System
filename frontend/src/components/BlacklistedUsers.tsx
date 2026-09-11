import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Mail,
  ShieldAlert,
  CheckCircle2,
  Phone,
  UserX,
  Plus,
  X,
  ShieldCheck,
  Radio,
  Clock
} from "lucide-react";

import { PageHeader } from "./PageHeader";
import { api } from "../lib/api";
import { useDataSync } from "../lib/dataSync";
import { toast } from "react-hot-toast";
import type { Database } from "../lib/database.types";
import { format } from "date-fns";
import { SEOMeta } from "./SEOMeta";

type Visitor = Database["public"]["Tables"]["visitors"]["Row"];

const COMMON_REASONS = [
  "Hostel Curfew & Night Violation",
  "Unauthorized Hostel Entry",
  "Misconduct / Disciplinary Action",
  "Forged Pass / Identity Misrepresentation",
  "Overstaying Without Clearance",
];

export function BlacklistedUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [visitors, setVisitors] = useState<Visitor[]>(() => api.uiCache.get("vms_blacklisted") || []);
  const [loading, setLoading] = useState(!api.uiCache.has("vms_blacklisted"));


  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [blockEmail, setBlockEmail] = useState("");
  const [blockPhone, setBlockPhone] = useState("");
  const [blockReason, setBlockReason] = useState(COMMON_REASONS[0]);
  const [submittingBlock, setSubmittingBlock] = useState(false);

  const fetchBlacklisted = useCallback(async (isBackground = false) => {
    if (!isBackground && ((visitors.length === 0 && !api.uiCache.has("vms_blacklisted")) || searchTerm)) {
      setLoading(true);
    }

    try {
      const data = await api.visitors.list({
        blacklisted: true,
        search: searchTerm || undefined,
      });
      setVisitors(data || []);
      if (!searchTerm) {
        api.uiCache.set("vms_blacklisted", data || []);
      }
    } catch {
      if (!isBackground) {
        toast.error("Failed to fetch security watchlist");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [searchTerm, visitors.length]);


  useDataSync(["visitors", "all"], () => {
    fetchBlacklisted(true);
  });

  useEffect(() => {
    const delay = searchTerm ? 300 : 0;
    const delayDebounceFn = setTimeout(() => {
      fetchBlacklisted();
    }, delay);

    const interval = setInterval(() => {
      fetchBlacklisted(true);
    }, 5000);

    return () => {
      clearTimeout(delayDebounceFn);
      clearInterval(interval);
    };
  }, [fetchBlacklisted, searchTerm]);

  const handleUnblacklist = async (visitorId: string) => {
    setVisitors((prev) => prev.filter((v) => v.id !== visitorId));
    api.uiCache.set("vms_blacklisted", (api.uiCache.get("vms_blacklisted") || []).filter((v: Visitor) => v.id !== visitorId));

    try {
      await api.visitors.update(visitorId, { is_blacklisted: false, blacklist_reason: null });
      toast.success("Visitor removed from watchlist");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to unblock visitor");
      fetchBlacklisted();
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockEmail.trim() || !blockName.trim()) {
      toast.error("Name and Email are required");
      return;
    }

    setSubmittingBlock(true);
    try {
      const created = await api.visitors.upsert({
        name: blockName.trim(),
        email: blockEmail.trim().toLowerCase(),
        phone: blockPhone.trim() || "0000000000",
      });

      if (created?.id) {

        await api.visitors.update(created.id, {
          is_blacklisted: true,
          blacklist_reason: blockReason,
        });
      }

      toast.success(`Security block active for ${blockName}`);
      setShowBlockModal(false);
      setBlockName("");
      setBlockEmail("");
      setBlockPhone("");
      fetchBlacklisted();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add security block");
    } finally {
      setSubmittingBlock(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <SEOMeta title="Security Watchlist" />

      <PageHeader
        backTo="/app/dashboard"
        icon={ShieldAlert}
        gradient="from-red-500 to-rose-600"
        title="Security Watchlist"
        description="Manage campus entry restrictions, security blocks, and barred individuals."
        right={
          <button
            onClick={() => setShowBlockModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-sm shadow-red-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Security Block</span>
          </button>
        }
      />


      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Active Watchlist
            </span>
            <p className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 mt-0.5">
              {visitors.length}
            </p>
            <span className="text-[11px] text-gray-400">Barred from campus entry</span>
          </div>
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Gate Radar Status
            </span>
            <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Enforcement
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Instant scan intercept enabled
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Disciplinary Authority
            </span>
            <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1">
              Admin & Chief Warden
            </p>
            <span className="text-[11px] text-gray-400">Campus security protocol</span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>


      <div className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            id="user-search"
            className="block w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-xs"
            placeholder="Search by name, email or reason..."
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>


      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full divide-y divide-gray-200 dark:divide-slate-800 min-w-[750px]">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-800/60">
                <th className="py-3.5 pl-6 pr-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Barred Individual
                </th>
                <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Security Reason / Infraction
                </th>
                <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Date Flagged
                </th>
                <th className="py-3.5 pr-6 text-right text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80 text-xs">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-slate-800" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 bg-gray-200 dark:bg-slate-800 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-3.5 w-32 bg-gray-200 dark:bg-slate-800 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-3.5 w-40 bg-gray-200 dark:bg-slate-800 rounded" /></td>
                    <td className="px-4 py-4"><div className="h-3.5 w-24 bg-gray-200 dark:bg-slate-800 rounded" /></td>
                    <td className="py-4 pr-6 text-right"><div className="h-8 w-20 bg-gray-200 dark:bg-slate-800 rounded-xl ml-auto" /></td>
                  </tr>
                ))
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                      <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-500/20">
                        <ShieldAlert className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-black text-gray-900 dark:text-white">
                        Security Watchlist is Clear
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        No active campus entry blocks. All registered visitors and residents currently have normal access permissions.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visitors.map((visitor) => (
                  <tr
                    key={visitor.id}
                    className="hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center font-black text-xs shrink-0">
                          {visitor.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {visitor.name}
                          </p>
                          <span className="text-[10px] text-gray-400">
                            ID: {visitor.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600 dark:text-slate-300">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span>{visitor.email}</span>
                        </div>
                        {visitor.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <Phone className="w-3 h-3" />
                            <span>{visitor.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{visitor.blacklist_reason || "Entry Barred / Disciplinary"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {visitor.updated_at
                            ? format(new Date(visitor.updated_at), "MMM d, yyyy")
                            : "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-6 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleUnblacklist(visitor.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-500 text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Unblock</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {showBlockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-gray-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Add Security Watchlist Block
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Flag an individual to prevent campus gate clearance and pass generation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBlockModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={blockName}
                  onChange={(e) => setBlockName(e.target.value)}
                  className="block w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={blockEmail}
                  onChange={(e) => setBlockEmail(e.target.value)}
                  className="block w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={blockPhone}
                  onChange={(e) => setBlockPhone(e.target.value)}
                  className="block w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="10-digit mobile"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1.5">
                  Security Infraction Reason *
                </label>
                <select
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="block w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
                >
                  {COMMON_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="btn btn-secondary flex-1 !py-2.5 !rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBlock}
                  className="flex-1 !py-2.5 !rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {submittingBlock ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Enforce Block</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

