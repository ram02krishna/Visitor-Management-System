import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";

import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVisitStats } from "../hooks/useVisitStats";
import { StatsGrid } from "./StatsGrid";

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, loading, error: statsError, fetchStats } = useVisitStats(user);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleStatCardClick = useCallback((status: string) => {
    if (status === "total_users") {
      navigate("/app/users");
      return;
    }

    if (status) {
      navigate(`/app/logs?status=${status}`);
    }
  }, [navigate]);

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        () => {
          fetchStats();
          setLastRefresh(new Date());
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [user?.role, connectionTested, fetchStats]);

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
        {(connectionError || statsError) && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center animate-fadeIn">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{connectionError || statsError}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading stats...</div>
      ) : (
        <StatsGrid stats={stats} handleStatCardClick={handleStatCardClick} />
      )}
    </div>
  );
}
