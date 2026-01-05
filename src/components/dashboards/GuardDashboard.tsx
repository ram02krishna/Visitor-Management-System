import { useAuthStore } from "../../store/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, User, Clock, Check, AlertCircle } from "lucide-react";
import { useGuardStats } from "../../hooks/useGuardStats";
import { StatItem } from "../StatItem";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Visit } from "../VisitDetailsModal";

export function GuardDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { stats, loading, error, fetchStats } = useGuardStats(user);
  const [expectedVisits, setExpectedVisits] = useState<Visit[]>([]);

  useEffect(() => {
    const fetchExpectedVisits = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("visits")
        .select("*, visitors:visitor_id(name), hosts:host_id(name)")
        .eq("status", "approved")
        .gte("check_in_time", `${today}T00:00:00.000Z`)
        .lte("check_in_time", `${today}T23:59:59.999Z`);

      if (error) {
        console.error("Error fetching expected visits:", error);
      } else {
        setExpectedVisits(data as unknown as Visit[]);
      }
    };

    fetchExpectedVisits();

    const channel = supabase
      .channel("guard-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        fetchStats();
        fetchExpectedVisits();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  const guardStats = [
    {
      name: "Check-ins Today",
      value: stats.checkInsToday,
      icon: Check,
      color: "green",
    },
    {
      name: "Pending Visits",
      value: stats.pendingVisits,
      icon: Clock,
      color: "yellow",
      status: "pending",
    },
    {
      name: "On-site Now",
      value: stats.onsiteVisits,
      icon: User,
      color: "indigo",
      status: "checked-in",
    },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
          Welcome, {user?.name || "Guest"}
        </h1>
        <p className="mt-2 text-md text-gray-600 dark:text-slate-300">
          Ready to manage visitor entries.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-4">
        <Button onClick={() => navigate("/app/register-visitor")}>
          <User className="mr-2 h-4 w-4" />
          Register Visitor
        </Button>
        <Button onClick={() => navigate("/app/scan")}>
          <Camera className="mr-2 h-4 w-4" />
          Scan QR Code
        </Button>
      </div>

      {loading && <div className="text-center">Loading stats...</div>}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center animate-fadeIn">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {guardStats.map((stat, index) => (
            <StatItem
              key={stat.name}
              {...stat}
              onClick={() => {
                /* Implement navigation to filtered list if needed */
              }}
              style={{ animationDelay: `${index * 0.1}s` }}
            />
          ))}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">Expected Today</h2>
        {expectedVisits.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expectedVisits.map((visit) => (
              <div key={visit.id} className="glass rounded-lg p-4">
                <p className="font-bold">{visit.visitors?.name || "N/A"}</p>
                <p>Host: {visit.hosts?.name || "N/A"}</p>
                <p>Expected at: {visit.check_in_time ? new Date(visit.check_in_time).toLocaleTimeString() : "N/A"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No visitors expected today.</p>
        )}
      </div>
    </div>
  );
}
