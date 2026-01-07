import { useAuthStore } from "../../store/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clipboard, User, Clock, Check, AlertCircle } from "lucide-react";
import { useHostStats } from "../../hooks/useHostStats";
import { StatItem } from "../StatItem";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Visit } from "../VisitDetailsModal";

export function HostDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { stats, loading, error, fetchStats } = useHostStats(user);
  const [ongoingVisits, setOngoingVisits] = useState<Visit[]>([]);

  useEffect(() => {
    const fetchOngoingVisits = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("visits")
        .select("*, visitors:visitor_id(name)")
        .eq("host_id", user.id)
        .eq("status", "checked-in");
      if (error) {
        console.error("Error fetching ongoing visits for host:", error);
      } else {
        setOngoingVisits(data as unknown as Visit[]);
      }
    };

    fetchOngoingVisits();

    const channel = supabase
      .channel("host-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits", filter: `host_id=eq.${user?.id}` },
        () => {
          fetchStats();
          fetchOngoingVisits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchStats]);

  const hostStats = [
    {
      name: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Clock,
      color: "yellow",
      status: "pending",
    },
    {
      name: "Upcoming Visits",
      value: stats.upcomingVisits,
      icon: Check,
      color: "green",
      status: "approved",
    },
    {
      name: "Ongoing Visits",
      value: ongoingVisits.length,
      icon: Clock,
      color: "blue",
      status: "checked-in",
    },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="mb-8 animate-fadeInUp">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
          Welcome back, {user?.name || "Guest"}
        </h1>
        <p className="mt-2 text-md text-gray-600 dark:text-slate-300">
          Here's what's happening with your visitors today
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-4">
        <Button variant="outline" onClick={() => navigate("/app/pre-register-visitor")}>
          <Clipboard className="mr-2 h-4 w-4" />
          Pre-register Visitor
        </Button>
        <Button variant="outline" onClick={() => navigate("/app/visitor-approval")}>
          <User className="mr-2 h-4 w-4" />
          Approve Visitors
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
          {hostStats.map((stat, index) => (
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
        <h2 className="text-2xl font-bold mb-4">Your Visitors On-site</h2>
        {ongoingVisits.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ongoingVisits.map((visit) => (
              <div key={visit.id} className="glass rounded-lg p-4">
                <p className="font-bold">{visit.visitors?.name || "N/A"}</p>
                <p>Purpose: {visit.purpose || "N/A"}</p>
                <p>Checked-in at: {visit.check_in_time ? new Date(visit.check_in_time).toLocaleTimeString() : "N/A"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>You have no visitors currently on-site.</p>
        )}
      </div>
    </div>
  );
}
