import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/auth";
import {
  Search,
  Inbox,
  Calendar,
  Filter,
  Upload,
  Circle,
  ClipboardList,
  Users,
  X,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import { api } from "../lib/api";
import logger from "../lib/logger";
import { PageHeader } from "./PageHeader";
import { formatIST } from "../lib/dateIST";
import { useDebounce } from "../hooks/useDebounce";
import { getStatusConfig } from "../lib/statusConfig";
import { SEOMeta } from "./SEOMeta";
import { VisitDetails } from "./VisitDetails";
import { CustomSelect } from "./ui/CustomSelect";
import { useDataSync } from "../lib/dataSync";


import type { Database } from "../lib/database.types";

export type VisitLog = Database["public"]["Tables"]["visits"]["Row"] & {
  visitor?: Database["public"]["Tables"]["visitors"]["Row"];
  visitors?: Database["public"]["Tables"]["visitors"]["Row"];
  host?: Database["public"]["Tables"]["hosts"]["Row"] | null;
  hosts?: Database["public"]["Tables"]["hosts"]["Row"] | null;
};
export function VisitLogs() {
  const { user } = useAuthStore();
  const cacheKey = user ? `vms_all_logs_${user.id}_${user.role}` : "vms_all_logs";
  const [logs, setLogs] = useState<VisitLog[]>(() => api.uiCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!api.uiCache.has(cacheKey));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitLog | null>(null);
  const [page, setStatusPage] = useState(1);
  const PAGE_SIZE = 50; // Fetch 50 rows at a time — fast first load, load-more for the rest
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const formatGateName = (gate?: string | null) => {
    if (!gate) return null;
    const lower = gate.toLowerCase();
    if (lower.includes("hostel")) return "Hostel Gate";
    return "Main Gate";
  };

  const fetchVisits = useCallback(
    async (isLoadMore = false) => {
      if (!user || !localStorage.getItem("vms_token")) return;

      const currentPage = isLoadMore ? page + 1 : 1;
      if (!isLoadMore && logs.length === 0 && !api.uiCache.has(cacheKey)) setLoading(true);
      if (isLoadMore) setLoadingMore(true);

      try {
        const params: Record<string, unknown> = {
          limit: PAGE_SIZE,
          offset: (currentPage - 1) * PAGE_SIZE,
        };

        if (debouncedSearchTerm) {
          params.search = debouncedSearchTerm;
        }

        if (statusFilter) {
          params.status = statusFilter;
        }

        if (dateFilter) {
          const startOfDay = new Date(dateFilter);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(dateFilter);
          endOfDay.setHours(23, 59, 59, 999);
          params.created_from = startOfDay.toISOString();
          params.created_to = endOfDay.toISOString();
        }

        const data = await api.visits.list(params);
        const rawList = Array.isArray(data) ? data : [];

        let result = (rawList as unknown as VisitLog[]).map(v => ({
          ...v,
          visitors: v.visitor,
          hosts: v.host,
        }));

        if (user.role === "student") {
          result = result.filter(
            (v) =>
              (v.visitor?.email?.toLowerCase() === user.email?.toLowerCase() &&
                (!user.name || v.visitor?.name?.toLowerCase() === user.name?.toLowerCase())) ||
              v.purpose?.includes("[GATE TELEMETRY]")
          );
        } else if (user.role === "visitor") {
          result = result.filter(
            (v) =>
              v.visitor?.email?.toLowerCase() === user.email?.toLowerCase() &&
              (!user.name || v.visitor?.name?.toLowerCase() === user.name?.toLowerCase())
          );
        }

        setHasMore(result.length === PAGE_SIZE);

        if (isLoadMore) {
          setLogs((prev) => [...prev, ...result]);
          setStatusPage(currentPage);
        } else {
          setLogs(result);
          setStatusPage(1);
          if (!debouncedSearchTerm && !statusFilter && !dateFilter) {
            api.uiCache.set(cacheKey, result);
          }
        }
      } catch (err) {
        logger.error("[VisitLogs] Fetch error:", err);
        if (localStorage.getItem("vms_token")) {
          toast.error("Failed to load visit logs");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, cacheKey, debouncedSearchTerm, statusFilter, dateFilter, page]
  );

  useDataSync(["visits", "all"], () => {
    fetchVisits(false);
  });

  useEffect(() => {
    fetchVisits();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchVisits(false);
      }
    }, 12000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchVisits]);


  const handleExport = async () => {
    if (logs.length === 0) {
      toast.error("No data to export");
      return;
    }
    setExporting(true);
    try {
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        params.created_from = startOfDay.toISOString();
        params.created_to = endOfDay.toISOString();
      }

      const data = await api.visits.list(params);

      let exportData = (data as unknown as VisitLog[]).map(v => ({
        ...v,
        visitors: v.visitor,
        hosts: v.host,
      }));
      if (user?.role === "student") {
        exportData = exportData.filter(
          (v) =>
            v.visitor?.email?.toLowerCase() === user.email?.toLowerCase() ||
            v.purpose?.includes("[GATE TELEMETRY]")
        );
      } else if (user?.role === "visitor") {
        exportData = exportData.filter(
          (v) => v.visitor?.email?.toLowerCase() === user.email?.toLowerCase()
        );
      }
      const rows = (exportData as unknown as VisitLog[]) || [];

      const csvData = rows.map((logItem) => ({
        "Visitor Name": logItem.visitor?.name || "Unknown",
        Host: logItem.host?.name || "Unknown",
        Purpose: logItem.purpose,
        Guests: logItem.additional_guests || 0,
        Vehicle: logItem.vehicle_number || "-",
        Phone: logItem.visitor?.phone || "-",
        Status: getStatusConfig(logItem.status).label,
        "Check-in": logItem.check_in_time ? formatIST(new Date(logItem.check_in_time)) : "-",
        "Check-out": logItem.check_out_time ? formatIST(new Date(logItem.check_out_time)) : "-",
        "Entry Gate": formatGateName(logItem.entry_gate) || "-",
        "Exit Gate": formatGateName(logItem.exit_gate) || "-",
        Created: logItem.created_at ? formatIST(new Date(logItem.created_at)) : "-",
      }));
      const Papa = (await import("papaparse")).default;
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
    <div className="space-y-6 pb-8 animate-fadeIn">
      <SEOMeta title="Visit Logs" />
      <PageHeader
        backTo="/app/dashboard"
        icon={ClipboardList}
        gradient="from-sky-500 to-blue-600"
        title="Visitor Logs"
        description="Audit trail of check-ins, departures, and active campus visitor records."
        right={
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-sky-500 transition-colors" />
              </div>
              <input
                type="text"
                className="w-full sm:w-64 py-2 pl-9 pr-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all dark:text-white text-xs shadow-xs"
                placeholder="Quick search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-sky-500 text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              {exporting ? (
                <Circle className="animate-spin w-4 h-4 text-sky-500" />
              ) : (
                <Upload className="w-4 h-4 text-sky-500" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 group-focus-within:text-sky-500">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <input
            type="date"
            className="py-2 pl-8 pr-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all text-gray-900 dark:text-white text-xs font-semibold shadow-xs cursor-pointer"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter("")}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              title="Clear date filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="relative w-36 sm:w-40">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "", label: "All Status" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "checked_in", label: "Active" },
              { value: "completed", label: "Completed" },
              { value: "denied", label: "Denied" },
              { value: "cancelled", label: "Cancelled" }
            ]}
            icon={<Filter className="w-3.5 h-3.5" />}
            className="text-xs font-semibold !py-2 !px-3 shadow-xs"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="lg:hidden px-6 py-2 bg-sky-50/50 dark:bg-sky-900/10 border-b border-gray-100 dark:border-slate-800/50">
          <p className="text-[9px] font-black text-sky-600/60 dark:text-sky-400/60 uppercase tracking-widest flex items-center gap-1.5">
            <span className="animate-pulse">←</span> Swipe horizontally to see more details{" "}
            <span className="animate-pulse">→</span>
          </p>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full divide-y divide-gray-200 dark:divide-slate-700/50 flex-1 min-w-[1100px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-slate-800/90 dark:to-slate-800/60">
                        <th className="py-2.5 pl-4 pr-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0">
                          Visitor
                        </th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 whitespace-nowrap">
                          Guests
                        </th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 whitespace-nowrap">
                          Vehicle
                        </th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 whitespace-nowrap">
                          Phone
                        </th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 whitespace-nowrap">
                          Entry Time
                        </th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 whitespace-nowrap">
                          Exit Time
                        </th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 whitespace-nowrap">
                          Entry Gate
                        </th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 whitespace-nowrap">
                          Exit Gate
                        </th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest sticky top-0 whitespace-nowrap">
                          Status
                        </th>
                        <th className="relative py-2.5 pl-2 pr-4 sm:pr-5 sticky top-0">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900 dark:divide-slate-700/60">
                      {loading ? (
                        <>
                          {[...Array(5)].map((_, i) => (
                            <tr key={i} className="animate-pulse">
                              <td className="py-2.5 pl-4 pr-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="skeleton w-7 h-7 rounded-lg shrink-0" />
                                  <div className="skeleton h-3.5 w-24 rounded" />
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="skeleton h-3.5 w-10 rounded" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="skeleton h-3.5 w-16 rounded" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="skeleton h-3.5 w-18 rounded" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="skeleton h-3.5 w-20 rounded" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="skeleton h-3.5 w-20 rounded" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="skeleton h-3.5 w-14 rounded" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="skeleton h-3.5 w-14 rounded" />
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="skeleton h-4 w-16 rounded-lg" />
                              </td>
                              <td className="py-2.5 pl-2 pr-4 sm:pr-5 text-right">
                                <div className="skeleton h-3.5 w-3.5 rounded inline-block" />
                              </td>
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
                        logs.map((logItem) => {
                          const cfg = getStatusConfig(logItem.status);
                          const StatusIcon = cfg.icon;
                          const visitorName = logItem.visitor?.name || "Unknown";

                          return (
                            <tr
                              key={logItem.id}
                              onClick={() => setSelectedVisit(logItem)}
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="py-2.5 pl-4 pr-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden">
                                    {logItem.visitor?.photo_url ? (
                                      <img
                                        src={logItem.visitor.photo_url}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      visitorName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <p className="font-semibold truncate max-w-[130px] sm:max-w-[170px]">{visitorName}</p>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500 dark:text-slate-400">
                                {logItem.additional_guests > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                                    <Users className="w-2.5 h-2.5" /> +{logItem.additional_guests}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-gray-800 dark:text-slate-200">
                                {logItem.vehicle_number || (
                                  <span className="text-gray-300 dark:text-slate-600 font-normal">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-slate-400">
                                {logItem.visitor?.phone || "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-gray-800 dark:text-slate-200">
                                {logItem.check_in_time ? (
                                  formatIST(logItem.check_in_time)
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600 font-normal">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-gray-800 dark:text-slate-200">
                                {logItem.check_out_time ? (
                                  formatIST(logItem.check_out_time)
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600 font-normal">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                                {logItem.entry_gate ? (
                                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/80 ring-1 ring-gray-200/80 dark:ring-slate-700/50">
                                    {formatGateName(logItem.entry_gate)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                                {logItem.exit_gate ? (
                                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/80 ring-1 ring-gray-200/80 dark:ring-slate-700/50">
                                    {formatGateName(logItem.exit_gate)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.className}`}
                                >
                                  <StatusIcon
                                    className={`w-3 h-3 ${logItem.status === "checked_in" ? "animate-pulse" : ""}`}
                                  />
                                  {cfg.label}
                                </span>
                              </td>
                              <td className="whitespace-nowrap py-2.5 pl-2 pr-4 text-right text-sm font-medium sm:pr-5">
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400 inline" />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                  </table>
                </div>
              </div>

      {selectedVisit && (
        <VisitDetails
          visit={selectedVisit as unknown as React.ComponentProps<typeof VisitDetails>["visit"]}
          onClose={() => setSelectedVisit(null)}
          onUpdate={fetchVisits}
        />
      )}
      {hasMore && !loading && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => fetchVisits(true)}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            {loadingMore ? (
              <Circle className="animate-spin w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
