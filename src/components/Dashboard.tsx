import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  Users,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { VisitDetailsModal } from "./VisitDetailsModal";
import { Visit } from "./VisitDetailsModal";
import { useNavigate } from "react-router-dom";

type StatItem = {
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

import { StatItem } from "./StatItem";

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StatItem[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [connectionTested, setConnectionTested] = useState(false);
  const [selectedVisits, setSelectedVisits] = useState<Visit[]>([]);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Use ref to track if subscription is active
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  const fetchStats = useCallback(async (role: string) => {
    console.log(`Fetching stats for role: ${role}`);
    try {
      const localToday = new Date();
      localToday.setHours(0, 0, 0, 0);

      const utcTodayStart = new Date(
        localToday.getTime() - localToday.getTimezoneOffset() * 60000
      ).toISOString();

      const localTomorrow = new Date(localToday);
      localTomorrow.setDate(localToday.getDate() + 1);
      const utcTomorrowStart = new Date(
        localTomorrow.getTime() - localTomorrow.getTimezoneOffset() * 60000
      ).toISOString();

      console.log("Date filters:", {
        localToday,
        utcTodayStart,
        utcTomorrowStart,
      });

      let statsData: StatItem[] = [];

      switch (role) {
        case "admin": {
          console.log("Fetching admin stats...");

          const { count: totalUsers, error: usersError } = await supabase
            .from("hosts")
            .select("*", { count: "exact", head: true });

          if (usersError) {
            console.error("Users count error:", usersError);
            throw usersError;
          }

          const [
            { count: approvedToday, error: approvedError },
            { count: newRequestsToday, error: newRequestsError },
            { count: completedToday, error: completedError },
            { count: cancelledAndDenied, error: cancelledError },
          ] = await Promise.all([
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.APPROVED)
              .gte("approved_at", utcTodayStart)
              .lt("approved_at", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.PENDING),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.COMPLETED)
              .gte("check_out_time", utcTodayStart)
              .lt("check_out_time", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED]),
          ]);

          const errors = [
            approvedError,
            newRequestsError,
            completedError,
            cancelledError,
          ].filter(Boolean);
          if (errors.length > 0) {
            console.error("Visit stats errors:", errors);
            throw errors[0];
          }

          console.log("Admin stats results:", {
            totalUsers,
            approvedToday,
            newRequestsToday,
            completedToday,
            cancelledAndDenied,
          });

          statsData = [
            {
              name: "Total Users",
              value: totalUsers ?? 0,
              icon: Users,
              color: "text-blue-500",
              bgColor: "bg-blue-50",
              status: "total_users",
            },
            {
              name: "Approved Visits",
              value: approvedToday ?? 0,
              icon: UserCheck,
              color: "text-green-500",
              bgColor: "bg-green-50",
              status: VISIT_STATUS.APPROVED,
            },
            {
              name: "New Visit Requests",
              value: newRequestsToday ?? 0,
              icon: AlertCircle,
              color: "text-yellow-500",
              bgColor: "bg-yellow-50",
              status: VISIT_STATUS.PENDING,
            },
            {
              name: "Completed Visits",
              value: completedToday ?? 0,
              icon: CheckCircle,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50",
              status: VISIT_STATUS.COMPLETED,
            },
            {
              name: "Cancelled/Denied Visits",
              value: cancelledAndDenied ?? 0,
              icon: XCircle,
              color: "text-red-500",
              bgColor: "bg-red-50",
              status: "cancelled_denied",
            },
          ];
          break;
        }

        case "guard": {
          console.log("Fetching guard stats...");

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
              .gte("approved_at", utcTodayStart)
              .lt("approved_at", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.PENDING),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("status", VISIT_STATUS.COMPLETED)
              .gte("check_out_time", utcTodayStart)
              .lt("check_out_time", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED]),
          ]);

          statsData = [
            {
              name: "Approved Visits",
              value: approvedToday ?? 0,
              icon: UserCheck,
              color: "text-green-500",
              bgColor: "bg-green-50",
              status: VISIT_STATUS.APPROVED,
            },
            {
              name: "New Visit Requests",
              value: newRequestsToday ?? 0,
              icon: AlertCircle,
              color: "text-yellow-500",
              bgColor: "bg-yellow-50",
              status: VISIT_STATUS.PENDING,
            },
            {
              name: "Completed Visits",
              value: completedToday ?? 0,
              icon: CheckCircle,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50",
              status: VISIT_STATUS.COMPLETED,
            },
            {
              name: "Cancelled/Denied Visits",
              value: cancelledAndDenied ?? 0,
              icon: XCircle,
              color: "text-red-500",
              bgColor: "bg-red-50",
              status: "cancelled_denied",
            },
          ];
          break;
        }

        case "resident":
        case "host": {
          const userId = user?.id;
          if (!userId) {
            console.error("No user ID available for resident");
            return;
          }

          console.log(`Fetching resident stats for user ID: ${userId}`);

          const [
            { count: approvedToday },
            { count: newRequestsToday },
            { count: completedToday },
            { count: cancelledAndDenied },
          ] = await Promise.all([
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("host_id", userId)
              .eq("status", VISIT_STATUS.APPROVED)
              .gte("approved_at", utcTodayStart)
              .lt("approved_at", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("host_id", userId)
              .eq("status", VISIT_STATUS.PENDING),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("host_id", userId)
              .eq("status", VISIT_STATUS.COMPLETED)
              .gte("check_out_time", utcTodayStart)
              .lt("check_out_time", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("host_id", userId)
              .in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED]),
          ]);

          statsData = [
            {
              name: "Approved Visits",
              value: approvedToday ?? 0,
              icon: UserCheck,
              color: "text-green-500",
              bgColor: "bg-green-50",
              status: VISIT_STATUS.APPROVED,
            },
            {
              name: "New Visit Requests",
              value: newRequestsToday ?? 0,
              icon: AlertCircle,
              color: "text-yellow-500",
              bgColor: "bg-yellow-50",
              status: VISIT_STATUS.PENDING,
            },
            {
              name: "Completed Visits",
              value: completedToday ?? 0,
              icon: CheckCircle,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50",
              status: VISIT_STATUS.COMPLETED,
            },
            {
              name: "Cancelled/Denied Visits",
              value: cancelledAndDenied ?? 0,
              icon: XCircle,
              color: "text-red-500",
              bgColor: "bg-red-50",
              status: "cancelled_denied",
            },
          ];
          break;
        }

        case "visitor": {
          const visitorId = user?.id;
          if (!visitorId) {
            console.error("No user ID available for visitor");
            return;
          }

          console.log(`Fetching visitor stats for visitor ID: ${visitorId}`);

          const [
            { count: approvedToday },
            { count: newRequestsToday },
            { count: completedToday },
            { count: cancelledAndDenied },
          ] = await Promise.all([
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("visitor_id", visitorId)
              .eq("status", VISIT_STATUS.APPROVED)
              .gte("approved_at", utcTodayStart)
              .lt("approved_at", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("visitor_id", visitorId)
              .eq("status", VISIT_STATUS.PENDING),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("visitor_id", visitorId)
              .eq("status", VISIT_STATUS.COMPLETED)
              .gte("check_out_time", utcTodayStart)
              .lt("check_out_time", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("visitor_id", visitorId)
              .in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED]),
          ]);

          statsData = [
            {
              name: "Approved Visits",
              value: approvedToday ?? 0,
              icon: UserCheck,
              color: "text-green-500",
              bgColor: "bg-green-50",
              status: VISIT_STATUS.APPROVED,
            },
            {
              name: "New Visit Requests",
              value: newRequestsToday ?? 0,
              icon: AlertCircle,
              color: "text-yellow-500",
              bgColor: "bg-yellow-50",
              status: VISIT_STATUS.PENDING,
            },
            {
              name: "Completed Visits",
              value: completedToday ?? 0,
              icon: CheckCircle,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50",
              status: VISIT_STATUS.COMPLETED,
            },
            {
              name: "Cancelled/Denied Visits",
              value: cancelledAndDenied ?? 0,
              icon: XCircle,
              color: "text-red-500",
              bgColor: "bg-red-50",
              status: "cancelled_denied",
            },
          ];
          break;
        }

        case "entity": {
          const userId = user?.id;
          if (!userId) {
            console.error("No user ID available for entity");
            return;
          }

          console.log(`Fetching entity stats for user ID: ${userId}`);

          const [
            { count: approvedToday },
            { count: newRequestsToday },
            { count: completedToday },
            { count: cancelledAndDenied },
          ] = await Promise.all([
            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("entity_id", userId)
              .eq("status", VISIT_STATUS.APPROVED)
              .gte("approved_at", utcTodayStart)
              .lt("approved_at", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("entity_id", userId)
              .eq("status", VISIT_STATUS.PENDING),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("entity_id", userId)
              .eq("status", VISIT_STATUS.COMPLETED)
              .gte("check_out_time", utcTodayStart)
              .lt("check_out_time", utcTomorrowStart),

            supabase
              .from("visits")
              .select("*", { count: "exact", head: true })
              .eq("entity_id", userId)
              .in("status", [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED]),
          ]);

          statsData = [
            {
              name: "Approved Visits",
              value: approvedToday ?? 0,
              icon: UserCheck,
              color: "text-green-500",
              bgColor: "bg-green-50",
              status: VISIT_STATUS.APPROVED,
            },
            {
              name: "New Visit Requests",
              value: newRequestsToday ?? 0,
              icon: AlertCircle,
              color: "text-yellow-500",
              bgColor: "bg-yellow-50",
              status: VISIT_STATUS.PENDING,
            },
            {
              name: "Completed Visits",
              value: completedToday ?? 0,
              icon: CheckCircle,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50",
              status: VISIT_STATUS.COMPLETED,
            },
            {
              name: "Cancelled/Denied Visits",
              value: cancelledAndDenied ?? 0,
              icon: XCircle,
              color: "text-red-500",
              bgColor: "bg-red-50",
              status: "cancelled_denied",
            },
          ];
          break;
        }

        default:
          console.warn("Unknown role:", role);
          statsData = [];
      }

      setStats(statsData);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      console.error("⚠️ Error fetching stats:", (err as Error).message);
      console.error("Error details:", err);

      try {
        console.log("Attempting fallback simple query...");
        const { data, error } = await supabase
          .from("visits")
          .select("id, status")
          .limit(5);

        console.log("Fallback query result:", data);
        console.log("Fallback query error:", error);
      } catch (fallbackErr) {
        console.error("Even fallback query failed:", fallbackErr);
      }
    }
  }, [user]);

  const handleStatCardClick = useCallback(async (status: string) => {
    if (status === "total_users") {
      navigate("/dashboard/users");
      return;
    }

    setSelectedStatus(status);
    setOffset(0);
    try {
      const isMultiStatus = status === "cancelled_denied";
      const statusFilter = isMultiStatus 
        ? [VISIT_STATUS.CANCELLED, VISIT_STATUS.DENIED]
        : [status];

      let countQuery = supabase
        .from("visits")
        .select("*", { count: "exact", head: true });

      if (isMultiStatus) {
        countQuery = countQuery.in("status", statusFilter);
      } else {
        countQuery = countQuery.eq("status", status);
      }

      if (user?.role === "host" || user?.role === "resident") {
        countQuery = countQuery.not("host_id", "is", null);
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalVisits(count || 0);

      let query = supabase
        .from("visits")
        .select(
          `
          *,
          visitors:visitor_id (name),
          hosts:host_id (name)
        `
        );

      if (isMultiStatus) {
        query = query.in("status", statusFilter);
      } else {
        query = query.eq("status", status);
      }

      if (user?.role === "host" || user?.role === "resident") {
        query = query.not("host_id", "is", null);
      }

      query = query
        .order("created_at", { ascending: false })
        .range(0, limit - 1);

      const { data, error } = await query;
      if (error) throw error;

      const transformedData =
        data?.map((visit) => ({
          ...visit,
          visitor_name: visit.visitors?.name || "Unknown Visitor",
          host_name: visit.hosts?.name || "Unknown Host",
          check_in_time: visit.check_in_time,
          scheduled_time: visit.scheduled_time,
        })) || [];

      setSelectedVisits(transformedData);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching visits:", error);
    }
  }, [limit, navigate, user?.role]);

  useEffect(() => {
    if (!user?.role) return;

    console.log("Current user role:", user.role);

    fetchStats(user.role);

    // Auto-refresh stats every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log("Auto-refreshing stats...");
      fetchStats(user.role);
    }, 30000);

    const testConnection = async () => {
      try {
        console.log("Testing Supabase connection...");
        const { data, error } = await supabase
          .from("visits")
          .select("id")
          .limit(1);

        if (error) {
          console.error("Supabase connection test failed:", error);
          setConnectionError(`Connection error: ${error.message}`);
        } else {
          console.log("Supabase connection successful, sample data:", data);
          setConnectionError(null);
        }
      } catch (err: unknown) {
        console.error("Supabase connection test exception:", err);
        setConnectionError(`Connection exception: ${(err as Error).message}`);
      } finally {
        setConnectionTested(true);
      }
    };

    if (!connectionTested) {
      testConnection();
    }

    // FIX: Only create subscription once
    if (!isSubscribedRef.current) {
      console.log("Creating realtime subscription for role:", user.role);
      
      const channel = supabase
        .channel("visits_realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "visits",
          },
          (payload) => {
            console.log("Realtime change detected:", payload);
            console.log("Event type:", payload.eventType);
            console.log("Current user role:", user.role);
            
            fetchStats(user.role);
          }
        )
        .subscribe((status) => {
          console.log("Realtime subscription status:", status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to realtime changes for role:', user.role);
            isSubscribedRef.current = true;
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Realtime subscription closed');
            isSubscribedRef.current = false;
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Realtime subscription error');
            isSubscribedRef.current = false;
          }
        });

      subscriptionRef.current = channel;
    }

    return () => {
      console.log("Cleaning up interval");
      clearInterval(refreshInterval);
      // Don't remove subscription in cleanup to prevent reconnection issues
    };
  }, [user?.role, connectionTested, fetchStats]);

  // Cleanup subscription only on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        console.log("Removing subscription on unmount");
        supabase.removeChannel(subscriptionRef.current);
        isSubscribedRef.current = false;
        subscriptionRef.current = null;
      }
    };
  }, []);

  const handleStatusChange = () => {
    fetchStats(user?.role || "");
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
          Welcome back, {user?.name || "Guest"}
        </h1>
        <p className="mt-2 text-md text-gray-600 dark:text-slate-300">
          Here's what's happening in your campus today
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refreshes every 30s
        </p>
        {connectionError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center animate-fadeIn">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Connection issue detected: {connectionError}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.name} style={{animationDelay: `${index * 0.1}s`}}>
            <StatItem {...stat} onClick={handleStatCardClick} />
          </div>
        ))}
      </div>

      <VisitDetailsModal
        status={selectedStatus}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userRole={user?.role}
        userId={user?.id}
        visits={selectedVisits}
        onStatusChange={handleStatusChange}
        limit={limit}
        offset={offset}
        setOffset={setOffset}
        totalVisits={totalVisits}
      />
    </div>
  );
}
