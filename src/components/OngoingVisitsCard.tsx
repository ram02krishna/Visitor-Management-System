import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Clock, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import React from "react";

interface OngoingVisitsCardProps {
  className?: string;
  style?: React.CSSProperties;
}

export function OngoingVisitsCard({ className, style }: OngoingVisitsCardProps) {
  const [ongoingVisitsCount, setOngoingVisitsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOngoingVisitsCount();
    const channel = supabase
      .channel("ongoing_visits_card")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        fetchOngoingVisitsCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchOngoingVisitsCount() {
    setLoading(true);
    const { count, error } = await supabase
      .from("visits")
      .select("*", { count: "exact", head: true })
      .eq("status", "checked-in");

    if (error) {
      console.error("Error fetching ongoing visits count:", error);
    } else {
      setOngoingVisitsCount(count || 0);
    }
    setLoading(false);
  }

  return (
    <Link
      to="/app/ongoing-visits"
      className={`glass rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group animate-fadeInUp cursor-pointer ${
        className || ""
      }`}
      style={style}
      aria-label="View ongoing visits"
      tabIndex={0}
    >
      <div className="p-6">
        <div className="flex items-center">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20 transition-all duration-300">
            <Clock className="h-7 w-7 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-slate-300">Ongoing Visits</h3>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-slate-100 transition-transform duration-300">
              {loading ? "..." : ongoingVisitsCount}
            </p>
          </div>
        </div>
      </div>
      <div className="px-6 py-2 bg-gray-50/50 dark:bg-slate-800/50 rounded-b-2xl border-t border-gray-100 dark:border-slate-600">
        <div className="flex items-center text-xs text-gray-500 dark:text-slate-400">
          <TrendingUp className="h-3 w-3 mr-1 transition-colors duration-300" />
          <span>Today</span>
        </div>
      </div>
    </Link>
  );
}
