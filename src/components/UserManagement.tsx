import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { UserPlus, Edit3, Trash2, Search, Mail, Shield, Users as UsersIcon, Inbox } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import type { Database } from "../lib/database.types";
import { BackButton } from "./BackButton";

type Host = Database["public"]["Tables"]["hosts"]["Row"];
type Department = Database["public"]["Tables"]["departments"]["Row"];
type AddUserFormData = {
  name: string;
  email: string;
  department_id: string;
  role: "admin" | "guard" | "host";
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
  const [users, setUsers] = useState<Host[]>(() => {
    try { return JSON.parse(localStorage.getItem("vms_users") ?? "null") ?? []; } catch { return []; }
  });
  const [loading, setLoading] = useState(() => 
    localStorage.getItem("vms_users") === null
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

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
  }, [debouncedSearchTerm]);

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

      toast.success("User created successfully!");
      fetchUsers(); // Refetch users
      handleToggleModal();
      reset();
    } catch (error: unknown) {
      toast.error((error as Error).message);
      console.error(error);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 animate-fadeIn">
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

      <div className="mt-8">
        <div className="flex flex-1 items-center justify-between mb-4">
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
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Email
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Role
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
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
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                            {user.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              {user.email}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-sm">
                                <Shield className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                              </div>
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 dark:from-purple-900/50 dark:to-indigo-900/50 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                                {user.role}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-slate-300">
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
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
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

      {isUserManagementModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3
                    className="text-lg leading-6 font-medium text-gray-900 dark:text-slate-100"
                    id="modal-title"
                  >
                    Add New User
                  </h3>
                  <div className="mt-2">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Name
                        </label>
                        <input
                          type="text"
                          {...register("name", { required: "Name is required" })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Email
                        </label>
                        <input
                          type="email"
                          {...register("email", { required: "Email is required" })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Password
                        </label>
                        <input
                          type="password"
                          {...register("password", { required: "Password is required" })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                        />
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          {...register("password_confirm", {
                            required: "You must confirm your password",
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                        />
                        {errors.password_confirm && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.password_confirm.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Role
                        </label>
                        <select
                          {...register("role", { required: "Role is required" })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                        >
                          <option value="host">Host</option>
                          <option value="guard">Guard</option>
                          <option value="admin">Admin</option>
                        </select>
                        {errors.role && (
                          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Department
                        </label>
                        <select
                          {...register("department_id", { required: "Department is required" })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                        >
                          {departments.map((dep) => (
                            <option key={dep.id} value={dep.id}>
                              {dep.name}
                            </option>
                          ))}
                        </select>
                        {errors.department_id && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.department_id.message}
                          </p>
                        )}
                      </div>

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
                        >
                          Create User
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleModal}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
