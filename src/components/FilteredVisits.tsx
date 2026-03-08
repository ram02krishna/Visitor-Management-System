import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { Eye, CheckCircle, Inbox, Search } from "lucide-react";
import { VisitDetails } from "./VisitDetails";
import type { Visit as DbVisit } from "../lib/database.types";
import log from "../lib/logger";
import { useAuthStore } from "../store/auth";
import { BackButton } from "./BackButton";

type Visit = DbVisit & {
    created_at: string;
    approved_at?: string;
};

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

export function FilteredVisits() {
    const { status } = useParams<{ status: string }>();
    const { user } = useAuthStore();


    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const getStatusDetails = () => {
        switch (status) {
            case "checked-in":
                return { title: "Ongoing Visits", desc: "A list of all visitors currently on the premises.", showComplete: true };
            case "approved":
                return { title: "Approved Visits", desc: "A list of visits approved for today.", showComplete: false };
            case "completed":
                return { title: "Completed Visits", desc: "A list of all completed visits for today.", showComplete: false };
            case "cancelled_denied":
                return { title: "Cancelled/Denied Visits", desc: "A list of cancelled or denied visits.", showComplete: false };
            default:
                return { title: `${status} Visits`, desc: "A list of visits.", showComplete: false };
        }
    };

    const { title, desc, showComplete } = getStatusDetails();

    const fetchVisits = useCallback(async () => {
        if (!status || !user) return;
        
        setLoading(true);
        let query = supabase.from("visits").select(`*, visitor:visitors(*)`);

        // Status filtering
        if (status === "cancelled_denied") {
            query = query.in("status", ["cancelled", "denied"]);
        } else {
            query = query.eq("status", status);
        }

        if (debouncedSearchTerm) {
            query = query.or(
                `purpose.ilike.%${debouncedSearchTerm}%,visitor:visitors(name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%)`
            );
        }

        // Role filtering & date filtering (similar to dashboard logic for "today")
        if (user?.role === "host") {
            query = query.eq("host_id", user.id);
        }

        // specific date filters to align with dashboard numbers
        if (status !== "pending" && status !== "checked-in" && status !== "cancelled_denied") {
            const localToday = new Date();
            localToday.setHours(0, 0, 0, 0);
            const utcTodayStart = new Date(localToday.getTime() - localToday.getTimezoneOffset() * 60000).toISOString();
            const localTomorrow = new Date(localToday);
            localTomorrow.setDate(localToday.getDate() + 1);
            const utcTomorrowStart = new Date(localTomorrow.getTime() - localTomorrow.getTimezoneOffset() * 60000).toISOString();

            if (status === "approved") {
                query = query.gte("approved_at", utcTodayStart).lt("approved_at", utcTomorrowStart);
            } else if (status === "completed") {
                query = query.gte("check_out_time", utcTodayStart).lt("check_out_time", utcTomorrowStart);
            }
        }

        // Ordering
        if (status === "checked-in") {
            query = query.order("check_in_time", { ascending: false });
        } else if (status === "approved") {
            query = query.order("approved_at", { ascending: false });
        } else {
            query = query.order("created_at", { ascending: false });
        }

        query = query.limit(50); // limit to recent 50 for the table

        const { data, error } = await query;

        if (error) {
            log.error("Error fetching visits:", error);
            toast.error("Failed to fetch visits.");
        } else {
            setVisits(data as Visit[]);
        }
        setLoading(false);
    }, [status, user, debouncedSearchTerm]);

    useEffect(() => {
        fetchVisits(); // eslint-disable-line react-hooks/set-state-in-effect
    }, [fetchVisits]);

    const handleCompleteVisit = useCallback(async (visitId: string) => {
        const isGuard = user?.role === "guard";
        if (!isGuard) {
            toast.error("Only security guards can complete visits.");
            return;
        }

        const { error } = await supabase
            .from("visits")
            .update({ status: "completed", check_out_time: new Date().toISOString() })
            .eq("id", visitId);

        if (error) {
            log.error("Error completing visit:", error);
            toast.error("Failed to complete visit.");
        } else {
            toast.success("Visit completed successfully!");
            fetchVisits();
        }
    }, [user?.role, fetchVisits]);

    return (
        <div className="px-4 sm:px-6 lg:px-8 animate-fadeIn">
            <BackButton />

            <div className="sm:flex sm:items-center justify-between">
                <div className="sm:flex-auto">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
                        {desc}
                    </p>
                </div>

                <div className="mt-4 sm:mt-0 w-full sm:w-auto sm:ml-6 flex items-center">
                    <div className="relative w-full sm:w-80">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            className="block w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition-all duration-300 shadow-sm"
                            placeholder="Search by name, email, or purpose..."
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-2xl">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-slate-700">
                                <thead className="bg-gray-50 dark:bg-slate-800">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                                            Visitor
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Purpose
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                            Time
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="whitespace-nowrap px-3 py-8 text-sm text-gray-500 text-center">
                                                <div className="flex justify-center flex-col items-center">
                                                    <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
                                                    <span className="mt-2">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : visits.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-full mb-4 ring-8 ring-gray-50/50 dark:ring-slate-800/20">
                                                        <Inbox className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No {title.toLowerCase()} found</h3>
                                                    <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                                                        There are currently no visits matching this status for today.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        visits.map((visit) => (
                                            <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                                                            {(visit.visitor?.name || "U")[0].toUpperCase()}
                                                        </div>
                                                        {visit.visitor?.name || "Unknown"}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
                                                    {visit.purpose}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
                                                    {status === 'completed' && visit.check_out_time ? new Date(visit.check_out_time).toLocaleString() :
                                                        status === 'checked-in' && visit.check_in_time ? new Date(visit.check_in_time).toLocaleString() :
                                                            status === 'approved' && visit.approved_at ? new Date(visit.approved_at).toLocaleString() :
                                                                new Date(visit.created_at).toLocaleString()}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button
                                                        onClick={() => setSelectedVisit(visit)}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-5 w-5 inline" />
                                                    </button>
                                                    {user?.role === "guard" && showComplete && status === "checked-in" && (
                                                        <button
                                                            onClick={() => handleCompleteVisit(visit.id)}
                                                            className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                                                            title="Complete Visit (Guard only)"
                                                        >
                                                            <CheckCircle className="h-5 w-5 inline" />
                                                        </button>
                                                    )}
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
