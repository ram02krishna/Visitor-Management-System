import { useState, useEffect, useCallback } from "react";
import {
  Edit3,
  Trash2,
  Search,
  Mail,
  Shield,
  Users as UsersIcon,
  Inbox,
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import type { Database } from "../lib/database.types";
import { BackButton } from "./BackButton";

type Profile = Database["public"]["Tables"]["hosts"]["Row"];

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = { admin: "Admin", guard: "Guard", host: "Host", visitor: "Visitor" };
  return map[role] ?? role;
};

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<Profile[]>(() => {
    try { return JSON.parse(localStorage.getItem("vms_users") ?? "null") ?? []; }
    catch { return []; }
  });
  const [loading, setLoading] = useState(() => localStorage.getItem("vms_users") === null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchUsers = useCallback(async () => {
    if (!debouncedSearchTerm && users.length > 0) { /* background */ }
    else setLoading(true);

    let query = supabase.from("hosts").select("*");
    if (debouncedSearchTerm)
      query = query.or(`name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%`);

    const { data, error } = await query;
    if (error) toast.error("Failed to fetch users");
    else {
      setUsers(data);
      if (!debouncedSearchTerm) {
        try { localStorage.setItem("vms_users", JSON.stringify(data)); } catch { /* quota */ }
      }
    }
    setLoading(false);
  }, [debouncedSearchTerm, users.length]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <PageHeader
          icon={UsersIcon}
          gradient="from-sky-500 to-blue-600"
          title="Users"
          description="Manage system users and their roles."
        />
      </div>

      {/* ── User Table ── */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="mb-4 relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            id="user-search"
            className="block w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            placeholder="Search users..."
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="glass-panel rounded-[2rem] transition-all duration-300 h-full flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
          <div className="lg:hidden px-6 py-2 bg-sky-50/50 dark:bg-sky-900/10 border-b border-gray-100 dark:border-slate-800/50">
            <p className="text-[9px] font-black text-sky-600/60 dark:text-sky-400/60 uppercase tracking-widest flex items-center gap-1.5">
              <span className="animate-pulse">←</span> Swipe horizontally to see more details <span className="animate-pulse">→</span>
            </p>
          </div>
          <div className="overflow-x-auto scroll-ios scrollbar-hide">
            <table className="w-full divide-y divide-gray-200 dark:divide-slate-700 min-w-[800px]">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-slate-800 dark:to-slate-800/50">
                  <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-6 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Name</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest hidden lg:table-cell">Email</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest hidden lg:table-cell">Role</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest hidden lg:table-cell">Status</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[10px] font-black uppercase tracking-widest text-gray-400">Loading records...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700">
                          <Inbox className="w-7 h-7 text-gray-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">No users found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, idx) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors animate-fadeInUp" style={{ animationDelay: `${idx * 0.02}s` }}>
                      <td className="py-4 pl-4 pr-3 sm:pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 dark:text-white">{user.name}</p>
                            <div className="lg:hidden flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span className="text-[11px] text-gray-400 truncate max-w-[160px]">{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-xs text-gray-500 dark:text-slate-400 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-gray-300 dark:text-slate-600 shrink-0" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-3 py-4 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40">
                          <Shield className="w-3 h-3" /> {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-3 py-4 hidden lg:table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.active ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/40"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 pl-3 pr-4 sm:pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 transition-all active:scale-90" title="Edit">
                            <Edit3 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button className="p-2 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all active:scale-90" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
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
  );
}
