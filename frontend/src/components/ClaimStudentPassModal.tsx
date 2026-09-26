import { useState } from "react";
import { createPortal } from "react-dom";
import { GraduationCap, ShieldCheck, ArrowRight, X, AlertCircle } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface ClaimStudentPassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ClaimStudentPassModal({ isOpen, onClose }: ClaimStudentPassModalProps) {
  const { user } = useAuthStore();
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) {
      setError("Please enter your College Roll Number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.students.claimPass(rollNumber.trim().toUpperCase());


      localStorage.setItem("vms_token", res.token);
      localStorage.setItem("vms_user_profile", JSON.stringify(res.user));
      useAuthStore.setState({ user: res.user, isAuthenticated: true, error: null });

      toast.success(res.message || "🎉 Student GatePass permanently activated!");
      onClose();
      navigate("/app/student-pass");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to claim student pass";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 flex flex-col animate-scaleIn my-auto overflow-hidden">

        <div className="absolute -top-16 -right-16 w-36 h-36 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />


        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>


        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50 border border-sky-200/60 dark:bg-sky-500/15 dark:border-sky-500/30 dark:shadow-[0_0_15px_-2px_rgba(14,165,233,0.35)] text-sky-600 dark:text-sky-400 shrink-0 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
              Directory Verification
            </span>
            <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
              Issue Resident Student Pass
            </h3>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed mb-5">
          Are you an enrolled resident student? Enter your official College Roll Number. Your account email (<strong className="text-sky-600 dark:text-sky-400 font-mono font-medium">{user?.email || "logged in account"}</strong>) must match the Student Directory record to switch to Student and activate your pass.
        </p>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              College Roll Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
              placeholder="e.g. BT23CSE026"
              className="w-full px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-sm font-mono font-bold text-gray-900 dark:text-white uppercase tracking-wider outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all placeholder:text-gray-400"
            />
            <p className="text-[10px] text-gray-400 mt-1.5 ml-1 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-500" /> Matches against official college census records
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary text-xs font-bold py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !rollNumber.trim()}
              className="flex-1 btn btn-primary text-xs font-bold py-3 flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
            >
              {loading ? (
                "Verifying..."
              ) : (
                <>
                  Verify & Issue Pass <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
