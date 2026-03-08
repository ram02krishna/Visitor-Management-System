import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Clock, TrendingUp, ArrowRight } from "lucide-react";
import React from "react";
import { useAuthStore } from "../store/auth";

interface OngoingVisitsCardProps {
  className?: string;
  style?: React.CSSProperties;
  onClick: (status: string) => void;
}

export function OngoingVisitsCard({ className, style, onClick }: OngoingVisitsCardProps) {
  const { user } = useAuthStore();
  const [ongoingVisitsCount, setOngoingVisitsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOngoingVisitsCount = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("visits")
      .select("*", { count: "exact", head: true })
      .eq("status", "checked-in");
    
    if (user?.role === "host") {
      query = query.eq("host_id", user.id);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Error fetching ongoing visits count:", error);
    } else {
      setOngoingVisitsCount(count || 0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOngoingVisitsCount(); // eslint-disable-line react-hooks/set-state-in-effect
    const channel = supabase
      .channel("ongoing_visits_card")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        fetchOngoingVisitsCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOngoingVisitsCount]);

  const gradientClass = "from-sky-500 to-blue-600";
  const shadowColor = "sky";

  return (
    <div
      onClick={() => onClick("checked-in")}
      className={`relative bg-white dark:bg-slate-900 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 group animate-fadeInUp overflow-hidden border border-gray-100/50 dark:border-slate-800 cursor-pointer block ${className || ""
        }`}
      style={style}
      aria-label="View ongoing visits"
      tabIndex={0}
    >
      {/* Subtle hover background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradientClass} shadow-lg shadow-${shadowColor}/30 transition-transform duration-300 group-hover:scale-110`}>
            <Clock className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>

          <div className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
            <div className={`flex items-center text-xs font-semibold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
              View <ArrowRight className={`ml-1 h-3 w-3 text-${shadowColor}-500`} />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 tracking-wide uppercase">
            Ongoing Visits
          </h3>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 animate-countUp">
            {loading ? "..." : ongoingVisitsCount}
          </p>
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50/80 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 relative z-10 flex justify-between items-center">
        <div className="flex items-center text-xs font-medium text-gray-500 dark:text-slate-400">
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          <span>Today's Metric</span>
        </div>
      </div>

      {/* Bottom accent bar that expands on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass} transition-transform duration-500 group-hover:scale-x-100 scale-x-0 origin-left`} />
    </div>
  );
}
