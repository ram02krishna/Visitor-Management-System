import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { UsersRound, CalendarCheck2, Hourglass, Trophy, ShieldX, Activity } from "lucide-react";
import { User } from "../store/auth";
import { getISTTodayRange } from "../lib/dateIST";
import { readCache as readCacheUtil, writeCache as writeCacheUtil, getCacheTTL } from "../lib/cache";
import { getSafeVisitorIds } from "../lib/visitorIds";

export type StatItem = {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  status?: string;
};

const VISIT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DENIED: "denied",
};

// Icons are functions and can't be JSON-stringified, so we store a key instead.
const ICON_MAP: Record<string, React.ElementType> = {
  UsersRound,
  CalendarCheck2,
  Hourglass,
  Trophy,
  ShieldX,
  Activity,
};
const ICON_KEY_MAP = new Map<React.ElementType, string>(
  Object.entries(ICON_MAP).map(([k, v]) => [v, k])
);

type SerializedStat = Omit<StatItem, "icon"> & { iconKey: string };

function serializeStats(stats: StatItem[]): SerializedStat[] {
  return stats.map(({ icon, ...rest }) => ({
    ...rest,
    iconKey: ICON_KEY_MAP.get(icon) ?? "Hourglass",
  }));
}

function deserializeStats(raw: SerializedStat[]): StatItem[] {
  return raw.map(({ iconKey, ...rest }) => ({
    ...rest,
    icon: ICON_MAP[iconKey] ?? Hourglass,
  }));
}

const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheKey(role: string) {
  return `vms_stats_cache_${role}`;
}

function readCache(role: string): StatItem[] | null {
  const raw = readCacheUtil<SerializedStat[]>(cacheKey(role), STATS_CACHE_TTL);
  if (!raw) return null;
  return deserializeStats(raw);
}

function writeCache(role: string, stats: StatItem[]) {
  writeCacheUtil(cacheKey(role), serializeStats(stats));
}

export const useVisitStats = (user: User | null) => {
  const [stats, setStats] = useState<StatItem[]>(() => {
    if (!user?.role) return [];
    return readCache(user.role) ?? [];
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!user?.role) return true;
    return readCache(user.role) === null;
  });

  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (force = false) => {
    if (!user?.role) return;

    // ── Cache short-circuit ──────────────────────────────────────────────────
    // If the cache is still valid and we're not forcing a refresh,
    // skip all 7 Supabase queries entirely. The stale data is already in state.
    if (!force) {
      const remainingTTL = getCacheTTL(cacheKey(user.role), STATS_CACHE_TTL);
      if (remainingTTL > 0) {
        // Cache is fresh — nothing to do
        setLoading(false);
        return;
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const cached = readCache(user.role);
    if (!cached) setLoading(true);
    setError(null);

    try {
      let statsData: StatItem[] = [];
      const role = user.role;
      const [todayStart, todayEnd] = getISTTodayRange();

      // ── Pre-fetch visitor profile IDs once (shared memoized helper) ──────
      // Uses the in-memory cache from visitorIds.ts — no extra DB call if
      // another component already fetched this on the same page load.
      let visitorProfileIds: string[] = [];
      if (role === "visitor" && user?.email) {
        visitorProfileIds = await getSafeVisitorIds(user.email);
      }

      // Returns a query scoped to the current user's role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withRoleFilter = (q: any) => {
        if (role === "host") return q.eq("host_id", user.id);
        if (role === "visitor") return q.in("visitor_id", visitorProfileIds);
        return q;
      };

      // Base count builder
      const countQuery = (status: string) =>
        withRoleFilter(
          supabase.from("visits").select("*", { count: "exact", head: true }).eq("status", status)
        );

      // ── 7 parallel count queries ─────────────────────────────────────────
      const [
        { count: ongoingCount },
        { count: approvedToday },
        { count: pendingCount },
        { count: completedToday },
        { count: cancelledCount },
        { count: deniedCount },
        usersResult,
      ] = await Promise.all([
        countQuery("checked-in"),
        withRoleFilter(
          supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("status", VISIT_STATUS.APPROVED)
            .gte("approved_at", todayStart)
            .lt("approved_at", todayEnd)
        ),
        withRoleFilter(
          supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("status", VISIT_STATUS.PENDING)
            .gte("created_at", todayStart)
            .lt("created_at", todayEnd)
        ),
        withRoleFilter(
          supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("status", VISIT_STATUS.COMPLETED)
            .gte("check_out_time", todayStart)
            .lt("check_out_time", todayEnd)
        ),
        withRoleFilter(
          supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("status", VISIT_STATUS.CANCELLED)
            .gte("updated_at", todayStart)
            .lt("updated_at", todayEnd)
        ),
        withRoleFilter(
          supabase
            .from("visits")
            .select("*", { count: "exact", head: true })
            .eq("status", VISIT_STATUS.DENIED)
            .gte("updated_at", todayStart)
            .lt("updated_at", todayEnd)
        ),
        // Fetch total user count in parallel only for admin
        role === "admin"
          ? supabase.from("hosts").select("*", { count: "exact", head: true })
          : Promise.resolve({ count: null }),
      ]);

      const totalUsers = usersResult.count ?? 0;

      // ── Assemble Stats Array ─────────────────────────────────────────────
      statsData = [
        {
          name: "Ongoing Visits",
          value: ongoingCount ?? 0,
          icon: Activity,
          color: "text-teal-500",
          bgColor: "bg-teal-50",
          status: "checked-in",
        },
        {
          name: "Approved Visits",
          value: approvedToday ?? 0,
          icon: CalendarCheck2,
          color: "text-green-500",
          bgColor: "bg-green-50",
          status: VISIT_STATUS.APPROVED,
        },
        {
          name: "Pending Approvals",
          value: pendingCount ?? 0,
          icon: Hourglass,
          color: "text-yellow-500",
          bgColor: "bg-yellow-50",
          status: VISIT_STATUS.PENDING,
        },
        {
          name: "Completed Visits",
          value: completedToday ?? 0,
          icon: Trophy,
          color: "text-indigo-500",
          bgColor: "bg-indigo-50",
          status: VISIT_STATUS.COMPLETED,
        },
        {
          name: "Cancelled/Denied",
          value: (cancelledCount ?? 0) + (deniedCount ?? 0),
          icon: ShieldX,
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
      writeCache(role, statsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch statistics.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { stats, loading, error, fetchStats };
};
