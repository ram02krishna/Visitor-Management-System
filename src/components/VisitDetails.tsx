import { Visit } from "../lib/database.types";

interface VisitDetailsProps {
  visit: Visit;
  onClose: () => void;
}

export function VisitDetails({ visit, onClose }: VisitDetailsProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-lg">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold">Visit Details</h2>
        </div>
        <div className="p-4">
          <p>
            <strong>Visitor:</strong> {visit.visitor.name}
          </p>
          <p>
            <strong>Purpose:</strong> {visit.purpose}
          </p>
          <p>
            <strong>Check-in Time:</strong> {new Date(visit.check_in_time).toLocaleString()}
          </p>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
