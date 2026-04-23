"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import {
  Inbox,
  Search,
  CalendarCheck2,
  Trophy,
  ShieldX,
  Activity,
  ChevronRight,
  Hourglass,
  Users,
  CheckCircle2,
  XCircle,
  LogIn,
} from "lucide-react";
import { VisitDetails } from "./VisitDetails";
import type { Database } from "../lib/database.types";
import log from "../lib/logger";
import { useAuthStore } from "../store/auth";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import { getISTTodayRange, formatIST } from "../lib/dateIST";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitor: Database["public"]["Tables"]["visitors"]["Row"] | null;
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

export function FilteredVisits() {
  const { status } = useParams<{ status: string }>();
  const { user } = useAuthStore();

  const [visits, setVisits] = useState<Visit[]>(() => {
    try {
      const cached = localStorage.getItem(`vms_filtered_${status}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => localStorage.getItem(`vms_filtered_${status}`) === null);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const getStatusDetails = () => {
    switch (status) {
      case "checked-in":
        return {
          title: "Ongoing Visits",
          desc: "Live monitoring of visitors currently on campus.",
          icon: Activity,
          gradient: "from-sky-500 to-indigo-600",
          emptyClasses: {
            outer:
              "from-sky-100 to-sky-50 dark:from-sky-900/30 dark:to-sky-800/10 ring-sky-200 dark:ring-sky-900/50",
            icon: "text-sky-500 dark:text-sky-400",
          },
        };
      case "pending":
        return {
          title: "Pending Approvals",
          desc: "Applications waiting for administrative clearance.",
          icon: Hourglass,
          gradient: "from-amber-500 to-orange-600",
          emptyClasses: {
            outer:
              "from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/10 ring-amber-200 dark:ring-amber-900/50",
            icon: "text-amber-500 dark:text-amber-400",
          },
        };
      case "approved":
        return {
          title: "Approved Visits",
          desc: "Visits cleared by administration for today.",
          icon: CalendarCheck2,
          gradient: "from-emerald-500 to-teal-600",
          emptyClasses: {
            outer:
              "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/10 ring-emerald-200 dark:ring-emerald-900/50",
            icon: "text-emerald-500 dark:text-emerald-400",
          },
        };
      case "completed":
        return {
          title: "Completed Visits",
          desc: "Archive of visitors who have checked out today.",
          icon: Trophy,
          gradient: "from-purple-500 to-indigo-600",
          emptyClasses: {
            outer:
              "from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/10 ring-purple-200 dark:ring-purple-900/50",
            icon: "text-purple-500 dark:text-purple-400",
          },
        };
      case "cancelled_denied":
        return {
          title: "Rejected Requests",
          desc: "Applications that were cancelled or denied access.",
          icon: ShieldX,
          gradient: "from-rose-500 to-red-600",
          emptyClasses: {
            outer:
              "from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-800/10 ring-rose-200 dark:ring-rose-900/50",
            icon: "text-rose-500 dark:text-rose-400",
          },
        };
      default:
        return {
          title: "Visit Log",
          desc: "Filtered view of campus activity.",
          icon: Inbox,
          gradient: "from-slate-700 to-slate-900",
          emptyClasses: {
            outer:
              "from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700/50 ring-gray-200 dark:ring-slate-700",
            icon: "text-gray-400 dark:text-slate-400",
          },
        };
    }
  };

  const { title, desc, icon: StatusIcon, gradient } = getStatusDetails();

  const getFocusRingColor = () => {
    switch (status) {
      case "checked-in":
        return "focus:ring-sky-500/20";
      case "pending":
        return "focus:ring-amber-500/20";
      case "approved":
        return "focus:ring-emerald-500/20";
      case "completed":
        return "focus:ring-purple-500/20";
      case "cancelled_denied":
        return "focus:ring-rose-500/20";
      default:
        return "focus:ring-slate-500/20";
    }
  };

  const fetchVisits = useCallback(async () => {
    if (!status || !user) return;
    
    const cached = localStorage.getItem(`vms_filtered_${status}`);
    if (!cached && !debouncedSearchTerm) setLoading(true);

    try {
      let query = supabase.from("visits").select(`*, visitor:visitors(*)`);

      if (status === "cancelled_denied") {
        query = query.in("status", ["cancelled", "denied"]);
      } else {
        query = query.eq("status", status);
      }

      if (debouncedSearchTerm) {
        query = query.or(
          `purpose.ilike.%${debouncedSearchTerm}%,visitor:visitors(name.ilike.%${debouncedSearchTerm}%)`
        );
      }

      if (user?.role === "host") query = query.eq("host_id", user.id);
      else if (user?.role === "visitor") {
        const { data: vProfile } = await supabase.from("visitors").select("id").ilike("email", user.email.trim()).limit(1).maybeSingle();
        if (vProfile) query = query.eq("visitor_id", vProfile.id);
        else query = query.eq("visitor_id", "00000000-0000-0000-0000-000000000000");
      }

      const [utcTodayStart, utcTomorrowStart] = getISTTodayRange();
      if (status === "approved") {
        query = query.gte("approved_at", utcTodayStart).lt("approved_at", utcTomorrowStart);
      } else if (status === "completed") {
        query = query.gte("check_out_time", utcTodayStart).lt("check_out_time", utcTomorrowStart);
      } else if (status === "cancelled_denied") {
        query = query.gte("created_at", utcTodayStart).lt("created_at", utcTomorrowStart);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      
      setVisits(data as Visit[]);
      
      if (!debouncedSearchTerm) {
        try {
          localStorage.setItem(`vms_filtered_${status}`, JSON.stringify(data));
        } catch { /* Quota */ }
      }
    } catch (err) {
      log.error(`[FilteredVisits] Fetch error for status ${status}:`, err);
      toast.error("Failed to load visits. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [status, user, debouncedSearchTerm]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <BackButton />

        <PageHeader
          icon={StatusIcon}
          gradient={gradient}
          title={title}
          description={desc}
          right={
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <input
                className={`block w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 pl-10 pr-4 text-sm ${getFocusRingColor()} outline-none transition-all dark:text-white`}
                placeholder="Quick search..."
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          }
        />
      </div>

      <div className="mt-8 max-w-7xl mx-auto">
        <div className="mt-4 flex flex-col min-h-[400px]">
          <div className="-my-2 sm:-mx-6 lg:-mx-8 flex-1">
            <div className="inline-block w-full py-2 align-middle md:px-6 lg:px-8 h-full">
              <div className="glass-panel rounded-[2rem] overflow-hidden transition-all duration-300 h-full flex flex-col">
                <div className="lg:hidden px-6 py-2 bg-sky-50/50 dark:bg-sky-900/10 border-b border-gray-100 dark:border-slate-800/50">
                  <p className="text-[9px] font-black text-sky-600/60 dark:text-sky-400/60 uppercase tracking-widest flex items-center gap-1.5">
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
                      ) : visits.length === 0 ? (
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
                        visits.map((visit, idx) => {
                          const isOverstay =
                            status === "checked-in" &&
                            visit.expected_out_time &&
                            new Date(visit.expected_out_time) < new Date();
                          const cfg = statusConfig[visit.status] || statusConfig["pending"];
                          const StatusIcon = cfg.icon;
                          const visitorName = visit.visitor?.name || "Unknown";
                          return (
                            <tr
                              key={visit.id}
                              onClick={() => setSelectedVisit(visit)}
                              className={`cursor-pointer hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors animate-fadeInUp ${
                                isOverstay ? "bg-red-50/10 dark:bg-red-900/10" : ""
                              }`}
                              style={{ animationDelay: `${idx * 0.02}s` }}
                            >
                              <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-[1.25rem] bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                                    {visit.visitor?.photo_url ? (
                                      <img
                                        src={visit.visitor.photo_url}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      visitorName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold">{visitorName}</p>
                                    {isOverstay && (
                                      <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                                        ⚠ Overstay
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {visit.additional_guests > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase">
                                    <Users className="w-3 h-3" /> +{visit.additional_guests}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {visit.vehicle_number ? (
                                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                                    {visit.vehicle_number}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600 dark:text-slate-400">
                                <span className="text-xs font-medium">{visit.visitor?.phone || "—"}</span>
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {visit.check_in_time ? (
                                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                                    {formatIST(visit.check_in_time)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {visit.check_out_time ? (
                                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                                    {formatIST(visit.check_out_time)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {visit.entry_gate ? (
                                  <span className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/60 ring-1 ring-gray-200 dark:ring-slate-700/50">
                                    {visit.entry_gate}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                {visit.exit_gate ? (
                                  <span className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800/60 ring-1 ring-gray-200 dark:ring-slate-700/50">
                                    {visit.exit_gate}
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
                                    className={`w-3 h-3 ${visit.status === "checked-in" ? "animate-pulse" : ""}`}
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
