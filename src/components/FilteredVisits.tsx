"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import { 
  Inbox, 
  Search, 
  CalendarCheck2, 
  Trophy, 
  ShieldX, 
  Activity, 
  ChevronRight,
  Hourglass,
  Users
} from "lucide-react";
import { VisitDetails } from "./VisitDetails";
import type { Database } from "../lib/database.types";
import log from "../lib/logger";
import { useAuthStore } from "../store/auth";
import { BackButton } from "./BackButton";
import { PageHeader } from "./PageHeader";
import { getISTTodayRange, formatIST } from "../lib/dateIST";

type Visit = Database["public"]["Tables"]["visits"]["Row"] & {
    visitor: Database["public"]["Tables"]["visitors"]["Row"] | null;
};

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
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
                return { 
                    title: "Ongoing Visits", desc: "Live monitoring of visitors currently on campus.", icon: Activity, gradient: "from-sky-500 to-indigo-600",
                    emptyClasses: { outer: "from-sky-100 to-sky-50 dark:from-sky-900/30 dark:to-sky-800/10 ring-sky-200 dark:ring-sky-900/50", icon: "text-sky-500 dark:text-sky-400" }
                };
            case "pending":
                return { 
                    title: "Pending Approvals", desc: "Applications waiting for administrative clearance.", icon: Hourglass, gradient: "from-amber-500 to-orange-600",
                    emptyClasses: { outer: "from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/10 ring-amber-200 dark:ring-amber-900/50", icon: "text-amber-500 dark:text-amber-400" }
                };
            case "approved":
                return { 
                    title: "Approved Visits", desc: "Visits cleared by administration for today.", icon: CalendarCheck2, gradient: "from-emerald-500 to-teal-600",
                    emptyClasses: { outer: "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/10 ring-emerald-200 dark:ring-emerald-900/50", icon: "text-emerald-500 dark:text-emerald-400" }
                };
            case "completed":
                return { 
                    title: "Completed Visits", desc: "Archive of visitors who have checked out today.", icon: Trophy, gradient: "from-purple-500 to-indigo-600",
                    emptyClasses: { outer: "from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/10 ring-purple-200 dark:ring-purple-900/50", icon: "text-purple-500 dark:text-purple-400" }
                };
            case "cancelled_denied":
                return { 
                    title: "Rejected Requests", desc: "Applications that were cancelled or denied access.", icon: ShieldX, gradient: "from-rose-500 to-red-600",
                    emptyClasses: { outer: "from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-800/10 ring-rose-200 dark:ring-rose-900/50", icon: "text-rose-500 dark:text-rose-400" }
                };
            default:
                return { 
                    title: "Visit Log", desc: "Filtered view of campus activity.", icon: Inbox, gradient: "from-slate-700 to-slate-900",
                    emptyClasses: { outer: "from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700/50 ring-gray-200 dark:ring-slate-700", icon: "text-gray-400 dark:text-slate-400" }
                };
        }
    };

    const { title, desc, icon: StatusIcon, gradient } = getStatusDetails();

    const getFocusRingColor = () => {
        switch (status) {
            case "checked-in": return "focus:ring-sky-500/20";
            case "pending": return "focus:ring-amber-500/20";
            case "approved": return "focus:ring-emerald-500/20";
            case "completed": return "focus:ring-purple-500/20";
            case "cancelled_denied": return "focus:ring-rose-500/20";
            default: return "focus:ring-slate-500/20";
        }
    };

    const fetchVisits = useCallback(async () => {
        if (!status || !user) return;
        setLoading(true);

        try {
            let query = supabase.from("visits").select(`*, visitor:visitors(*)`);

            if (status === "cancelled_denied") {
                query = query.in("status", ["cancelled", "denied"]);
            } else {
                query = query.eq("status", status);
            }

            if (debouncedSearchTerm) {
                query = query.or(
                    `purpose.ilike.%${debouncedSearchTerm}%,visitor:visitors(name.ilike.%${debouncedSearchTerm}%)`
                );
            }

            if (user?.role === "host") query = query.eq("host_id", user.id);

            const [utcTodayStart, utcTomorrowStart] = getISTTodayRange();
            if (status === "approved") {
                query = query.gte("approved_at", utcTodayStart).lt("approved_at", utcTomorrowStart);
            } else if (status === "completed") {
                query = query.gte("check_out_time", utcTodayStart).lt("check_out_time", utcTomorrowStart);
            } else if (status === "cancelled_denied") {
                query = query.gte("created_at", utcTodayStart).lt("created_at", utcTomorrowStart);
            }

            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) throw error;
            setVisits(data as Visit[]);
        } catch (err) {
            log.error(`[FilteredVisits] Fetch error for status ${status}:`, err);
            toast.error("Failed to load visits. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [status, user, debouncedSearchTerm]);

    useEffect(() => { fetchVisits(); }, [fetchVisits]);

    return (
        <div className="px-4 sm:px-6 lg:px-8 pb-12 animate-fadeIn">
            <div className="max-w-7xl mx-auto">
                <BackButton />

                <PageHeader
                    icon={StatusIcon}
                    gradient={gradient}
                    title={title}
                    description={desc}
                    right={
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                            <input
                                className={`block w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 pl-10 pr-4 text-sm ${getFocusRingColor()} outline-none transition-all dark:text-white`}
                                placeholder="Quick search..."
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    }
                />
            </div>

            <div className="mt-8 max-w-7xl mx-auto">
                <div className="mt-4 flex flex-col min-h-[400px]">
                    <div className="-my-2 sm:-mx-6 lg:-mx-8 flex-1">
                        <div className="inline-block w-full py-2 align-middle md:px-6 lg:px-8 h-full">
                            <div className="glass-panel rounded-[2rem] overflow-hidden transition-all duration-300 h-full flex flex-col">
                                <table className="w-full divide-y divide-gray-300 dark:divide-slate-700/50 flex-1">
                                    <thead className="bg-gray-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6 bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Visitor
                                            </th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Guests
                                            </th>

                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden xl:table-cell bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Vehicle
                                            </th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Phone
                                            </th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden xl:table-cell bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Entry Time
                                            </th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden xl:table-cell bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Exit Time
                                            </th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden xl:table-cell bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Entry Gate
                                            </th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden xl:table-cell bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Exit Gate
                                            </th>
                                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                Status
                                            </th>
                                            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6 bg-gray-50 dark:bg-slate-800 sticky top-0">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900 dark:divide-slate-700">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={9} className="text-center py-8 text-gray-500">
                                                    Loading...
                                                </td>
                                            </tr>
                                        ) : visits.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-24 text-center">
                                                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                                        <div className="bg-gradient-to-tr from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-700/50 p-5 rounded-[2rem] mb-6 shadow-inner ring-1 ring-gray-200 dark:ring-slate-700">
                                                            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm">
                                                                <Inbox className="w-8 h-8 text-gray-400 dark:text-slate-400" />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No {title.toLowerCase()} found</h3>
                                                        <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed max-w-xs">
                                                            {desc} There are no records match your criteria right now.
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            visits.map((visit) => {
                                                const isOverstay = status === 'checked-in' && visit.expected_out_time && new Date(visit.expected_out_time) < new Date();
                                                return (
                                                    <tr key={visit.id} onClick={() => setSelectedVisit(visit)} className={`cursor-pointer hover:${isOverstay ? 'bg-red-50/30' : 'bg-gray-50'}/30 dark:hover:bg-slate-800/30 transition-colors ${isOverstay ? 'bg-red-50/10 dark:bg-red-900/10' : ''}`}>
                                                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                                                                    {visit.visitor?.photo_url ? (
                                                                        <img src={visit.visitor.photo_url} className="w-full h-full object-cover" />
                                                                    ) : visit.visitor?.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold">{visit.visitor?.name}</p>
                                                                    {isOverstay && (
                                                                        <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold">⚠ Overstay</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                            {visit.additional_guests > 0 ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase">
                                                                    <Users className="w-3 h-3" /> +{visit.additional_guests}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300 dark:text-slate-600">None</span>
                                                            )}
                                                        </td>

                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400 hidden xl:table-cell">
                                                            {visit.vehicle_number ? (
                                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{visit.vehicle_number} {visit.vehicle_type && `(${visit.vehicle_type})`}</span>
                                                            ) : (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-400 hidden lg:table-cell">
                                                            {visit.visitor?.phone || "—"}
                                                        </td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400 hidden xl:table-cell">
                                                            {status === 'checked-in' && visit.check_in_time ? (
                                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatIST(visit.check_in_time)}</span>
                                                            ) : status === 'completed' && visit.check_out_time ? (
                                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatIST(visit.check_out_time)}</span>
                                                            ) : (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400 hidden xl:table-cell">
                                                            {visit.check_out_time ? (
                                                                <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatIST(visit.check_out_time)}</span>
                                                            ) : (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400 hidden xl:table-cell">
                                                            {visit.entry_gate ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 dark:text-gray-300 dark:bg-slate-800/50 ring-1 ring-inset ring-gray-500/20 dark:ring-gray-400/20">
                                                                    {visit.entry_gate}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-slate-400 hidden xl:table-cell">
                                                            {visit.exit_gate ? (
                                                                <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 dark:text-gray-300 dark:bg-slate-800/50 ring-1 ring-inset ring-gray-500/20 dark:ring-gray-400/20">
                                                                    {visit.exit_gate}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                                                                status === 'checked-in'
                                                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
                                                                    : status === 'approved'
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                    : status === 'completed'
                                                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                                            }`}>
                                                                {status === 'checked-in' && <span className="h-1.5 w-1.5 bg-sky-500 rounded-full animate-pulse" />}
                                                                {title}
                                                            </span>
                                                        </td>
                                                        <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                            <ChevronRight className="h-4 w-4 text-gray-400 inline ml-2" />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedVisit && (
                <VisitDetails 
                    visit={selectedVisit as unknown as React.ComponentProps<typeof VisitDetails>["visit"]} 
                    onClose={() => setSelectedVisit(null)} 
                    onUpdate={fetchVisits}
                />
            )}
        </div>
    );
}
