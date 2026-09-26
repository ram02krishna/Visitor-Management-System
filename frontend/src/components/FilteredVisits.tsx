import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "react-hot-toast";
import {
  Inbox,
  Search,
  CalendarCheck2,
  CheckCheck,
  Activity,
  ChevronRight,
  Clock3,
  Users,
  CheckCircle2,
  XCircle,
  LogIn,
  Ban,
} from "lucide-react";
import { VisitDetails } from "./VisitDetails";
import type { Database } from "../lib/database.types";
import log from "../lib/logger";
import { useAuthStore } from "../store/auth";
import { PageHeader } from "./PageHeader";
import { getISTTodayRange, formatIST } from "../lib/dateIST";
import { useDataSync } from "../lib/dataSync";


type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitor: Database["public"]["Tables"]["visitors"]["Row"] | null;
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> =
{
  pending: {
    label: "Pending",
    icon: Clock3,
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
    icon: CheckCheck,
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  checked_in: {
    label: "Active",
    icon: LogIn,
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
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

export function FilteredVisits() {
  const { status } = useParams<{ status: string }>();
  const { user } = useAuthStore();
  const cacheKey = user ? `vms_filtered_${status}_${user.id}_${user.role}` : `vms_filtered_${status}`;

  const [visits, setVisits] = useState<Visit[]>(() => api.uiCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!api.uiCache.has(cacheKey));
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const getStatusDetails = () => {
    switch (status) {
      case "checked_in":
        return {
          title: "Ongoing Visits",
          desc: "Live monitoring of visitors currently on campus.",
          icon: Activity,
          gradient: "from-teal-500 to-emerald-600",
          emptyClasses: {
            outer: "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-500/20",
            icon: "text-teal-600 dark:text-teal-400",
          },
        };
      case "pending":
        return {
          title: "Pending Approvals",
          desc: "Applications waiting for administrative clearance.",
          icon: Clock3,
          gradient: "from-amber-500 to-orange-500",
          emptyClasses: {
            outer: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/20",
            icon: "text-amber-600 dark:text-amber-400",
          },
        };
      case "approved":
        return {
          title: "Approved Visits",
          desc: "Visits cleared by administration for today.",
          icon: CalendarCheck2,
          gradient: "from-emerald-500 to-teal-600",
          emptyClasses: {
            outer: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
            icon: "text-emerald-600 dark:text-emerald-400",
          },
        };
      case "completed":
        return {
          title: "Completed Visits",
          desc: "Archive of visitors who have checked out today.",
          icon: CheckCheck,
          gradient: "from-sky-500 to-blue-600",
          emptyClasses: {
            outer: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-500/20",
            icon: "text-sky-600 dark:text-sky-400",
          },
        };
      case "cancelled_denied":
        return {
          title: "Cancelled / Denied Visits",
          desc: "Visits that were rejected or cancelled today.",
          icon: Ban,
          gradient: "from-rose-500 to-red-600",
          emptyClasses: {
            outer: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20",
            icon: "text-rose-600 dark:text-rose-400",
          },
        };

      default:
        return {
          title: "Visitor Logs",
          desc: "Showing filtered visitor records.",
          icon: Inbox,
          gradient: "from-slate-500 to-gray-600",
          emptyClasses: {
            outer: "bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-800",
            icon: "text-gray-400 dark:text-slate-500",
          },
        };
    }
  };

  const { title, desc, icon: StatusIcon, gradient, emptyClasses } = getStatusDetails();

  const getFocusRingColor = () => {
    switch (status) {
      case "checked_in":
        return "focus:ring-teal-500/20";
      case "pending":
        return "focus:ring-amber-500/20";
      case "approved":
        return "focus:ring-emerald-500/20";
      case "completed":
        return "focus:ring-sky-500/20";
      case "cancelled_denied":
        return "focus:ring-rose-500/20";
      default:
        return "focus:ring-slate-500/20";
    }
  };

  const formatGateName = (gate?: string | null) => {
    if (!gate) return null;
    const lower = gate.toLowerCase();
    if (lower.includes("hostel")) return "Hostel Gate";
    return "Main Gate";
  };

  const fetchVisits = useCallback(async () => {
    if (!status || !user || !localStorage.getItem("vms_token")) return;

    const isCached = api.uiCache.has(cacheKey);
    if (!isCached && !debouncedSearchTerm) setLoading(true);

    try {
      const [utcTodayStart, utcTomorrowStart] = getISTTodayRange();

      const data = await api.visits.list({
        ...(status === "cancelled_denied" ? { statuses: ["cancelled", "denied"] } : { status }),
        ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
        ...(user?.role === "host" ? { host_id: user.id } : {}),
        ...(status === "approved"
          ? { approved_from: utcTodayStart, approved_to: utcTomorrowStart }
          : {}),
        ...(status === "completed"
          ? { checkout_from: utcTodayStart, checkout_to: utcTomorrowStart }
          : {}),
        ...(status === "cancelled_denied"
          ? { created_from: utcTodayStart, created_to: utcTomorrowStart }
          : {}),
        limit: 200,
      });

      const rawList = Array.isArray(data) ? data : [];
      setVisits(rawList as unknown as Visit[]);
      if (!debouncedSearchTerm) {
        api.uiCache.set(cacheKey, rawList);
      }
    } catch (err) {
      log.error(`[FilteredVisits] Fetch error for status ${status}:`, err);
      if (localStorage.getItem("vms_token")) {
        toast.error("Failed to load visits. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [status, user, cacheKey, debouncedSearchTerm]);

  useDataSync(["visits", "all"], () => {
    fetchVisits();
  });

  useEffect(() => {
    fetchVisits();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchVisits();
      }
    }, 12000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchVisits]);



  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <PageHeader
        backTo="/app/dashboard"
        icon={StatusIcon}
        gradient={gradient}
        title={title}
        description={desc}
        right={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              className={`block w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-4 text-xs sm:text-sm ${getFocusRingColor()} outline-none transition-all dark:text-white shadow-xs`}
              placeholder="Search visitor, phone or vehicle..."
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">

          <div className="lg:hidden px-6 py-2 bg-sky-50/50 dark:bg-sky-900/10 border-b border-gray-100 dark:border-slate-800/50">
            <p className="text-[9px] font-black text-sky-600/60 dark:text-sky-400/60 uppercase tracking-widest flex items-center gap-1.5">
              <span className="animate-pulse">←</span> Swipe horizontally to see more details{" "}
              <span className="animate-pulse">→</span>
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full divide-y divide-gray-200 dark:divide-slate-800 min-w-[950px]">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-slate-800/60">
                  <th className="py-3.5 pl-6 pr-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Visitor
                  </th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Guests
                  </th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Vehicle
                  </th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Contact Phone
                  </th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Entry Time
                  </th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Exit Time
                  </th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Gates
                  </th>
                  <th className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="py-3.5 pr-6 text-right text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80 text-xs">

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
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                        <div className={`p-4 rounded-2xl ${emptyClasses.outer}`}>
                          <StatusIcon className="w-8 h-8" />
                        </div>
                        <h4 className="text-base font-black text-gray-900 dark:text-white">
                          No {title} Found
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {desc}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visits.map((visit, idx) => {
                    const isOverstay =
                      status === "checked_in" &&
                      visit.expected_out_time &&
                      new Date(visit.expected_out_time) < new Date();
                    const cfg = statusConfig[visit.status] || statusConfig["pending"];
                    const StatusIcon = cfg.icon;
                    const visitorName = visit.visitor?.name || "Unknown";
                    return (
                      <tr
                        key={visit.id}
                        onClick={() => setSelectedVisit(visit)}
                        className={`cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors animate-fadeInUp ${isOverstay ? "bg-red-50/10 dark:bg-red-900/10" : ""
                          }`}
                        style={{ animationDelay: `${idx * 0.02}s` }}
                      >
                        <td className="py-2.5 pl-4 pr-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden">
                              {visit.visitor?.photo_url ? (
                                <img
                                  src={visit.visitor.photo_url}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                visitorName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate max-w-[130px] sm:max-w-[170px]">{visitorName}</p>
                              {isOverstay && (
                                <p className="text-[9px] text-red-600 dark:text-red-400 font-bold uppercase">
                                  ⚠ Overstay
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500 dark:text-slate-400">
                          {visit.additional_guests > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                              <Users className="w-2.5 h-2.5" /> +{visit.additional_guests}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-gray-800 dark:text-slate-200">
                          {visit.vehicle_number || (
                            <span className="text-gray-300 dark:text-slate-600 font-normal">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-slate-400">
                          {visit.visitor?.phone || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-gray-800 dark:text-slate-200">
                          {visit.check_in_time ? (
                            formatIST(visit.check_in_time)
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 font-normal">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-gray-800 dark:text-slate-200">
                          {visit.check_out_time ? (
                            formatIST(visit.check_out_time)
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 font-normal">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                          {visit.entry_gate ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/80 ring-1 ring-gray-200/80 dark:ring-slate-700/50">
                              {formatGateName(visit.entry_gate)}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                          {visit.exit_gate ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/80 ring-1 ring-gray-200/80 dark:ring-slate-700/50">
                              {formatGateName(visit.exit_gate)}
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
                              className={`w-3 h-3 ${visit.status === "checked_in" ? "animate-pulse" : ""}`}
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
    </div>
  );
}

