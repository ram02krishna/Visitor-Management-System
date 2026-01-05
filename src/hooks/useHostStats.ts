import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User } from "../store/auth";

export const useHostStats = (user: User | null) => {
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    upcomingVisits: 0,
    onsiteVisits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user || user.role !== "host") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc("get_host_dashboard_stats", {
        host_id_param: user.id,
      });

      if (error) {
        throw new Error(error.message);
      }
      
      setStats(data);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, fetchStats };
};
