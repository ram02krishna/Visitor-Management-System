import { useState, useEffect, useCallback, useRef } from "react";
import {
  Edit3,
  Trash2,
  Search,
  Mail,
  Shield,
  Users as UsersIcon,
  Inbox,
  Check,
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
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const initialLoadDone = useRef(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchUsers = useCallback(async () => {
    // Only show the full-page spinner on the very first load;
    // subsequent calls (search, refresh) update quietly in the background.
    if (!initialLoadDone.current) setLoading(true);

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
    initialLoadDone.current = true;
    setLoading(false);
  }, [debouncedSearchTerm]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    try {
      const { error } = await supabase.from("hosts").delete().eq("id", userId);
      if (error) throw error;
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to delete user");
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("hosts")
        .update({ role: newRole })
        .eq("id", editingUser.id);
      
      if (error) throw error;
      toast.success(`Role updated to ${getRoleLabel(newRole)}`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

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
          <div className="overflow-x-auto scrollbar-hide">
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
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 pl-4 pr-3 sm:pl-6">
                          <div className="flex items-center gap-3">
                            <div className="skeleton w-9 h-9 rounded-[1.25rem] shrink-0" />
                            <div className="space-y-2 w-full">
                              <div className="skeleton h-4 w-24 rounded" />
                              <div className="skeleton h-3 w-32 rounded lg:hidden" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 hidden lg:table-cell"><div className="skeleton h-4 w-40 rounded" /></td>
                        <td className="px-3 py-4 hidden lg:table-cell"><div className="skeleton h-5 w-20 rounded-xl" /></td>
                        <td className="px-3 py-4 hidden lg:table-cell"><div className="skeleton h-5 w-20 rounded-xl" /></td>
                        <td className="py-4 pl-3 pr-4 sm:pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="skeleton h-8 w-8 rounded-2xl" />
                            <div className="skeleton h-8 w-8 rounded-2xl" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
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
                          <button 
                            onClick={() => setEditingUser(user)}
                            className="p-2 rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 transition-all active:scale-90" 
                            title="Edit Role"
                          >
                            <Edit3 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-all active:scale-90" 
                            title="Delete"
                          >
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

      {/* ── Edit Role Modal ── */}
      {editingUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-fadeIn" onClick={() => setEditingUser(null)} />
          <div className="relative w-full max-w-sm glass-panel rounded-[2rem] shadow-2xl animate-springIn overflow-hidden border border-white/20 dark:border-slate-700/50">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/60 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                  <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Update Role</h3>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight truncate max-w-[180px]">
                    {editingUser.name}
                  </p>
                </div>
              </div>

            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest ml-1">Select New Role</p>
              <div className="grid grid-cols-1 gap-2">
                {["admin", "host", "guard"].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleUpdateRole(role)}
                    disabled={isUpdating}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                      editingUser.role === role
                        ? "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400 font-black"
                        : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-200 dark:hover:border-slate-700 font-bold"
                    }`}
                  >
                    <span className="text-xs uppercase tracking-widest">{getRoleLabel(role)}</span>
                    {editingUser.role === role && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
              
              <div className="pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="w-full py-3 rounded-2xl border border-gray-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
