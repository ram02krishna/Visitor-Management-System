import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/auth";
import { API_BASE } from "../lib/api";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Clock,
  Shield
} from "lucide-react";


import { PageHeader } from "./PageHeader";
import { SEOMeta } from "./SEOMeta";

type ChangePasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  width: string;
} {
  if (!password) return { score: 0, label: "None", color: "bg-gray-200 dark:bg-slate-700", width: "0%" };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500", width: "25%" };
  if (score <= 3) return { score: 2, label: "Medium", color: "bg-amber-500", width: "60%" };
  return { score: 3, label: "Strong", color: "bg-emerald-500", width: "100%" };
}

export function ChangePassword() {
  const { user } = useAuthStore();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const newPasswordValue = watch("newPassword", "");
  const confirmPasswordValue = watch("confirmPassword", "");
  const strength = getPasswordStrength(newPasswordValue);

  const onSubmit = async (data: ChangePasswordFormData) => {
    setErrorMessage("");

    if (data.newPassword !== data.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (!user?.email) {
      toast.error("User email not found. Please log in again.");
      return;
    }

    try {
      const token = localStorage.getItem("vms_token");
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Failed to update password";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch {

        }
        throw new Error(errorMsg);
      }

      toast.success("Password successfully updated!");
      reset();
    } catch (error: unknown) {
      const msg = (error as Error).message || "Failed to update password";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <SEOMeta title="Security Settings" />

      <PageHeader
        backTo="/app/dashboard"
        icon={KeyRound}
        gradient="from-indigo-500 to-purple-600"
        title="Security Settings"
        description="Manage account credentials, authentication security, and password updates."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20 shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "US"}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-gray-900 dark:text-white truncate">
                  {user?.name || "Active User"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <Shield className="w-3 h-3" />
                  <span>Role: {user?.role || "user"}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between text-gray-600 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Account Status
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified & Active</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-sky-500" /> Encryption
                </span>
                <span className="font-bold text-gray-900 dark:text-white">bcrypt (10 rounds)</span>
              </div>
              <div className="flex items-center justify-between text-gray-600 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" /> Session Security
                </span>
                <span className="font-bold text-gray-900 dark:text-white">JWT Protected</span>
              </div>
            </div>
          </div>


          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 space-y-3">
            <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-500" /> Security Recommendations
            </h2>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className={newPasswordValue.length >= 6 ? "text-emerald-500 font-bold" : "text-gray-400"}>
                  {newPasswordValue.length >= 6 ? "✓" : "•"}
                </span>
                <span>Minimum 6 characters (8+ recommended)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={/[0-9]/.test(newPasswordValue) ? "text-emerald-500 font-bold" : "text-gray-400"}>
                  {/[0-9]/.test(newPasswordValue) ? "✓" : "•"}
                </span>
                <span>Include at least one number</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={/[A-Z]/.test(newPasswordValue) ? "text-emerald-500 font-bold" : "text-gray-400"}>
                  {/[A-Z]/.test(newPasswordValue) ? "✓" : "•"}
                </span>
                <span>Include an uppercase letter</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={confirmPasswordValue && newPasswordValue === confirmPasswordValue ? "text-emerald-500 font-bold" : "text-gray-400"}>
                  {confirmPasswordValue && newPasswordValue === confirmPasswordValue ? "✓" : "•"}
                </span>
                <span>Confirm password matches exactly</span>
              </li>
            </ul>
          </div>
        </div>


        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 shadow-xs border border-gray-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Update Account Password
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Enter your current password followed by your new chosen password.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-4 flex items-center gap-3 animate-fadeIn">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-700 dark:text-red-300">{errorMessage}</p>
                </div>
              )}


              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Current Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    {...register("currentPassword", {
                      required: "Current password is required",
                    })}
                    className="block w-full pl-10 pr-10 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 shadow-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white text-xs sm:text-sm outline-none transition-all"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs text-red-500 font-medium">{errors.currentPassword.message}</p>
                )}
              </div>


              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    {...register("newPassword", {
                      required: "New password is required",
                      minLength: { value: 6, message: "Must be at least 6 characters" },
                    })}
                    className="block w-full pl-10 pr-10 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 shadow-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white text-xs sm:text-sm outline-none transition-all"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>


                {newPasswordValue && (
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-gray-500 dark:text-slate-400">Strength:</span>
                      <span className={`capitalize ${
                        strength.score === 1 ? "text-red-500" : strength.score === 2 ? "text-amber-500" : "text-emerald-500"
                      }`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: strength.width }}
                      />
                    </div>
                  </div>
                )}

                {errors.newPassword && (
                  <p className="text-xs text-red-500 font-medium">{errors.newPassword.message}</p>
                )}
              </div>


              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword", { required: "Please confirm your password" })}
                    className="block w-full pl-10 pr-10 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 shadow-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white text-xs sm:text-sm outline-none transition-all"
                    placeholder="Re-type new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPasswordValue && newPasswordValue !== confirmPasswordValue && (
                  <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
                )}
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>
                )}
              </div>


              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full !py-3 !rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

