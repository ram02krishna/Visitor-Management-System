import { useState, useEffect, useCallback, memo } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useDataSync } from "../lib/dataSync";
import {
  AlertCircle,
  Hourglass,
  Users,
  CalendarDays,
  RefreshCw,
  ArrowRight,
  GraduationCap,
  Building2,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  UsersRound,
  CalendarCheck2,
  Clock3,
  CheckCheck,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";

import { useNavigate } from "react-router-dom";
import { StatItem } from "../hooks/useVisitStats";
import { StatsGrid } from "./StatsGrid";
import { formatDistanceToNow } from "date-fns";
import { formatISTTime, getISTTodayRange } from "../lib/dateIST";
import { getStatusConfig } from "../lib/statusConfig";
import { SEOMeta } from "./SEOMeta";
import { ClaimStudentPassModal } from "./ClaimStudentPassModal";

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
  visitor: { name: string; email: string } | null;
};

type ActiveVisitor = {
  id: string;
  purpose: string;
  check_in_time: string;
  visitor: { name: string; email: string } | null;
};

type TelemetryData = {
  census: {
    currentCampusPopulation: number;
    campusSafeCapacity: number;
    occupancyPercentage: number;
    insideStudents: number;
    outStudents: number;
    leaveStudents: number;
    activeVisitorsCount: number;
    overstayCount: number;
  };
  overstayedVisits: Array<{
    id: string;
    visitorName?: string;
    visitorPhone?: string;
    purpose: string;
    checkInTime: string;
    hostName: string;
    overstayMinutes: number;
    escortName?: string;
    overstayNotified: boolean;
  }>;
  hourlyDistribution: Array<{ hour: string; entries: number; exits: number }>;
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

const ActiveVisitorRow = memo(({ visitor }: { visitor: ActiveVisitor }) => {
  const duration = useLiveDuration(visitor.check_in_time);
  const name = visitor.visitor?.name ?? "Unknown";
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
});

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isGuardOrAdmin = user?.role === "admin" || user?.role === "guard";
  const isAuthorityRole = user?.role === "admin" || user?.role === "guard" || user?.role === "warden";

  const cachedStats = api.uiCache.get(`vms_dash_stats_${user?.role}`) || [];
  const cachedRecent = api.uiCache.get("vms_dash_recent") || [];
  const cachedActive = api.uiCache.get("vms_dash_active") || [];
  const cachedTelemetry = api.uiCache.get("vms_dash_telemetry") || null;

  const hasWarmCache = !!(
    cachedStats.length > 0 &&
    api.uiCache.has("vms_dash_recent") &&
    (!isGuardOrAdmin && user?.role !== "host" || api.uiCache.has("vms_dash_active")) &&
    (!isAuthorityRole || cachedTelemetry !== null)
  );

  const [stats, setStats] = useState<StatItem[]>(cachedStats);
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>(cachedRecent);
  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitor[]>(cachedActive);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(cachedTelemetry);
  const [isLoading, setIsLoading] = useState(!hasWarmCache);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showClaimModal, setShowClaimModal] = useState(false);

  const handleDispatchEscort = async (visitId: string, visitorName?: string) => {
    try {
      await api.visits.dispatchEscort(visitId);
      toast.success(`Security Escort dispatched for ${visitorName || "visitor"}!`);
      if (isAuthorityRole) {
        const data = await api.visits.getTrafficTelemetry();
        setTelemetry(data);
        api.uiCache.set("vms_dash_telemetry", data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch escort.");
    }
  };

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

  const prefetchVisits = useCallback(
    async (status: string) => {
      if (status === "total_users" || !user) return;

      try {
        const statuses = status === "cancelled_denied" ? ["cancelled", "denied"] : undefined;
        const [utcTodayStart, utcTomorrowStart] = getISTTodayRange();

        await api.visits.list({
          ...(statuses ? { statuses } : { status }),
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
          limit: 50,
        });
      } catch {

      }
    },
    [user]
  );

  const refreshAll = useCallback(
    async (force = false) => {
      if (!user?.role) return;

      try {
        const role = user.role;
        const [todayStart, todayEnd] = getISTTodayRange();
        const start = new Date(todayStart).getTime();
        const end = new Date(todayEnd).getTime();

        const [statsVisitsRes, hostsRes, recentRes, activeRes, telemetryRes] =
          await Promise.allSettled([

            api.visits.list({
              ...(role === "host" ? { host_id: user.id } : {}),
              ...(force ? { _t: Date.now() } : {}),
            }),

            role === "admin" ? api.hosts.list() : Promise.resolve([]),

            api.visits.list({
              ...(role === "host" ? { host_id: user.id } : {}),
              ...(force ? { _t: Date.now() } : {}),
              limit: 5,
            }),

            role === "admin" || role === "guard" || role === "host"
              ? api.visits.list({
                status: "checked_in",
                ...(role === "host" ? { host_id: user.id } : {}),
                ...(force ? { _t: Date.now() } : {}),
              })
              : Promise.resolve([]),

            role === "admin" || role === "guard" || role === "warden"
              ? api.visits.getTrafficTelemetry()
              : Promise.resolve(null),
          ]);

        if (statsVisitsRes.status === "fulfilled") {
          const allVisits = (statsVisitsRes.value as any[]) || [];
          let ongoingCount = 0;
          let approvedToday = 0;
          let pendingCount = 0;
          let completedToday = 0;
          let cancelledCount = 0;
          let deniedCount = 0;

          allVisits.forEach((v) => {
            if (v.status === "checked_in") ongoingCount++;
            if (v.status === "approved" && v.approved_at) {
              const t = new Date(v.approved_at).getTime();
              if (t >= start && t < end) approvedToday++;
            }
            if (v.status === "pending") pendingCount++;
            if (v.status === "completed" && v.check_out_time) {
              const t = new Date(v.check_out_time).getTime();
              if (t >= start && t < end) completedToday++;
            }
            if (v.status === "cancelled" && v.updated_at) {
              const t = new Date(v.updated_at).getTime();
              if (t >= start && t < end) cancelledCount++;
            }
            if (v.status === "denied" && v.updated_at) {
              const t = new Date(v.updated_at).getTime();
              if (t >= start && t < end) deniedCount++;
            }
          });

          const totalUsers =
            hostsRes.status === "fulfilled" ? (hostsRes.value as any[])?.length || 0 : 0;

          const statsData: StatItem[] = [
            {
              name: "Ongoing Visits",
              value: ongoingCount,
              icon: Activity,
              color: "text-teal-500",
              bgColor: "bg-teal-50",
              status: "checked_in",
            },
            {
              name: "Approved Visits",
              value: approvedToday,
              icon: CalendarCheck2,
              color: "text-green-500",
              bgColor: "bg-green-50",
              status: "approved",
            },
            {
              name: "Pending Approvals",
              value: pendingCount,
              icon: Clock3,
              color: "text-yellow-500",
              bgColor: "bg-yellow-50",
              status: "pending",
            },
            {
              name: "Completed Visits",
              value: completedToday,
              icon: CheckCheck,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50",
              status: "completed",
            },
            {
              name: "Cancelled/Denied",
              value: cancelledCount + deniedCount,
              icon: ShieldAlert,
              color: "text-rose-500",
              bgColor: "bg-rose-50",
              status: "cancelled_denied",
            },
          ];

          if (role === "admin") {
            statsData.unshift({
              name: "Total Users",
              value: totalUsers,
              icon: UsersRound,
              color: "text-blue-500",
              bgColor: "bg-blue-50",
              status: "total_users",
            });
          }

          setStats(statsData);
          api.uiCache.set(`vms_dash_stats_${role}`, statsData);
          setStatsError(null);
        } else if (stats.length === 0) {
          setStatsError("Failed to fetch statistics.");
        }

        if (recentRes.status === "fulfilled") {
          const visits = (recentRes.value as unknown as RecentVisit[]) || [];
          setRecentVisits(visits);
          api.uiCache.set("vms_dash_recent", visits);
        }

        if (activeRes.status === "fulfilled") {
          const visitors = (activeRes.value as unknown as ActiveVisitor[]) || [];
          setActiveVisitors(visitors);
          api.uiCache.set("vms_dash_active", visitors);
        }

        if (telemetryRes.status === "fulfilled" && telemetryRes.value) {
          setTelemetry(telemetryRes.value as TelemetryData);
          api.uiCache.set("vms_dash_telemetry", telemetryRes.value);
        }

        setLastRefresh(new Date());
      } finally {

        setIsLoading(false);
      }
    },
    [user, stats.length]
  );

  useDataSync(["visits", "visitors", "stats", "all"], () => {
    refreshAll(true);
  });

  useEffect(() => {
    if (!user?.role) return;
    refreshAll(false);
    const refreshInterval = setInterval(() => {
      refreshAll(false);
    }, 5000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user?.role, user?.id, refreshAll]);

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <SEOMeta title="Dashboard" />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden xs:flex w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-2xl bg-[#3b82f6] shadow-[0_8px_30px_rgb(59,130,246,0.3)] text-white items-center justify-center text-xl sm:text-3xl font-extrabold border-[3px] border-white dark:border-slate-800 shrink-0">
            {getInitials(user?.name === "System Administrator" ? "Admin" : (user?.name || "Admin"))}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[42px] font-black text-[#1e293b] dark:text-white tracking-tighter leading-none truncate">
              Welcome back,{" "}
              <span className="text-[#3b82f6] underline decoration-blue-500/20 underline-offset-4">
                {user?.name === "System Administrator" ? "Admin" : (user?.name || "Admin")}
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Live updates
                </p>
              </div>
              <span className="hidden xs:block text-slate-300 dark:text-slate-700">|</span>

              <div className="flex items-center gap-1.5 text-[11px] sm:text-sm font-medium text-slate-500">
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xxs:inline">Sync:</span> {formatISTTime(lastRefresh)}
              </div>
              <span className="hidden xs:block text-slate-300 dark:text-slate-700">|</span>

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

      {user?.role === "visitor" && (
        <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-transparent border border-sky-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
                Enrolled College Student?
              </span>
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-0.5">
                Activate Your Resident Student GatePass
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Enter your College Roll Number. Once verified against your account email in the Student Directory, your account will switch to Student with your official name.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowClaimModal(true)}
            className="btn btn-primary text-xs font-bold whitespace-nowrap self-end sm:self-auto shadow-md shadow-sky-500/20"
          >
            Claim Student Pass <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <ClaimStudentPassModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
      />

      {statsError && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-2xl flex items-center shadow-sm">
          <AlertCircle className="h-6 w-6 mr-3 text-red-500" />
          <span className="font-medium">{statsError}</span>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
          Overview
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {[...Array(user?.role === "admin" ? 6 : 5)].map((_, i) => (
              <div
                key={i}
                className="skeleton h-[110px] sm:h-[120px] rounded-2xl border border-gray-100 dark:border-slate-800"
              />
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

      {isAuthorityRole && (
        <div className="mb-8">
          {isLoading && !telemetry ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="skeleton h-[280px] rounded-2xl border border-gray-100 dark:border-slate-800" />
              <div className="lg:col-span-2 skeleton h-[280px] rounded-2xl border border-gray-100 dark:border-slate-800" />
            </div>
          ) : telemetry ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-sky-500" />
                      <h3 className="text-xs font-bold uppercase text-gray-700 dark:text-slate-300 tracking-wider">
                        Live Campus Capacity Gauge
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 text-[10px] font-black uppercase">
                      Safe Limit: {telemetry.census.campusSafeCapacity}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                        {telemetry.census.currentCampusPopulation}
                      </span>
                      <span className="text-xs text-gray-400 font-semibold ml-2">
                        On Campus Right Now
                      </span>
                    </div>
                    <span className="text-base font-bold text-sky-600 dark:text-sky-400">
                      {telemetry.census.occupancyPercentage}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mt-3 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${telemetry.census.occupancyPercentage > 85
                          ? "bg-red-500"
                          : telemetry.census.occupancyPercentage > 60
                            ? "bg-amber-500"
                            : "bg-gradient-to-r from-sky-500 to-emerald-500"
                        }`}
                      style={{ width: `${Math.min(100, telemetry.census.occupancyPercentage)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-slate-800 text-center">
                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Students</span>
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {telemetry.census.insideStudents}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Visitors</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {telemetry.census.activeVisitorsCount}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800/60">
                    <span className="block text-[10px] uppercase font-bold text-gray-400">Outings</span>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {telemetry.census.outStudents}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-xs font-bold uppercase text-gray-700 dark:text-slate-300 tracking-wider">
                      Hourly Checkpoint Traffic (24-Hour Gate Telemetry)
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase">
                    <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                      <span className="w-2 h-2 rounded-full bg-purple-500" /> 🌙 Curfew / Night (22:00–06:00)
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> In
                    </span>
                    <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                      <span className="w-2 h-2 rounded-full bg-sky-500" /> Out
                    </span>
                  </div>
                </div>

                <div className="h-36 flex items-end justify-between gap-1 sm:gap-2 pt-8 px-1 sm:px-2 relative overflow-x-auto scrollbar-hide">
                  {telemetry.hourlyDistribution.map((item, idx) => {
                    const maxVal = Math.max(
                      ...telemetry.hourlyDistribution.map((d) => Math.max(d.entries, d.exits, 1))
                    );
                    const entryHeight = Math.max(10, (item.entries / maxVal) * 100);
                    const exitHeight = Math.max(10, (item.exits / maxVal) * 100);
                    const isNight =
                      item.hour.startsWith("22") ||
                      item.hour.startsWith("00") ||
                      item.hour.startsWith("02") ||
                      item.hour.startsWith("04");

                    return (
                      <div
                        key={idx}
                        className="flex-1 min-w-[28px] sm:min-w-[36px] flex flex-col items-center gap-1.5 group relative"
                      >

                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-slate-950 dark:bg-slate-900 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-xl shadow-2xl border border-slate-700 whitespace-nowrap z-30 pointer-events-none animate-springIn">
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400 font-bold uppercase">
                            {isNight && <span>🌙 Night</span>}
                            <span>{item.hour} Checkpoint</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {item.entries} In
                            </span>
                            <span className="text-sky-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> {item.exits} Out
                            </span>
                          </div>

                          <div className="w-2 h-2 bg-slate-950 dark:bg-slate-900 rotate-45 border-r border-b border-slate-700 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                        </div>

                        <div
                          className={`w-full flex items-end justify-center gap-1 h-24 relative rounded-t-lg px-0.5 ${isNight
                              ? "bg-purple-50/80 dark:bg-purple-950/40 border-t border-x border-purple-200/60 dark:border-transparent"
                              : "bg-slate-50/60 dark:bg-slate-800/20"
                            }`}
                        >

                          <div
                            className="w-1/2 bg-emerald-500 hover:bg-emerald-400 rounded-t-md transition-all relative flex items-start justify-center cursor-pointer group-hover:scale-105 shadow-sm"
                            style={{ height: `${entryHeight}%` }}
                          >
                            <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity -mt-4 bg-white/90 dark:bg-slate-900 px-1 py-0.5 rounded shadow-xs">
                              {item.entries}
                            </span>
                          </div>

                          <div
                            className="w-1/2 bg-sky-500 hover:bg-sky-400 rounded-t-md transition-all relative flex items-start justify-center cursor-pointer group-hover:scale-105 shadow-sm"
                            style={{ height: `${exitHeight}%` }}
                          >
                            <span className="text-[9px] font-black text-sky-800 dark:text-sky-200 opacity-0 group-hover:opacity-100 transition-opacity -mt-4 bg-white/90 dark:bg-slate-900 px-1 py-0.5 rounded shadow-xs">
                              {item.exits}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] sm:text-[10px] font-mono group-hover:text-gray-900 dark:group-hover:text-white font-bold truncate transition-colors ${isNight ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-slate-400"
                            }`}
                        >
                          {item.hour}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">
                  ⚡ 24-Hour gate sensors auto-correlated with barcode passes & late night curfew movements.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {telemetry && telemetry.overstayedVisits.length > 0 && isGuardOrAdmin && (
        <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border-2 border-red-500/40 shadow-lg space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                  Security Overstay Radar ({telemetry.overstayedVisits.length} Visitors Exceeding Pass Time)
                </h3>
                <p className="text-xs text-red-700/80 dark:text-red-300 font-medium">
                  Active visitors on campus exceeding scheduled duration without checkout.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {telemetry.overstayedVisits.map((v) => (
              <div
                key={v.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {v.visitorName || "Guest"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 text-[10px] font-bold">
                      +{v.overstayMinutes}m Overstay
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    Host: {v.hostName} • {v.purpose}
                  </p>
                </div>

                <button
                  onClick={() => handleDispatchEscort(v.id, v.visitorName)}
                  disabled={v.overstayNotified}
                  className={`btn btn-sm text-xs font-bold whitespace-nowrap shrink-0 ${v.overstayNotified ? "btn-secondary opacity-70" : "btn-danger"
                    }`}
                >
                  {v.overstayNotified ? (
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Escort Dispatched
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <PhoneCall className="w-3.5 h-3.5" /> Dispatch Escort
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isGuardOrAdmin || user?.role === "host") && (
        <div className="mb-8">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            {isLoading && activeVisitors.length === 0 ? (
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
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  No Active Visitors
                </h3>
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

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Recent Visits
          </h2>
          <button
            onClick={() => navigate("/app/logs")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-800/40 transition-all duration-200 active:scale-95"
          >
            View All
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          {isLoading && recentVisits.length === 0 ? (
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
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                No Visits Yet
              </h3>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 max-w-[200px]">
                There are no recently recorded visits to display.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {recentVisits.map((visit) => {
                const cfg = getStatusConfig(visit.status);
                const StatusIcon = cfg.icon;
                const visitorName = visit.visitor?.name ?? "Unknown";
                const initials = visitorName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={visit.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
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
