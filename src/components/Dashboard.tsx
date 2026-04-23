import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hourglass,
  LogIn,
  Users,
  CalendarDays,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVisitStats } from "../hooks/useVisitStats";
import { StatsGrid } from "./StatsGrid";
import { formatDistanceToNow } from "date-fns";
import { formatISTTime, getISTTodayRange } from "../lib/dateIST";
import { SEOMeta } from "./SEOMeta";

function getInitials(name: string) {
  if (!name) return "US";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

type RecentVisit = {
  id: string;
  purpose: string;
  status: string;
  created_at: string;
  visitors: { name: string; email: string } | null;
};

type ActiveVisitor = {
  id: string;
  purpose: string;
  check_in_time: string;
  visitors: { name: string; email: string } | null;
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
      label: "Checked In",
      icon: LogIn,
      className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    },
    cancelled: {
      label: "Cancelled",
      icon: XCircle,
      className: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
    },
  };

function useLiveDuration(checkInTime: string | null) {
  const [duration, setDuration] = useState("");
  useEffect(() => {
    if (!checkInTime) return;
    const update = () => {
      const ms = Date.now() - new Date(checkInTime).getTime();
      const totalMins = Math.floor(ms / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setDuration(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [checkInTime]);
  return duration;
}

function ActiveVisitorRow({ visitor }: { visitor: ActiveVisitor }) {
  const duration = useLiveDuration(visitor.check_in_time);
  const name = visitor.visitors?.name ?? "Unknown";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
      <div className="w-9 h-9 rounded-[1.25rem] bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{visitor.purpose}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
        </span>
        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">{duration}</span>
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, loading, error: statsError, fetchStats } = useVisitStats(user);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── Stale-while-revalidate for recent visits ────────────────────────────
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vms_recent_visits") ?? "null") ?? [];
    } catch {
      return [];
    }
  });
  const [recentLoading, setRecentLoading] = useState(
    () => localStorage.getItem("vms_recent_visits") === null
  );

  // ── Stale-while-revalidate for active visitors ──────────────────────────
  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitor[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vms_active_visitors") ?? "null") ?? [];
    } catch {
      return [];
    }
  });
  const [activeLoading, setActiveLoading] = useState(
    () => localStorage.getItem("vms_active_visitors") === null
  );

  const isGuardOrAdmin = user?.role === "admin" || user?.role === "guard";

  const handleStatCardClick = useCallback(
    (status: string) => {
      if (status === "total_users") {
        navigate("/app/users");
      } else {
        navigate(`/app/visits/${status}`);
      }
    },
    [navigate]
  );

  const prefetchVisits = useCallback(async (status: string) => {
    if (status === "total_users" || !user) return;
    
    // Only prefetch if not already in cache or cache is old
    const cacheKey = `vms_filtered_${status}`;
    if (localStorage.getItem(cacheKey)) return;

    try {
      let query = supabase.from("visits").select(`*, visitor:visitors(*)`);
      if (status === "cancelled_denied") {
        query = query.in("status", ["cancelled", "denied"]);
      } else {
        query = query.eq("status", status);
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

      const { data } = await query.order("created_at", { ascending: false }).limit(50);
      if (data) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch { /* ignore prefetch errors */ }
  }, [user]);

  const fetchRecentVisits = useCallback(async () => {
    try {
      let query = supabase
        .from("visits")
        .select("id, purpose, status, created_at, visitors(name, email)")
        .order("created_at", { ascending: false });

      if (user?.role === "host") {
        query = query.eq("host_id", user.id);
      } else if (user?.role === "visitor") {
        const { data: vProfile } = await supabase.from("visitors").select("id").ilike("email", user.email.trim()).limit(1).maybeSingle();
        if (vProfile) query = query.eq("visitor_id", vProfile.id);
        else query = query.eq("visitor_id", "00000000-0000-0000-0000-000000000000");
      }

      const { data } = await query.limit(5);
      const visits = (data as unknown as RecentVisit[]) || [];
      setRecentVisits(visits);
      try {
        localStorage.setItem("vms_recent_visits", JSON.stringify(visits));
      } catch {
        /* Ignore quota errors */
      }
    } catch {
      // Silence fetch errors for stale-while-revalidate pattern
    } finally {
      setRecentLoading(false);
    }
  }, [user?.role, user?.id, user?.email]);

  const fetchActiveVisitors = useCallback(async () => {
    if (user?.role !== "admin" && user?.role !== "guard" && user?.role !== "host") {
      setActiveLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("visits")
        .select("id, purpose, check_in_time, visitors(name, email), host_id")
        .eq("status", "checked-in")
        .order("check_in_time", { ascending: true });

      if (user?.role === "host") {
        query = query.eq("host_id", user.id);
      }

      const { data } = await query;
      const visitors = (data as unknown as ActiveVisitor[]) || [];
      setActiveVisitors(visitors);
      try {
        localStorage.setItem("vms_active_visitors", JSON.stringify(visitors));
      } catch {
        /* Ignore quota errors */
      }
    } catch {
      // Silence fetch errors for stale-while-revalidate pattern
    } finally {
      setActiveLoading(false);
    }
  }, [user?.role, user?.id]);

  useEffect(() => {
    if (!user?.role) return;

    fetchStats();
    fetchRecentVisits();
    fetchActiveVisitors();
    setLastRefresh(new Date());

    // Poll every 60s as a fallback — realtime subscription handles live changes
    const refreshInterval = setInterval(() => {
      fetchStats();
      fetchRecentVisits();
      fetchActiveVisitors();
      setLastRefresh(new Date());
    }, 60000);

    const channel = supabase
      .channel("visits_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visits" }, (payload) => {
        // For new visits, check if it's relevant to current user
        const newVisit = payload.new as { host_id: string };
        if (user?.role === "host" && newVisit.host_id === user.id) {
          fetchStats();
          fetchRecentVisits();
          fetchActiveVisitors();
          setLastRefresh(new Date());
        } else if (user?.role === "admin" || user?.role === "guard" || user?.role === "visitor") {
          fetchStats();
          fetchRecentVisits();
          fetchActiveVisitors();
          setLastRefresh(new Date());
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "visits" }, (payload) => {
        // For updated visits (approve/deny), check if relevant to current user
        const updatedVisit = payload.new as { host_id: string };
        if (user?.role === "host" && updatedVisit.host_id === user.id) {
          fetchStats();
          fetchRecentVisits();
          fetchActiveVisitors();
          setLastRefresh(new Date());
        } else if (user?.role === "admin" || user?.role === "guard" || user?.role === "visitor") {
          fetchStats();
          fetchRecentVisits();
          fetchActiveVisitors();
          setLastRefresh(new Date());
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "visits" }, () => {
        fetchStats();
        fetchRecentVisits();
        fetchActiveVisitors();
        setLastRefresh(new Date());
      })
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [user?.role, user?.id, fetchStats, fetchRecentVisits, fetchActiveVisitors]);

  return (
    <div className="animate-fadeIn pb-8">
      <SEOMeta title="Dashboard" />
      {/* ── Welcome Header ── */}
      <div className="mb-6 animate-fadeInUp flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden xs:flex w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-[2.2rem] bg-[#3b82f6] shadow-[0_8px_30px_rgb(59,130,246,0.3)] text-white items-center justify-center text-xl sm:text-3xl font-extrabold border-[3px] border-white dark:border-slate-800 shrink-0">
            {getInitials(user?.name || "")}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[42px] font-black text-[#1e293b] dark:text-white tracking-tighter leading-none truncate">
              Welcome back,{" "}
              <span className="text-[#3b82f6] underline decoration-blue-500/20 underline-offset-4">{user?.name?.split(" ")[0] || "Guest"}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">Live updates</p>
              </div>
              <span className="hidden xs:block text-slate-300 dark:text-slate-700">|</span>

              <div className="flex items-center gap-1.5 text-[11px] sm:text-sm font-medium text-slate-500">
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xxs:inline">Sync:</span> {formatISTTime(lastRefresh)}
              </div>
              <span className="hidden xs:block text-slate-300 dark:text-slate-700">|</span>
              {/* Today's date in IST */}
              <div className="flex items-center gap-1.5 text-[11px] sm:text-sm font-medium text-slate-500">
                <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {new Date().toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {statsError && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-2xl flex items-center animate-fadeIn shadow-sm">
          <AlertCircle className="h-6 w-6 mr-3 text-red-500" />
          <span className="font-medium">{statsError}</span>
        </div>
      )}

      {/* ── Statistics Overview ── */}
      <div className="animate-fadeInUp mb-8" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
          Overview
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="skeleton h-[160px] w-full border border-gray-100 dark:border-slate-800"
              ></div>
            ))}
          </div>
        ) : (
          <StatsGrid 
            stats={stats} 
            handleStatCardClick={handleStatCardClick} 
            handlePrefetch={prefetchVisits} 
          />
        )}
      </div>

      {/* ── Active Visitors (guard/admin/host) ── */}
      {(isGuardOrAdmin || user?.role === "host") && (
        <div className="animate-fadeInUp mb-8" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Active Visitors
              </h2>
              {activeVisitors.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold text-white bg-teal-500 rounded-lg">
                  {activeVisitors.length}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              Live
            </span>
          </div>
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl overflow-hidden transition-all duration-300">
            {activeLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3.5 w-28 rounded" />
                      <div className="skeleton h-3 w-40 rounded" />
                    </div>
                    <div className="skeleton h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            ) : activeVisitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mb-4 ring-8 ring-teal-50/50 dark:ring-teal-900/10">
                  <Users className="w-8 h-8 text-teal-400 dark:text-teal-500 opacity-80" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">No Active Visitors</h3>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 max-w-[200px]">
                  There are no visitors currently checked-in on campus.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {activeVisitors.map((v) => (
                  <ActiveVisitorRow key={v.id} visitor={v} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recent Visits Feed ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Recent Visits
          </h2>
          <button
            onClick={() => navigate("/app/logs")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-800/40 transition-all duration-200 hover:scale-[1.03] active:scale-95"
          >
            View All
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl overflow-hidden transition-all duration-300">
          {recentLoading ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                  </div>
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-slate-800/50">
                <Hourglass className="w-8 h-8 text-gray-400 dark:text-slate-500 opacity-80" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">No Visits Yet</h3>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 max-w-[200px]">
                There are no recently recorded visits to display.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {recentVisits.map((visit, i) => {
                const cfg = statusConfig[visit.status] || statusConfig["pending"];
                const StatusIcon = cfg.icon;
                const visitorName = visit.visitors?.name ?? "Unknown";
                const initials = visitorName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={visit.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150 animate-fadeInUp"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="w-9 h-9 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {visitorName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {visit.purpose}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        {formatDistanceToNow(new Date(visit.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
