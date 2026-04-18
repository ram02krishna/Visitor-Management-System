"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/auth";
import {
  Search,
  Inbox,
  Calendar,
  CheckCircle2,
  Hourglass,
  Filter,
  Download,
  Circle,
  XCircle,
  LogIn,
  ScrollText,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import type { Database } from "../lib/database.types";
import logger from "../lib/logger";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import { formatIST } from "../lib/dateIST";
import Papa from "papaparse";
import { SEOMeta } from "./SEOMeta";
import { VisitDetails } from "./VisitDetails";

type VisitLog = Database["public"]["Tables"]["visits"]["Row"] & {
  visitor: Database["public"]["Tables"]["visitors"]["Row"] | null;
  host: Database["public"]["Tables"]["hosts"]["Row"] | null;
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> =
  {
    pending: {
      label: "Pending",
      icon: Hourglass,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    approved: {
      label: "Approved",
      icon: CheckCircle2,
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    denied: {
      label: "Denied",
      icon: XCircle,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    },
    "checked-in": {
      label: "Active",
      icon: LogIn,
      className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    },
    cancelled: {
      label: "Cancelled",
      icon: XCircle,
      className: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
    },
  };

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// ─── Stale-while-revalidate cache key for visit logs ────────────────────────
const LOGS_CACHE_KEY = "vms_visit_logs_cache";

function readLogsCache(): VisitLog[] | null {
  try {
    const raw = localStorage.getItem(LOGS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as VisitLog[]) : null;
  } catch {
    return null;
  }
}

function writeLogsCache(logs: VisitLog[]) {
  try {
    // Only cache the first 50 rows to respect localStorage quota
    localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch {/* quota — ignore */}
}
// ─────────────────────────────────────────────────────────────────────────────

export function VisitLogs() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<VisitLog[]>(() => readLogsCache() ?? []);
  const [loading, setLoading] = useState(() => readLogsCache() === null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitLog | null>(null);
  const [page, setStatusPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchVisits = useCallback(async (isLoadMore = false) => {
    if (!user) return;
    
    const currentPage = isLoadMore ? page + 1 : 1;
    if (!isLoadMore && readLogsCache() === null) setLoading(true);

    try {
      let query = supabase.from("visits").select(`
        *,
        visitor:visitors(*),
        host:hosts!visits_host_id_fkey(*)
      `);

      if (debouncedSearchTerm) {
        query = query.or(
          `purpose.ilike.%${debouncedSearchTerm}%,visitor:visitors(name.ilike.%${debouncedSearchTerm}%)`
        );
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());
      } else {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte("created_at", thirtyDaysAgo.toISOString());
      }

      if (user?.role === "host") {
        query = query.eq("host_id", user.id);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      const result = (data as VisitLog[]) || [];
      if (isLoadMore) {
        setLogs(prev => [...prev, ...result]);
        setStatusPage(currentPage);
      } else {
        setLogs(result);
        setStatusPage(1);
        if (!debouncedSearchTerm && !statusFilter && !dateFilter) {
          writeLogsCache(result);
        }
      }
      
      setHasMore(result.length === PAGE_SIZE);
    } catch (err) {
      logger.error("[VisitLogs] Fetch error:", err);
      toast.error("Failed to load visit logs");
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearchTerm, statusFilter, dateFilter, page]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]); // fetchVisits handles internal filtering logic

  const handleExport = async () => {
    if (logs.length === 0) {
      toast.error("No data to export");
      return;
    }
    setExporting(true);
    try {
      const csvData = logs.map((logItem) => ({
        "Visitor Name": logItem.visitor?.name || "Unknown",
        Host: logItem.host?.name || "Unknown",
        Purpose: logItem.purpose,
        Guests: logItem.additional_guests || 0,
        Vehicle: logItem.vehicle_number || "-",
        Phone: logItem.visitor?.phone || "-",
        Status: statusConfig[logItem.status]?.label || logItem.status,
        "Check-in": logItem.check_in_time ? formatIST(new Date(logItem.check_in_time)) : "-",
        "Check-out": logItem.check_out_time ? formatIST(new Date(logItem.check_out_time)) : "-",
        Created: logItem.created_at ? formatIST(new Date(logItem.created_at)) : "-",
      }));
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `visit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Visit Logs successfully Exported");
    } catch (err) {
      logger.error("[VisitLogs] Export error:", err);
      toast.error("Failed to export logs");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8 animate-fadeIn">
      <SEOMeta title="Visit Logs" />
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <PageHeader
          icon={ScrollText}
          gradient="from-emerald-500 to-teal-600"
          title="Visit Logs"
          description="Complete history of all visitor records and activities"
          right={
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="w-full sm:w-64 py-2.5 pl-10 pr-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white text-xs"
                  placeholder="Quick search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl py-2.5 px-4 font-black uppercase tracking-widest text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-50 shrink-0"
              >
                {exporting ? (
                  <Circle className="animate-spin w-3 h-3" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                Export CSV
              </button>
            </div>
          }
        />
      </div>

      <div className="mt-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Calendar className="w-4 h-4 text-gray-400 group-focus-within:text-emerald-500" />
            </div>
            <input
              type="date"
              className="py-2.5 pl-10 pr-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white text-xs"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <select
              className="py-2.5 pl-10 pr-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all dark:text-white text-xs font-bold"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="checked-in">Active</option>
              <option value="completed">Completed</option>
              <option value="denied">Denied</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col min-h-[400px]">
          <div className="-my-2 sm:-mx-6 lg:-mx-8 flex-1">
            <div className="inline-block w-full py-2 align-middle md:px-6 lg:px-8 h-full">
              <div className="glass-panel rounded-[2rem] overflow-hidden transition-all duration-300 h-full flex flex-col">
                <div className="lg:hidden px-6 py-2 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-gray-100 dark:border-slate-800/50">
                  <p className="text-[9px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="animate-pulse">←</span> Swipe horizontally to see more details <span className="animate-pulse">→</span>
                  </p>
                </div>
                <div className="flex-1 overflow-x-auto scrollbar-hide">
                  <table className="w-full divide-y divide-gray-200 dark:divide-slate-700/50 flex-1 min-w-[1100px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-slate-800/90 dark:to-slate-800/60">
                        <th className="py-4 pl-5 pr-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Visitor
                        </th>
                        <th className="px-3 py-4 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Guests
                        </th>
                        <th className="px-3 py-4 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Vehicle
                        </th>
                        <th className="px-3 py-4 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Phone
                        </th>
                        <th className="px-3 py-4 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Entry Time
                        </th>
                        <th className="px-3 py-4 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Exit Time
                        </th>
                        <th className="px-3 py-4 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Entry Gate
                        </th>
                        <th className="px-3 py-4 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Exit Gate
                        </th>
                        <th className="px-3 py-4 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Status
                        </th>
                        <th className="relative py-4 pl-3 pr-4 sm:pr-5 sticky top-0">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900 dark:divide-slate-700">
                      {loading ? (
                        <>
                          {[...Array(5)].map((_, i) => (
                            <tr key={i} className="animate-pulse">
                              <td className="py-4 pl-4 pr-3 sm:pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="skeleton w-9 h-9 rounded-[1.25rem] shrink-0" />
                                  <div className="skeleton h-4 w-24 rounded" />
                                </div>
                              </td>
                              <td className="px-3 py-4"><div className="skeleton h-4 w-12 rounded" /></td>
                              <td className="px-3 py-4"><div className="skeleton h-4 w-16 rounded" /></td>
                              <td className="px-3 py-4"><div className="skeleton h-4 w-20 rounded" /></td>
                              <td className="px-3 py-4"><div className="skeleton h-4 w-16 rounded" /></td>
                              <td className="px-3 py-4"><div className="skeleton h-4 w-16 rounded" /></td>
                              <td className="px-3 py-4"><div className="skeleton h-4 w-16 rounded" /></td>
                              <td className="px-3 py-4"><div className="skeleton h-4 w-16 rounded" /></td>
                              <td className="px-3 py-4"><div className="skeleton h-5 w-16 rounded-xl" /></td>
                              <td className="py-4 pl-3 pr-4 sm:pr-6 text-right"><div className="skeleton h-4 w-4 rounded inline-block ml-2" /></td>
                            </tr>
                          ))}
                        </>
                      ) : logs.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                              <div className="bg-gradient-to-tr from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700/50 p-5 rounded-[2rem] mb-6 shadow-inner ring-1 ring-gray-200 dark:ring-slate-700">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm">
                                  <Inbox className="w-8 h-8 text-gray-400 dark:text-slate-400" />
                                </div>
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
                                No Records Found
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
                                Try adjusting your search or filters.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        logs.map((logItem, idx) => {
                          const cfg = statusConfig[logItem.status] || statusConfig["pending"];
                          const StatusIcon = cfg.icon;
                          const visitorName = logItem.visitor?.name || "Unknown";

                          return (
                            <tr
                              key={logItem.id}
                              onClick={() => setSelectedVisit(logItem)}
                              className="cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors animate-fadeInUp"
                              style={{ animationDelay: `${idx * 0.02}s` }}
                            >
                              <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                                    {logItem.visitor?.photo_url ? (
                                      <img
                                        src={logItem.visitor.photo_url}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      visitorName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <p className="font-semibold">{visitorName}</p>
                                </div>
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {logItem.additional_guests > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase">
                                    <Users className="w-3 h-3" /> +{logItem.additional_guests}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {logItem.vehicle_number ? (
                                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                                    {logItem.vehicle_number}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600 dark:text-slate-400">
                                <span className="text-xs font-medium">{logItem.visitor?.phone || "—"}</span>
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {logItem.check_in_time ? (
                                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                                    {formatIST(logItem.check_in_time)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {logItem.check_out_time ? (
                                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                                    {formatIST(logItem.check_out_time)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {logItem.entry_gate ? (
                                  <span className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/60 ring-1 ring-gray-200 dark:ring-slate-700/50">
                                    {logItem.entry_gate}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {logItem.exit_gate ? (
                                  <span className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/60 ring-1 ring-gray-200 dark:ring-slate-700/50">
                                    {logItem.exit_gate}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-[10px] font-black uppercase tracking-widest ${cfg.className}`}
                                >
                                  <StatusIcon
                                    className={`w-3 h-3 ${logItem.status === "checked-in" ? "animate-pulse" : ""}`}
                                  />
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                <ChevronRight className="h-4 w-4 text-gray-400 inline ml-2" />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {hasMore && logs.length > 0 && (
                  <div className="mt-8 mb-4 flex justify-center">
                    <button
                      onClick={() => fetchVisits(true)}
                      disabled={loading}
                      className="px-8 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-sm font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-200 dark:hover:border-sky-900/50 shadow-sm hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Loading..." : "Load More Records"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedVisit && (
        <VisitDetails
          visit={selectedVisit as unknown as React.ComponentProps<typeof VisitDetails>["visit"]}
          onClose={() => setSelectedVisit(null)}
          onUpdate={fetchVisits}
        />
      )}
    </div>
  );
}
