import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { UserPlus, Edit3, Trash2, Search, Mail, Shield, Users as UsersIcon, Inbox, X } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import type { Database } from "../lib/database.types";
import { BackButton } from "./BackButton";

type Profile = Database["public"]["Tables"]["hosts"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type AddUserFormData = {
  name: string;
  email: string;
  department_id: string;
  role: "admin" | "guard" | "host" | "visitor";
  password_confirm: string;
  password: string;
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

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<Profile[]>(() => {
    try { return JSON.parse(localStorage.getItem("vms_users") ?? "null") ?? []; } catch { return []; }
  });
  const [loading, setLoading] = useState(() => 
    localStorage.getItem("vms_users") === null
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Admin";
      case "guard": return "Guard";
      case "host": return "Host";
      case "visitor": return "Visitor";
      default: return role;
    }
  };

  const handleToggleModal = () => {
    setIsUserManagementModalOpen(!isUserManagementModalOpen);
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddUserFormData>();

  async function fetchDepartments() {
    const { data, error } = await supabase.from("departments").select("*");
    if (error) {
      toast.error("Failed to fetch departments");
      console.error(error);
    } else {
      setDepartments(data);
    }
  }

  const fetchUsers = useCallback(async () => {
    if (!debouncedSearchTerm && users.length > 0) {
      // background refresh
    } else {
      setLoading(true);
    }
    let query = supabase.from("hosts").select("*");

    if (debouncedSearchTerm) {
      query = query.or(`name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    } else {
      setUsers(data);
      if (!debouncedSearchTerm) {
        try { localStorage.setItem("vms_users", JSON.stringify(data)); } catch { /* ignore quota */ }
      }
    }
    setLoading(false);
  }, [debouncedSearchTerm, users.length]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const onSubmit = async (formData: AddUserFormData) => {
    if (formData.password !== formData.password_confirm) {
      return toast.error("Passwords don't match");
    }
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        throw authError;
      }
      if (!authData.user) {
        throw new Error("Couldn't create user");
      }

      const { error: dbError } = await supabase.from("hosts").insert({
        auth_id: authData.user.id,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department_id: formData.department_id,
      });

      if (dbError) {
        throw dbError;
      }

      toast.success("User successfully Created");
      fetchUsers(); // Refetch users
      handleToggleModal();
      reset();
    } catch (error: unknown) {
      toast.error((error as Error).message);
      console.error(error);
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
          right={
            <button
              type="button"
              onClick={handleToggleModal}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 hover:from-sky-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" strokeWidth={2.5} />
              Add User
            </button>
          }
        />
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="mt-6">        <div className="flex flex-1 items-center justify-between mb-4">
          <div className="w-full max-w-lg lg:max-w-xs">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="search"
                className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-primary-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="Search users"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col">
          <div className="-my-2 sm:-mx-6 lg:-mx-8">
            <div className="inline-block w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg md:rounded-lg">
                <table className="w-full divide-y divide-gray-300 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6"
                      >
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">
                        Email
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">
                        Role
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white hidden lg:table-cell">
                        Status
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:bg-slate-900 dark:divide-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-full mb-4 ring-8 ring-gray-50/50 dark:ring-slate-800/20">
                              <Inbox className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No users found</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                              There are currently no users registered in the system.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                            <span className="block truncate max-w-[200px]">{user.name}</span>
                            {/* Mobile only info */}
                            <div className="block lg:hidden mt-2 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{user.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 dark:from-purple-900/50 dark:to-indigo-900/50 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                                  {getRoleLabel(user.role)}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${user.active
                                    ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 dark:from-emerald-900/50 dark:to-green-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                                    : "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/50 dark:to-rose-900/50 dark:text-red-200 border border-red-300 dark:border-red-800"
                                    }`}
                                >
                                  <span className={`h-1 w-1 rounded-full ${user.active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                                  {user.active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300 hidden lg:table-cell">
                            <div className="flex items-center gap-2 max-w-[200px] overflow-hidden truncate">
                              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
                                <Shield className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                              </div>
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 dark:from-purple-900/50 dark:to-indigo-900/50 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                                {getRoleLabel(user.role)}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300 hidden lg:table-cell">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${user.active
                                ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 dark:from-emerald-900/50 dark:to-green-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                                : "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/50 dark:to-rose-900/50 dark:text-red-200 border border-red-300 dark:border-red-800"
                                }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${user.active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                                  }`}
                              />
                              {user.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 whitespace-normal">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="group p-2 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 transition-all duration-200"
                                title="Edit User"
                              >
                                <Edit3
                                  className="h-4 w-4 text-sky-600 dark:text-sky-400 group-hover:text-sky-700 dark:group-hover:text-sky-300"
                                  strokeWidth={2}
                                />
                              </button>
                              <button
                                className="group p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-all duration-200"
                                title="Delete User"
                              >
                                <Trash2
                                  className="h-4 w-4 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300"
                                  strokeWidth={2}
                                />
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
      </div>
      </div>

      {isUserManagementModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto pt-20 sm:pt-0">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" 
            onClick={handleToggleModal} 
            aria-hidden="true" 
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scaleIn border border-gray-100 dark:border-slate-800 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <UserPlus className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    Add New User
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Create a new system account</p>
                </div>
              </div>
              <button 
                onClick={handleToggleModal} 
                className="p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      {...register("name", { required: "Name is required" })}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      placeholder="John Doe"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs font-medium text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      {...register("email", { required: "Email is required" })}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs font-medium text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      {...register("password", { required: "Password is required" })}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      placeholder="••••••••"
                    />
                    {errors.password && (
                      <p className="mt-1 text-xs font-medium text-red-500">{errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      {...register("password_confirm", {
                        required: "You must confirm your password",
                      })}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                      placeholder="••••••••"
                    />
                    {errors.password_confirm && (
                      <p className="mt-1 text-xs font-medium text-red-500">
                        {errors.password_confirm.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                      Role *
                    </label>
                    <select
                      {...register("role", { required: "Role is required" })}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold"
                    >
                      <option value="host">Host</option>
                      <option value="guard">Guard</option>
                      <option value="admin">Admin</option>
                      <option value="visitor">Visitor</option>
                    </select>
                    {errors.role && (
                      <p className="mt-1 text-xs font-medium text-red-500">{errors.role.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                      Department *
                    </label>
                    <select
                      {...register("department_id", { required: "Department is required" })}
                      className="block w-full rounded-xl border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white font-bold"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          {dep.name}
                        </option>
                      ))}
                    </select>
                    {errors.department_id && (
                      <p className="mt-1 text-xs font-medium text-red-500">
                        {errors.department_id.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-6 text-sm font-bold uppercase tracking-widest text-white shadow-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:shadow-sky-500/25 transition-all active:scale-[0.98] hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Create User account</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleModal}
                    className="px-8 py-3.5 border-2 border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
