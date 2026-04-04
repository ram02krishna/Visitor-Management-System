import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { UsersRound, CalendarCheck2, Hourglass, Trophy, ShieldX } from "lucide-react";
import { User } from "../store/auth";
import { getISTTodayRange } from "../lib/dateIST";

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

function cacheKey(role: string) {
  return `vms_stats_cache_${role}`;
}

function readCache(role: string): StatItem[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(role));
    if (!raw) return null;
    const parsed: SerializedStat[] = JSON.parse(raw);
    return deserializeStats(parsed);
  } catch {
    return null;
  }
}

function writeCache(role: string, stats: StatItem[]) {
  try {
    localStorage.setItem(cacheKey(role), JSON.stringify(serializeStats(stats)));
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export const useVisitStats = (user: User | null) => {

  const [stats, setStats] = useState<StatItem[]>(() => {
    if (!user?.role) return [];
    return readCache(user.role) ?? [];
  });

  // loading=true only when there is NO cached data yet (first-ever load)
  const [loading, setLoading] = useState<boolean>(() => {
    if (!user?.role) return true;
    return readCache(user.role) === null;
  });

  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.role) return;

    // ── Stale-while-revalidate ───────────────────────────────────────────
    // If we already have cached data show it instantly (loading stays false).
    // Only set loading=true when there is truly nothing to show.
    const cached = readCache(user.role);
    if (!cached) setLoading(true);
    setError(null);

    try {
      let statsData: StatItem[] = [];
      const role = user.role;
      const [todayStart, todayEnd] = getISTTodayRange();

      switch (role) {
        case "admin": {
          const { count: totalUsers, error: usersError } = await supabase
            .from("hosts")
            .select("*", { count: "exact", head: true });

          if (usersError) throw usersError;

          const [
            { count: approvedToday },
            { count: newRequestsToday },
            { count: completedToday },
            { count: cancelledAndDenied },
          ] = await Promise.all([
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.APPROVED)
              .gte("approved_at", todayStart)
              .lt("approved_at", todayEnd),
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.PENDING)
              .gte("created_at", todayStart)
              .lt("created_at", todayEnd),
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.COMPLETED)
              .gte("check_out_time", todayStart)
              .lt("check_out_time", todayEnd),
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED])
              .gte("created_at", todayStart)
              .lt("created_at", todayEnd),
          ]);

          statsData = [
            {
              name: "Total Users",
              value: totalUsers ?? 0,
              icon: UsersRound,
              color: "text-blue-500",
              bgColor: "bg-blue-50",
              status: "total_users",
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
              value: newRequestsToday ?? 0,
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
              name: "Cancelled/Denied Visits",
              value: cancelledAndDenied ?? 0,
              icon: ShieldX,
              color: "text-red-500",
              bgColor: "bg-red-50",
              status: "cancelled_denied",
            },
          ];
          break;
        }
        case "guard":
        case "host": {
          const commonQueries = [
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.APPROVED)
              .gte("approved_at", todayStart)
              .lt("approved_at", todayEnd),
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.PENDING)
              .gte("created_at", todayStart)
              .lt("created_at", todayEnd),
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.COMPLETED)
              .gte("check_out_time", todayStart)
              .lt("check_out_time", todayEnd),
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED])
              .gte("created_at", todayStart)
              .lt("created_at", todayEnd),
          ];

          const roleFilter = (q: any) => {
            if (role === "host") return q.eq("host_id", user.id);
            return q;
          };

          const [
            { count: approvedToday },
            { count: newRequestsToday },
            { count: completedToday },
            { count: cancelledAndDenied },
          ] = await Promise.all(commonQueries.map(roleFilter));

          statsData = [
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
              value: newRequestsToday ?? 0,
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
              name: "Cancelled/Denied Visits",
              value: cancelledAndDenied ?? 0,
              icon: ShieldX,
              color: "text-red-500",
              bgColor: "bg-red-50",
              status: "cancelled_denied",
            },
          ];
          break;
        }
        default:
          statsData = [];
      }

      // Update UI + persist to cache
      setStats(statsData);
      writeCache(role, statsData);
    } catch (err: unknown) {
      let errorMessage = "An unknown error occurred while fetching stats.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { stats, loading, error, fetchStats };
};
