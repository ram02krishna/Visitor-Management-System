import { AlertCircle } from "lucide-react";

interface StatusIndicatorProps {
  isLoading: boolean;
  error: string | null;
  loadingMessage?: string;
  className?: string;
}

export function StatusIndicator({
  isLoading,
  error,
  loadingMessage = "Loading...",
  className = "",
}: StatusIndicatorProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        <span className="ml-2">{loadingMessage}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg ${className}`}
      >
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return null;
}
