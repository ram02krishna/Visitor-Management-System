import { useState, useCallback } from "react";

import { UsersRound, CalendarCheck2, Clock3, CheckCheck, ShieldAlert, Activity } from "lucide-react";
import { User } from "../store/auth";
import { getISTTodayRange } from "../lib/dateIST";
import {
  readCache as readCacheUtil,
  writeCache as writeCacheUtil,
  getCacheTTL,
} from "../lib/cache";
import { api } from "../lib/api";
import { useDataSync } from "../lib/dataSync";

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
const ICON_MAP: Record<string, React.ElementType> = {
  UsersRound,
  CalendarCheck2,
  Clock3,
  CheckCheck,
  ShieldAlert,
  Activity,
};
const ICON_KEY_MAP = new Map<React.ElementType, string>(
  Object.entries(ICON_MAP).map(([k, v]) => [v, k])
);

type SerializedStat = Omit<StatItem, "icon"> & { iconKey: string };

function serializeStats(stats: StatItem[]): SerializedStat[] {
  return stats.map(({ icon, ...rest }) => ({
    ...rest,
    iconKey: ICON_KEY_MAP.get(icon) ?? "Clock3",
  }));
}

function deserializeStats(raw: SerializedStat[]): StatItem[] {
  return raw.map(({ iconKey, ...rest }) => ({
    ...rest,
    icon: ICON_MAP[iconKey] ?? Clock3,
  }));
}


const STATS_CACHE_TTL = 5 * 1000;

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


  const fetchStats = useCallback(
    async (force = false) => {
      if (!user?.role) return;
      if (!force) {
        const remainingTTL = getCacheTTL(cacheKey(user.role), STATS_CACHE_TTL);
        if (remainingTTL > 0) {
          setLoading(false);
          return;
        }
      }

      const cached = readCache(user.role);
      if (!cached) setLoading(true);
      setError(null);

      try {
        let statsData: StatItem[] = [];
        const role = user.role;
        const [todayStart, todayEnd] = getISTTodayRange();
        const start = new Date(todayStart).getTime();
        const end = new Date(todayEnd).getTime();

        const [allVisits, hosts] = await Promise.all([
          api.visits.list({
            ...(role === "host" ? { host_id: user.id } : {}),
            ...(force ? { _t: Date.now() } : {})
          }),
          role === "admin" ? api.hosts.list().catch(() => []) : Promise.resolve([])
        ]);

        let ongoingCount = 0;
        let approvedToday = 0;
        let pendingCount = 0;
        let completedToday = 0;
        let cancelledCount = 0;
        let deniedCount = 0;

        allVisits.forEach(v => {
          if (v.status === "checked_in") ongoingCount++;

          if (v.status === VISIT_STATUS.APPROVED && (v as { approved_at?: string }).approved_at) {
            const t = new Date((v as { approved_at?: string }).approved_at!).getTime();
            if (t >= start && t < end) approvedToday++;
          }

          if (v.status === VISIT_STATUS.PENDING) {
            pendingCount++;
          }

          if (v.status === VISIT_STATUS.COMPLETED && v.check_out_time) {
            const t = new Date(v.check_out_time).getTime();
            if (t >= start && t < end) completedToday++;
          }

          if (v.status === VISIT_STATUS.CANCELLED && v.updated_at) {
            const t = new Date(v.updated_at).getTime();
            if (t >= start && t < end) cancelledCount++;
          }

          if (v.status === VISIT_STATUS.DENIED && v.updated_at) {
            const t = new Date(v.updated_at).getTime();
            if (t >= start && t < end) deniedCount++;
          }
        });

        const totalUsers = hosts?.length || 0;

        statsData = [
          {
            name: "Ongoing Visits",
            value: ongoingCount ?? 0,
            icon: Activity,
            color: "text-teal-500",
            bgColor: "bg-teal-50",
            status: "checked_in",
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
            icon: Clock3,
            color: "text-yellow-500",
            bgColor: "bg-yellow-50",
            status: VISIT_STATUS.PENDING,
          },
          {
            name: "Completed Visits",
            value: completedToday ?? 0,
            icon: CheckCheck,
            color: "text-indigo-500",
            bgColor: "bg-indigo-50",
            status: VISIT_STATUS.COMPLETED,
          },
          {
            name: "Cancelled/Denied",
            value: (cancelledCount ?? 0) + (deniedCount ?? 0),
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
        writeCache(role, statsData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to fetch statistics.");
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useDataSync(["stats", "visits", "all"], () => {
    fetchStats(true);
  });

  return { stats, loading, error, fetchStats };
};

