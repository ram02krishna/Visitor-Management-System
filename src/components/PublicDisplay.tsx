import { useEffect, useState } from "react";
import { format } from "date-fns";
import { UserCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Database } from "../lib/database.types";
import { BackButton } from "./BackButton";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
  visitors: Database["public"]["Tables"]["visitors"]["Row"];
  hosts: Database["public"]["Tables"]["hosts"]["Row"];
};

export function PublicDisplay() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApprovedVisits = async () => {
    try {
      const { data, error } = await supabase
        .from("visits")
        .select(
          `
          *,
          visitors (*),
          hosts (*)
        `
        )
        .eq("status", "approved")
        .gte("valid_until", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVisits(data as Visit[]);
    } catch (error) {
      console.error("Error loading approved visits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovedVisits();

    const interval = setInterval(loadApprovedVisits, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <BackButton />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Welcome to Our Campus
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                Approved Visitors Today
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-pulse">
                    <div className="flex items-center">
                      <div className="skeleton w-12 h-12 rounded-full shrink-0" />
                      <div className="ml-5 flex-1 space-y-3">
                        <div className="skeleton h-5 w-3/4 rounded" />
                        <div className="skeleton h-4 w-1/2 rounded" />
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="skeleton h-4 w-full rounded" />
                      <div className="skeleton h-4 w-2/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {visits.map((visit) => (
                    <div
                      key={visit.id}
                      className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700"
                    >
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <UserCheck className="h-8 w-8 text-green-500" />
                          </div>
                          <div className="ml-5">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {visit.visitors.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{visit.purpose}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            <span className="font-medium">Meeting with:</span> {visit.hosts.name}
                          </div>
                          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Valid until:{" "}
                            {visit.valid_until ? format(new Date(visit.valid_until), "p") : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {visits.length === 0 && (
                  <div className="text-center mt-8">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      No approved visits at the moment
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
