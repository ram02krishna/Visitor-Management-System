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

type VisitorStats = {
  total_visits: number;
  pending_visits: number;
  approved_visits: number;
  completed_visits: number;
  denied_visits: number;
  cancelled_visits: number;
  unique_visitors: number;
};

type HostVisitorStats = Omit<VisitorStats, 'unique_visitors'>;

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
      const p_start_date = new Date(localToday.getTime() - localToday.getTimezoneOffset() * 60000).toISOString();
      
      const localTomorrow = new Date(localToday);
      localTomorrow.setDate(localToday.getDate() + 1);
      const p_end_date = new Date(localTomorrow.getTime() - localTomorrow.getTimezoneOffset() * 60000).toISOString();

      let statsData: StatItem[] = [];
      const role = user.role;

      switch (role) {
        case "admin": {
          const { count: totalUsers, error: usersError } = await supabase
            .from("hosts")
            .select("*", { count: "exact", head: true });

          if (usersError) throw usersError;

          const { data: adminStats, error: adminStatsError } = await supabase
            .rpc('get_visitor_stats', { p_start_date, p_end_date })
            .single<VisitorStats>();
            
          if (adminStatsError) throw adminStatsError;

          if(adminStats) {
            statsData = [
              { name: "Total Users", value: totalUsers ?? 0, icon: Users, color: "text-blue-500", bgColor: "bg-blue-50", status: "total_users" },
              { name: "Approved Visits Today", value: adminStats.approved_visits ?? 0, icon: UserCheck, color: "text-green-500", bgColor: "bg-green-50", status: VISIT_STATUS.APPROVED },
              { name: "New Visit Requests", value: adminStats.pending_visits ?? 0, icon: AlertCircle, color: "text-yellow-500", bgColor: "bg-yellow-50", status: VISIT_STATUS.PENDING },
              { name: "Completed Visits Today", value: adminStats.completed_visits ?? 0, icon: CheckCircle, color: "text-indigo-500", bgColor: "bg-indigo-50", status: VISIT_STATUS.COMPLETED },
              { name: "Cancelled Visits", value: adminStats.cancelled_visits ?? 0, icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", status: VISIT_STATUS.CANCELLED },
              { name: "Denied Visits", value: adminStats.denied_visits ?? 0, icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", status: VISIT_STATUS.DENIED },
            ];
          }
          break;
        }
        case "guard": {
          const { data: guardStats, error: guardStatsError } = await supabase
            .rpc('get_visitor_stats', { p_start_date, p_end_date })
            .single<VisitorStats>();

          if (guardStatsError) throw guardStatsError;

          if (guardStats) {
            statsData = [
              { name: "Approved Visits Today", value: guardStats.approved_visits ?? 0, icon: UserCheck, color: "text-green-500", bgColor: "bg-green-50", status: VISIT_STATUS.APPROVED },
              { name: "New Visit Requests", value: guardStats.pending_visits ?? 0, icon: AlertCircle, color: "text-yellow-500", bgColor: "bg-yellow-50", status: VISIT_STATUS.PENDING },
              { name: "Completed Visits Today", value: guardStats.completed_visits ?? 0, icon: CheckCircle, color: "text-indigo-500", bgColor: "bg-indigo-50", status: VISIT_STATUS.COMPLETED },
              { name: "Cancelled Visits", value: guardStats.cancelled_visits ?? 0, icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", status: VISIT_STATUS.CANCELLED },
              { name: "Denied Visits", value: guardStats.denied_visits ?? 0, icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", status: VISIT_STATUS.DENIED },
            ];
          }
          break;
        }
        case "host": {
          const { data: hostStats, error: hostStatsError } = await supabase
            .rpc('get_host_visitor_stats', { p_host_id: user.id, p_start_date, p_end_date })
            .single<HostVisitorStats>();

          if (hostStatsError) throw hostStatsError;
          
          if(hostStats) {
            statsData = [
              { name: "Approved Visits Today", value: hostStats.approved_visits ?? 0, icon: UserCheck, color: "text-green-500", bgColor: "bg-green-50", status: VISIT_STATUS.APPROVED },
              { name: "New Visit Requests", value: hostStats.pending_visits ?? 0, icon: AlertCircle, color: "text-yellow-500", bgColor: "bg-yellow-50", status: VISIT_STATUS.PENDING },
              { name: "Completed Visits Today", value: hostStats.completed_visits ?? 0, icon: CheckCircle, color: "text-indigo-500", bgColor: "bg-indigo-50", status: VISIT_STATUS.COMPLETED },
              { name: "Cancelled Visits", value: hostStats.cancelled_visits ?? 0, icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", status: VISIT_STATUS.CANCELLED },
              { name: "Denied Visits", value: hostStats.denied_visits ?? 0, icon: XCircle, color: "text-red-500", bgColor: "bg-red-50", status: VISIT_STATUS.DENIED },
            ];
          }
          break;
        }
        default:
          statsData = [];
      }

      setStats(statsData);
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

