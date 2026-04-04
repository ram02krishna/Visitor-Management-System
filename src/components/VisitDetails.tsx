import { createPortal } from "react-dom";
import { X, Calendar, Clock, User, CheckCircle2 } from "lucide-react";
import { Visit } from "../lib/database.types";
import { formatIST } from "../lib/dateIST";

interface VisitDetailsProps {
  visit: Visit;
  onClose: () => void;
}

export function VisitDetails({ visit, onClose }: VisitDetailsProps) {
  // Safe date formatter that prevents the "1/1/1970" issue
  const formatDate = (dateString?: string | null) => {
    return formatIST(dateString);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 mb-safe">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transform transition-all animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Visit Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 py-5 overflow-y-auto">
          <div className="space-y-6">

            {/* Visitor Info */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-inner">
                {(visit.visitor?.name || "U")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Visitor Name</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {visit.visitor?.name || "Unknown"}
                </p>
              </div>
            </div>

            {/* Visit Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Purpose</span>
                </div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{visit.purpose || "N/A"}</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-slate-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Status</span>
                </div>
                <div className="inline-flex items-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize
                    ${visit.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      visit.status === 'checked-in' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' :
                        visit.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          visit.status === 'denied' || visit.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}
                  >
                    {visit.status === 'checked-in' ? 'Ongoing' : visit.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-gray-50 dark:bg-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Timeline</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Created:</span>
                  <span className="font-medium text-gray-900 dark:text-slate-200">
                    {formatDate(visit.created_at)}
                  </span>
                </div>

                {visit.status !== "pending" && visit.status !== "denied" && visit.status !== "cancelled" && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Check-In:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-200">
                      {formatDate(visit.check_in_time)}
                    </span>
                  </div>
                )}

                {visit.status === "completed" && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Check-Out:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-200">
                      {formatDate(visit.check_out_time)}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm transition-all hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
