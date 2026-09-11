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
import { api } from "../lib/api";
import { toast } from "react-hot-toast";
import type { Database } from "../lib/database.types";
import { useDebounce } from "../hooks/useDebounce";
import { useDataSync } from "../lib/dataSync";
import { TableSkeleton } from "./ui/LoadingSkeleton";

type Profile = Database["public"]["Tables"]["hosts"]["Row"];

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    admin: "Administrator",
    warden: "Hostel Warden",
    host: "Faculty / Host",
    guard: "Security Guard",
    student: "Resident Student",
    visitor: "Visitor / Guest",
  };
  return map[role] ?? role;
};

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const cachedUsers = (api.uiCache.get("vms_users") as Profile[]) || [];
  const [users, setUsers] = useState<Profile[]>(() => cachedUsers);
  const [loading, setLoading] = useState(cachedUsers.length === 0);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const initialLoadDone = useRef(cachedUsers.length > 0);

  const fetchUsers = useCallback(async (isBackground = false) => {
    if (!initialLoadDone.current && !isBackground && users.length === 0) {
      setLoading(true);
    }

    try {
      const data = await api.hosts.list(debouncedSearchTerm || undefined);
      setUsers(data);
      if (!debouncedSearchTerm) {
        api.uiCache.set("vms_users", data);
      }
    } catch {
      if (!isBackground) {
        toast.error("Failed to fetch users");
      }
    } finally {
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [debouncedSearchTerm, users.length]);

  useDataSync(["hosts", "all"], () => {
    fetchUsers(true);
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone."))
      return;
    try {
      await api.hosts.delete(userId);
      toast.success("User deleted successfully");
      fetchUsers(true);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to delete user");
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      await api.hosts.update(editingUser.id, {
        role: newRole as "admin" | "guard" | "host" | "visitor",
      });
      toast.success(`Role updated to ${getRoleLabel(newRole)}`);
      setEditingUser(null);
      fetchUsers(true);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <PageHeader
        backTo="/app/dashboard"
        icon={UsersIcon}
        gradient="from-sky-500 to-blue-600"
        title="User Directory"
        description="Manage user accounts, assign security roles, and control access permissions."
        right={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              id="user-search"
              className="block w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
              placeholder="Search by name or email..."
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      {loading && users.length === 0 ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="lg:hidden px-4 py-2 bg-sky-50/50 dark:bg-sky-900/10 border-b border-gray-100 dark:border-slate-800/50">
            <p className="text-[9px] font-black text-sky-600/60 dark:text-sky-400/60 uppercase tracking-widest flex items-center gap-1.5">
              <span className="animate-pulse">←</span> Swipe horizontally for more details{" "}
              <span className="animate-pulse">→</span>
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full divide-y divide-gray-200 dark:divide-slate-800 min-w-[750px]">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-slate-800/60">
                  <th
                    scope="col"
                    className="py-3 pl-6 pr-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell"
                  >
                    Email Address
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    Current Role
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell"
                  >
                    Department
                  </th>
                  <th
                    scope="col"
                    className="relative py-3 pl-3 pr-6 text-right text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="max-w-xs mx-auto text-center space-y-2">
                        <Inbox className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
                        <p className="text-sm font-bold text-gray-900 dark:text-white">No users found</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {searchTerm ? "No users matching your search" : "No users currently registered."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((profile) => (
                    <tr
                      key={profile.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 pl-6 pr-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {profile.name ? profile.name.slice(0, 2).toUpperCase() : "US"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                              {profile.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 sm:hidden truncate">
                              {profile.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap hidden sm:table-cell">
                        <div className="flex items-center text-xs text-gray-600 dark:text-slate-300">
                          <Mail className="h-3.5 w-3.5 mr-2 text-gray-400 shrink-0" />
                          <span className="truncate">{profile.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            profile.role === "admin"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50"
                              : profile.role === "warden"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50"
                              : profile.role === "guard"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50"
                              : profile.role === "host"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50"
                              : profile.role === "student"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50"
                              : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 border border-gray-200/50 dark:border-slate-700/50"
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          {getRoleLabel(profile.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-gray-600 dark:text-slate-300 hidden md:table-cell">
                        {(profile as any).department?.name || "-"}
                      </td>
                      <td className="py-3.5 pl-3 pr-6 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(profile)}
                            className="p-1.5 text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition-all"
                            title="Edit Role"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(profile.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-springIn p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Edit Role & Permissions
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Assign campus access role for <strong>{editingUser.name}</strong>
              </p>
            </div>

            <div className="space-y-2">
              {(["admin", "warden", "host", "guard", "student", "visitor"] as const).map((r) => (
                <button
                  key={r}
                  disabled={isUpdating}
                  onClick={() => handleUpdateRole(r)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                    editingUser.role === r
                      ? "border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
                      : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
                  }`}
                >
                  <span>{getRoleLabel(r)}</span>
                  {editingUser.role === r && <Check className="w-4 h-4 text-sky-600" />}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
