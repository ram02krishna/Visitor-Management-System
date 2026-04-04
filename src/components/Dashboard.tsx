import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { AlertCircle, CheckCircle2, XCircle, Hourglass, LogIn, ArrowRight, Users, CalendarDays, RefreshCw } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useVisitStats } from "../hooks/useVisitStats";
import { StatsGrid } from "./StatsGrid";
import { formatDistanceToNow } from "date-fns";
import { formatISTTime } from "../lib/dateIST";

function getInitials(name: string) {
  if (!name) return "US";
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
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

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pending", icon: Hourglass, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  denied: { label: "Denied", icon: XCircle, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  "checked-in": { label: "Checked In", icon: LogIn, className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400" },
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
  const initials = name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const connectionTestedRef = useRef(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── Stale-while-revalidate for recent visits ────────────────────────────
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>(() => {
    try { return JSON.parse(localStorage.getItem("vms_recent_visits") ?? "null") ?? []; } catch { return []; }
  });
  const [recentLoading, setRecentLoading] = useState(() =>
    localStorage.getItem("vms_recent_visits") === null
  );

  // ── Stale-while-revalidate for active visitors ──────────────────────────
  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitor[]>(() => {
    try { return JSON.parse(localStorage.getItem("vms_active_visitors") ?? "null") ?? []; } catch { return []; }
  });
  const [activeLoading, setActiveLoading] = useState(() =>
    localStorage.getItem("vms_active_visitors") === null
  );

  const isGuardOrAdmin = user?.role === "admin" || user?.role === "guard";

  const handleStatCardClick = useCallback(
    (status: string) => {
      if (status === "total_users") {
        navigate("/app/users");
      } else if (status === "pending") {
        navigate("/app/approval");
      } else {
        navigate(`/app/visits/${status}`);
      }
    },
    [navigate]
  );

  const fetchRecentVisits = useCallback(async () => {
    try {
      let query = supabase
        .from("visits")
        .select("id, purpose, status, created_at, visitors(name, email)")
        .order("created_at", { ascending: false });

      if (user?.role === "host") {
        query = query.eq("host_id", user.id);
      }

      const { data } = await query.limit(5);
      const visits = (data as unknown as RecentVisit[]) || [];
      setRecentVisits(visits);
      try { localStorage.setItem("vms_recent_visits", JSON.stringify(visits)); } catch { /* quota */ }
    } catch {
      // silently ignore
    } finally {
      setRecentLoading(false);
    }
  }, [user?.role, user?.id]);

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
      try { localStorage.setItem("vms_active_visitors", JSON.stringify(visitors)); } catch { /* quota */ }
    } catch {
      // silently ignore
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

    const refreshInterval = setInterval(() => {
      fetchStats();
      fetchRecentVisits();
      fetchActiveVisitors();
      setLastRefresh(new Date());
    }, 30000);

    const testConnection = async () => {
      try {
        const { error } = await supabase.from("visits").select("id").limit(1);
        if (error) setConnectionError(`Connection error: ${error.message}`);
        else setConnectionError(null);
      } catch (err: unknown) {
        let errorMessage = "An unknown error occurred.";
        if (err instanceof Error) errorMessage = err.message;
        else if (typeof err === "string") errorMessage = err;
        setConnectionError(`Connection exception: ${errorMessage}`);
      }
    };

    if (!connectionTestedRef.current) {
      connectionTestedRef.current = true;
      testConnection();
    }

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
        } else if (user?.role === "admin" || user?.role === "guard") {
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
        } else if (user?.role === "admin" || user?.role === "guard") {
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
    <div className="animate-fadeIn pb-12">
      {/* ── Welcome Header ── */}
      <div className="mb-10 animate-fadeInUp flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="hidden sm:flex w-[72px] h-[72px] rounded-2xl bg-[#3b82f6] shadow-[0_8px_30px_rgb(59,130,246,0.3)] text-white items-center justify-center text-3xl font-extrabold border-[3px] border-white dark:border-slate-800 shrink-0">
            {getInitials(user?.name || "")}
          </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl sm:text-[42px] font-extrabold text-[#1e293b] dark:text-white tracking-tight leading-tight">
                Welcome back, <span className="text-[#3b82f6]">{user?.name?.split(" ")[0] || "Guest"}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {/* Live sync indicator */}
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950"></span>
                  </span>
                  <p className="text-sm font-medium text-slate-500">
                    Live updates
                  </p>
                </div>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                {/* Last sync */}
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Last sync: {formatISTTime(lastRefresh)}
                </div>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                {/* Today's date in IST */}
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
        </div>
      </div>

      {(connectionError || statsError) && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded-r-xl flex items-center animate-fadeIn shadow-sm">
          <AlertCircle className="h-6 w-6 mr-3 text-red-500" />
          <span className="font-medium">{connectionError || statsError}</span>
        </div>
      )}

      {/* ── Statistics Overview ── */}
      <div className="animate-fadeInUp mb-10" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-4">Overview</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-[160px] w-full border border-gray-100 dark:border-slate-800"></div>
            ))}
          </div>
        ) : (
          <StatsGrid stats={stats} handleStatCardClick={handleStatCardClick} />
        )}
      </div>

      {/* ── Active Visitors (guard/admin/host) ── */}
      {(isGuardOrAdmin || user?.role === "host") && (
        <div className="animate-fadeInUp mb-10" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Active Visitors</h2>
              {activeVisitors.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold text-white bg-teal-500 rounded-full">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
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
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-slate-500">
                <Users className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No visitors currently inside</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {activeVisitors.map((v) => <ActiveVisitorRow key={v.id} visitor={v} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recent Visits Feed ── */}
      <div className="animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Recent Visits</h2>
          <Link to="/app/logs" className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
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
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
              <Hourglass className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">No visits recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {recentVisits.map((visit, i) => {
                const cfg = statusConfig[visit.status] || statusConfig["pending"];
                const StatusIcon = cfg.icon;
                const visitorName = visit.visitors?.name ?? "Unknown";
                const initials = visitorName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
                return (
                  <div
                    key={visit.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150 cursor-pointer animate-fadeInUp"
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => navigate("/app/logs")}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{visitorName}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{visit.purpose}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
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
