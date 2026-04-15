import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function BackButton({ to = '/app/dashboard', className = "mb-6 flex items-center gap-3" }: { to?: string | number, className?: string }) {
  const navigate = useNavigate();

  return (
    <div className={className}>
      <button
        onClick={() => {
          if (typeof to === 'number') navigate(to);
          else navigate(to);
        }}
        className="p-2 text-gray-500 hover:text-gray-900 bg-white dark:bg-slate-800 dark:text-gray-400 dark:hover:text-white rounded-full shadow-sm border border-gray-200 dark:border-slate-700 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">Back</span>
    </div>
  );
}
