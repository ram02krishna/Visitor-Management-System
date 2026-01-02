import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { User } from '../store/auth';

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

export const useVisitStats = (user: User | null) => {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user?.role) return;

    setLoading(true);
    setError(null);

    try {
      const localToday = new Date();
      localToday.setHours(0, 0, 0, 0);
      const utcTodayStart = new Date(localToday.getTime() - localToday.getTimezoneOffset() * 60000).toISOString();
      const localTomorrow = new Date(localToday);
      localTomorrow.setDate(localToday.getDate() + 1);
      const utcTomorrowStart = new Date(localTomorrow.getTime() - localTomorrow.getTimezoneOffset() * 60000).toISOString();

      let statsData: StatItem[] = [];
      const role = user.role;

      switch (role) {
        case "admin": {
          const { count: totalUsers, error: usersError } = await supabase
            .from("hosts")
            .select("*", { count: "exact", head: true });

          if (usersError) throw usersError;

          const [{ count: approvedToday }, { count: newRequestsToday }, { count: completedToday }, { count: cancelledAndDenied }] = await Promise.all([
            supabase.from("visits").select("*", { count: "exact", head: true }).eq("status", VISIT_STATUS.APPROVED).gte("approved_at", utcTodayStart).lt("approved_at", utcTomorrowStart),
            supabase.from("visits").select("*", { count: "exact", head: true }).eq("status", VISIT_STATUS.PENDING),
            supabase.from("visits").select("*", { count: "exact", head: true }).eq("status", VISIT_STATUS.COMPLETED).gte("check_out_time", utcTodayStart).lt("check_out_time", utcTomorrowStart),
            supabase.from("visits").select("*", { count: "exact", head: true }).in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED]),
          ]);

          statsData = [
            { name: "Total Users", value: totalUsers ?? 0, icon: Users, color: "text-blue-500", bgColor: "bg-blue-50", status: "total_users" },
            { name: "Approved Visits", value: approvedToday ?? 0, icon: UserCheck, color: "text-green-500", bgColor: "bg-green-50", status: VISIT_STATUS.APPROVED },
            { name: "New Visit Requests", value: newRequestsToday ?? 0, icon: AlertCircle, color: "text-yellow-500", bgColor: "bg-yellow-50", status: VISIT_STATUS.PENDING },
            { name: "Completed Visits", value: completedToday ?? 0, icon: CheckCircle, color: "text-indigo-500", bgColor: "bg-indigo-50", status: VISIT_STATUS.COMPLETED },
            { name: "Cancelled/Denied Visits", value: cancelledAndDenied ?? 0, icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", status: "cancelled_denied" },
          ];
          break;
        }
        case "guard":
        case "host": {
          const commonQueries = [
            supabase.from("visits").select("*", { count: "exact", head: true }).eq("status", VISIT_STATUS.APPROVED).gte("approved_at", utcTodayStart).lt("approved_at", utcTomorrowStart),
            supabase.from("visits").select("*", { count: "exact", head: true }).eq("status", VISIT_STATUS.PENDING),
            supabase.from("visits").select("*", { count: "exact", head: true }).eq("status", VISIT_STATUS.COMPLETED).gte("check_out_time", utcTodayStart).lt("check_out_time", utcTomorrowStart),
            supabase.from("visits").select("*", { count: "exact", head: true }).in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED]),
          ];

          const roleFilter = (q: any) => {
            if (role === 'host') return q.eq('host_id', user.id);
            return q;
          }
          
          const [{ count: approvedToday }, { count: newRequestsToday }, { count: completedToday }, { count: cancelledAndDenied }] = await Promise.all(commonQueries.map(roleFilter));

          statsData = [
            { name: "Approved Visits", value: approvedToday ?? 0, icon: UserCheck, color: "text-green-500", bgColor: "bg-green-50", status: VISIT_STATUS.APPROVED },
            { name: "New Visit Requests", value: newRequestsToday ?? 0, icon: AlertCircle, color: "text-yellow-500", bgColor: "bg-yellow-50", status: VISIT_STATUS.PENDING },
            { name: "Completed Visits", value: completedToday ?? 0, icon: CheckCircle, color: "text-indigo-500", bgColor: "bg-indigo-50", status: VISIT_STATUS.COMPLETED },
            { name: "Cancelled/Denied Visits", value: cancelledAndDenied ?? 0, icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", status: "cancelled_denied" },
          ];
          break;
        }
        default:
          statsData = [];
      }

      setStats(statsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { stats, loading, error, fetchStats };
};
