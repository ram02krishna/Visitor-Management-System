import { useState, useEffect } from "react";
import {
  Search,
  Download,
  User,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
  Ban,
  Inbox,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "../../hooks/use-toast";
import Papa from "papaparse";
import { formatIST } from "../lib/dateIST";
import { ScrollText } from "lucide-react";
import { PageHeader } from "./PageHeader";

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

type VisitLog = {
  id: string;
  visitor_name: string;
  purpose: string;
  host_name: string;
  check_in: string | null;
  check_out: string | null;
  status: "pending" | "approved" | "denied" | "completed" | "cancelled" | "checked-in";
};

interface RawVisit {
  id: string;
  visitor_id: string;
  host_id: string;
  purpose: string | null;
  status: VisitLog["status"];
  check_in_time: string | null;
  check_out_time: string | null;
  created_at: string;
}

const formatDuration = (start: string | null, end: string | null): string => {
  if (!start) return "—";
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  const diffMs = to - from;
  if (diffMs < 0) return "—";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const getDynamicStatus = (visit: VisitLog) => {

  if (visit.status === "completed") return "completed";
  if (visit.status === "denied") return "denied";
  if (visit.status === "cancelled") return "cancelled";
  if (visit.status === "checked-in") return "ongoing";
  if (visit.status === "approved") return "approved";
  // Only compute time-based status for pending visits
  return visit.status ?? "upcoming";
};

export function VisitLogs() {
  const { user } = useAuthStore();
  const isGuard = user?.role === "guard";
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      // Step 1: fetch raw visits (no joins — avoids FK ambiguity)
      let q = supabase
        .from("visits")
        .select(
          "id, visitor_id, host_id, purpose, status, check_in_time, check_out_time, created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      // Role-based filtering: hosts only see their own visits
      if (user?.role === "host") {
        q = q.eq("host_id", user.id);
      }

      if (statusFilter) {
        q = q.eq("status", statusFilter);
      }
      if (dateFilter) {
        q = q
          .gte("created_at", `${dateFilter}T00:00:00`)
          .lte("created_at", `${dateFilter}T23:59:59`);
      }

      const from = (currentPage - 1) * itemsPerPage;
      q = q.range(from, from + itemsPerPage - 1);

      const { data, error, count } = await q;
      const rawVisits = data as RawVisit[] | null;

      if (error) {
        if (import.meta.env.DEV) console.error("VisitLogs fetch error:", error);
        setLogs([]);
        setTotalItems(0);
        return;
      }

      if (!rawVisits || rawVisits.length === 0) {
        setLogs([]);
        setTotalItems(count ?? 0);
        return;
      }

      // Step 2: resolve visitor & host names in parallel
      const visitorIds = [...new Set(rawVisits.map((v) => v.visitor_id).filter(Boolean))];
      const hostIds = [...new Set(rawVisits.map((v) => v.host_id).filter(Boolean))];

      const [{ data: visitorsData }, { data: hostsData }] = await Promise.all([
        supabase.from("visitors").select("id, name").in("id", visitorIds),
        supabase.from("hosts").select("id, name").in("id", hostIds),
      ]);

      const visitorMap: Record<string, string> = {};
      (visitorsData || []).forEach((v) => { visitorMap[v.id] = v.name; });

      const hostMap: Record<string, string> = {};
      (hostsData || []).forEach((h) => { hostMap[h.id] = h.name; });

      // Step 3: map to VisitLog and apply search filter
      const mapped: VisitLog[] = rawVisits.map((v) => ({
        id: v.id,
        visitor_name: visitorMap[v.visitor_id] ?? "Unknown",
        purpose: v.purpose ?? "",
        host_name: hostMap[v.host_id] ?? "—",
        check_in: v.check_in_time,
        check_out: v.check_out_time,
        status: v.status,
      }));

      const term = debouncedSearchTerm.toLowerCase();
      const filtered = term
        ? mapped.filter(
          (l) =>
            l.visitor_name.toLowerCase().includes(term) ||
            l.host_name.toLowerCase().includes(term) ||
            l.purpose.toLowerCase().includes(term)
        )
        : mapped;

      setLogs(filtered);
      setTotalItems(count ?? 0);
    } catch (err) {
      if (import.meta.env.DEV) console.error("VisitLogs exception:", err);
      setLogs([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();

  }, [currentPage, itemsPerPage, debouncedSearchTerm, dateFilter, statusFilter, user?.id, user?.role]);

  useEffect(() => {
    const subscription = supabase
      .channel("visit_logs_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        fetchVisits();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };

  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {

      let q = supabase
        .from("visits")
        .select(`
          id,
          purpose,
          status,
          check_in_time,
          check_out_time,
          created_at,
          visitor_id,
          host_id
        `)
        .order("created_at", { ascending: false });

      // Role-based filtering: hosts only export their own visits
      if (user?.role === "host") {
        q = q.eq("host_id", user.id);
      }

      if (statusFilter) {
        q = q.eq("status", statusFilter);
      }
      if (dateFilter) {
        q = q
          .gte("created_at", `${dateFilter}T00:00:00`)
          .lte("created_at", `${dateFilter}T23:59:59`);
      }

      const { data: rawVisits, error } = await q;

      if (error) throw error;
      if (!rawVisits || rawVisits.length === 0) {
        toast({
          title: "No data to export",
          description: "There are no records matching your current filters.",
        });
        return;
      }

      const visitorIds = [...new Set(rawVisits.map((v) => v.visitor_id).filter(Boolean))];
      const hostIds = [...new Set(rawVisits.map((v) => v.host_id).filter(Boolean))];

      const [{ data: visitorsData }, { data: hostsData }] = await Promise.all([
        supabase.from("visitors").select("id, name").in("id", visitorIds),
        supabase.from("hosts").select("id, name").in("id", hostIds),
      ]);

      const visitorMap: Record<string, string> = {};
      (visitorsData || []).forEach((v) => { visitorMap[v.id] = v.name; });

      const hostMap: Record<string, string> = {};
      (hostsData || []).forEach((h) => { hostMap[h.id] = h.name; });

      const exportData = rawVisits.map((v) => ({
        "Visitor Name": visitorMap[v.visitor_id] ?? "Unknown",
        "Purpose": v.purpose ?? "",
        "Host Name": hostMap[v.host_id] ?? "—",
        "Check In": v.check_in_time ? formatIST(v.check_in_time) : "—",
        "Check Out": v.check_out_time ? formatIST(v.check_out_time) : "—",
        "Status": v.status,
        "Created At": formatIST(v.created_at),
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `visit-logs-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "Your visit logs have been exported to CSV.",
      });
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the logs.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleComplete = async (visitId: string) => {

    if (!isGuard) {
      toast.error("Only guards can complete visits.");
      return;
    }
    try {
      const { data: currentVisit, error: fetchError } = await supabase
        .from("visits")
        .select("*")
        .eq("id", visitId)
        .single();

      if (fetchError) throw fetchError;

      // Visitor must have scanned QR (checked-in) before guard can complete
      if (currentVisit.status !== "checked-in") {
        toast.error("Visitor must be checked-in (QR scanned) before completing the visit.");
        return;
      }
      if (currentVisit.check_out_time) {
        toast.error("Visit already completed.");
        return;
      }

      const { error: updateError } = await supabase
        .from("visits")
        .update({
          status: "completed",
          check_out_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", visitId);

      if (updateError) throw updateError;

      toast.success("Visit completed successfully!");
      fetchVisits();
    } catch (error) {
      console.error("Failed to complete visit:", error);
      toast.error("Failed to complete visit.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12">
      <PageHeader
        icon={ScrollText}
        gradient="from-emerald-500 to-green-600"
        title="Visit Logs"
        description="A complete list of all campus visits in the system."
      />

      <div className="mt-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-full lg:max-w-3xl xl:max-w-4xl shrink-0 flex-wrap md:flex-nowrap">
            <div className="w-full sm:flex-1 min-w-[200px]">
              <label htmlFor="search" className="sr-only">Search</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="search"
                  className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-primary-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="Search by visitor or host name"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full sm:w-48 shrink-0">
              <label htmlFor="dateFilter" className="sr-only">Filter by date</label>
              <input
                id="dateFilter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 leading-5 placeholder-gray-500 focus:border-primary-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                title="Select a date to filter visits"
              />
            </div>
            <div className="w-full sm:w-48 shrink-0">
              <label htmlFor="statusFilter" className="sr-only">Filter by status</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 leading-5 placeholder-gray-500 focus:border-primary-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                title="Select a status to filter visits"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="checked-in">Checked-in</option>
              </select>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || logs.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-white dark:ring-slate-600 dark:hover:bg-slate-600 transition-colors w-full sm:w-auto shrink-0"
            >
              {exporting ? (
                <Circle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col">
          <div className="-my-2 sm:-mx-6 lg:-mx-8">
            <div className="inline-block w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg md:rounded-lg">
                <table className="w-full divide-y divide-gray-300 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                        Visitor
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Purpose</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Host</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Check In</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Check Out</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">Duration</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900 dark:divide-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <Circle className="h-4 w-4 animate-spin text-sky-500" />
                            <span>Loading visits...</span>
                          </div>
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-full mb-4 ring-8 ring-gray-50/50 dark:ring-slate-800/20">
                              <Inbox className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No logs found</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                              There are currently no visit logs matching your filters.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const dynamicStatus = getDynamicStatus(log);
                        return (
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6 max-w-[200px]">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="block truncate">{log.visitor_name}</span>
                              </div>
                              {/* Mobile only info */}
                              <div className="block lg:hidden mt-2 space-y-1">
                                <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                  <span className="font-semibold">Host:</span> {log.host_name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                  <span className="font-semibold">Purpose:</span> {log.purpose}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  {log.check_in ? formatIST(log.check_in) : "—"}
                                  {log.check_out && ` - ${formatIST(log.check_out).split(' ')[1]}`}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300 hidden lg:table-cell max-w-[150px] truncate">{log.purpose}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300 hidden lg:table-cell max-w-[150px] truncate">{log.host_name}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300 hidden lg:table-cell">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {log.check_in ? formatIST(log.check_in) : "—"}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300 hidden lg:table-cell">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-gray-400" />
                                {log.check_out ? formatIST(log.check_out) : "—"}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-3 py-4 text-sm hidden lg:table-cell">
                              {log.check_in ? (
                                <span className={`inline-flex items-center gap-1.5 font-medium ${dynamicStatus === "ongoing"
                                  ? "text-teal-600 dark:text-teal-400"
                                  : dynamicStatus === "completed"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-gray-400"
                                  }`}>
                                  <Timer className="h-3.5 w-3.5" />
                                  {dynamicStatus === "ongoing"
                                    ? <span className="flex items-center gap-1">
                                      <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
                                      </span>
                                      {formatDuration(log.check_in, null)}
                                    </span>
                                    : formatDuration(log.check_in, log.check_out)
                                  }
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${dynamicStatus === "completed"
                                  ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 dark:from-emerald-900/50 dark:to-green-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                                  : dynamicStatus === "ongoing"
                                    ? "bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800 dark:from-blue-900/50 dark:to-sky-900/50 dark:text-blue-200 border border-blue-300 dark:border-blue-800"
                                    : dynamicStatus === "denied"
                                      ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/50 dark:to-rose-900/50 dark:text-red-200 border border-red-300 dark:border-red-800"
                                      : dynamicStatus === "cancelled"
                                        ? "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-900/50 dark:to-slate-900/50 dark:text-gray-200 border border-gray-300 dark:border-gray-800"
                                        : "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 dark:from-amber-900/50 dark:to-yellow-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                                  }`}
                              >
                                {dynamicStatus === "completed" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : dynamicStatus === "ongoing" ? (
                                  <Circle className="h-3 w-3 animate-pulse" />
                                ) : dynamicStatus === "denied" ? (
                                  <Ban className="h-3 w-3" />
                                ) : dynamicStatus === "cancelled" ? (
                                  <XCircle className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {dynamicStatus}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-300 whitespace-normal">
                              {/* Only guards can complete, and only after visitor has scanned QR (checked-in) */}
                              {isGuard && log.status === "checked-in" && (
                                <button
                                  onClick={() => handleComplete(log.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-500 rounded-lg transition-all duration-300 border border-emerald-300 dark:border-emerald-700"
                                  title="Complete Visit (Guard only)"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Complete Visit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                    <span className="ml-2 text-gray-400 dark:text-slate-500">({totalItems} total)</span>
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) => Math.max(1, prev - 1));
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
