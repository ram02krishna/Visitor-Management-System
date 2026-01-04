import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { Eye, CheckCircle } from "lucide-react";
import { VisitDetails } from "./VisitDetails";
import type { Visit } from "../lib/database.types";
import log from "../lib/logger";

export function OngoingVisits() {
  const [ongoingVisits, setOngoingVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  useEffect(() => {
    fetchOngoingVisits();
  }, []);

  async function fetchOngoingVisits() {
    setLoading(true);
    const { data, error } = await supabase
      .from("visits")
      .select(
        `
        *,
        visitor:visitors(*)
      `
      )
      .eq("status", "checked-in")
      .order("check_in_time", { ascending: false });

    if (error) {
      log.error("Error fetching ongoing visits:", error);
      toast.error("Failed to fetch ongoing visits.");
    } else {
      setOngoingVisits(data as Visit[]);
    }
    setLoading(false);
  }

  async function handleCompleteVisit(visitId: string) {
    const { error } = await supabase
      .from("visits")
      .update({ status: "completed", check_out_time: new Date().toISOString() })
      .eq("id", visitId);

    if (error) {
      log.error("Error completing visit:", error);
      toast.error("Failed to complete visit.");
    } else {
      toast.success("Visit completed successfully!");
      fetchOngoingVisits();
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ongoing Visits</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            A list of all visitors currently on the premises.
          </p>
        </div>
      </div>
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6"
                    >
                      Visitor
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      Purpose
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      Check-in Time
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : ongoingVisits.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"
                      >
                        No ongoing visits.
                      </td>
                    </tr>
                  ) : (
                    ongoingVisits.map((visit) => (
                      <tr key={visit.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                          {visit.visitor.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {visit.purpose}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(visit.check_in_time).toLocaleString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => setSelectedVisit(visit)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleCompleteVisit(visit.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {selectedVisit && (
        <VisitDetails visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
      )}
    </div>
  );
}
