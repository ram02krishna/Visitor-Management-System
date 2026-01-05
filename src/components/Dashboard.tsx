import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";

import { VisitDetailsModal, Visit } from "./VisitDetailsModal";
import { useNavigate } from "react-router-dom";
import { useVisitStats } from "../hooks/useVisitStats";
import { StatsGrid } from "./StatsGrid";
import { StatusIndicator } from "./StatusIndicator";

const VISIT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DENIED: "denied",
};


export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, loading, error: statsError, fetchStats } = useVisitStats(user);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [connectionTested, setConnectionTested] = useState(false);
  const [selectedVisits, setSelectedVisits] = useState<Visit[]>([]);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleStatCardClick = useCallback(
    async (status: string) => {
      if (status === "total_users") {
        navigate("/users");
        return;
      }

      setSelectedStatus(status);
      setOffset(0);
      try {
        const { data, error } = await supabase.rpc('get_visits_by_status', {
          p_status: status,
          p_user_role: user?.role || 'guest',
          p_page_limit: limit,
          p_page_offset: 0,
        });

        if (error) throw error;

        const result = data[0];
        setTotalVisits(result.total_count || 0);
        setSelectedVisits((result.visits || []) as Visit[]);
        setIsModalOpen(true);
      } catch (error) {
        console.error("Error fetching visits:", error);
      }
    },
    [limit, navigate, user?.role]
  );

  useEffect(() => {
    if (!user?.role) return;

    fetchStats();
    setLastRefresh(new Date());

    const refreshInterval = setInterval(() => {
      fetchStats();
      setLastRefresh(new Date());
    }, 30000);

    const testConnection = async () => {
      try {
        const { error } = await supabase.from("visits").select("id").limit(1);
        if (error) setConnectionError(`Connection error: ${error.message}`);
        else setConnectionError(null);
      } catch (err: unknown) {
        let errorMessage = "An unknown error occurred.";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        }
        setConnectionError(`Connection exception: ${errorMessage}`);
      } finally {
        setConnectionTested(true);
      }
    };

    if (!connectionTested) {
      testConnection();
    }

    const channel = supabase
      .channel("visits_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        fetchStats();
        setLastRefresh(new Date());
      })
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [user?.role, connectionTested, fetchStats]);

  const handleStatusChange = () => {
    fetchStats();
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
        <StatusIndicator isLoading={false} error={connectionError || statsError} className="mt-4" />
      </div>

      <StatusIndicator isLoading={loading} error={null} loadingMessage="Loading stats..." />

      {!loading && (
        <StatsGrid stats={stats} handleStatCardClick={handleStatCardClick} />
      )}

      <VisitDetailsModal
        status={selectedStatus}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userRole={user?.role}
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
