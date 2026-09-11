import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 shadow-xs border border-gray-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-950/40 rounded-2xl">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="mt-4 text-lg font-black text-center text-gray-900 dark:text-white">
              Something went wrong
            </h1>
            <p className="mt-2 text-xs text-center text-gray-500 dark:text-slate-400 leading-relaxed">
              We're sorry, but an unexpected error occurred. Please refresh the page or return to the home screen.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-800 dark:text-red-300 overflow-auto">
                <p className="font-bold">Error Details:</p>
                <p className="mt-1 font-mono text-[11px]">{this.state.error.message}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full btn-primary !py-2.5 !rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
