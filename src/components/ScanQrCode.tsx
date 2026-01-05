"use client";

import { Camera, User, Calendar, Clock, AlertTriangle, CheckCircle, LogIn } from "lucide-react";
import { useScanQrCode } from "../hooks/useScanQrCode";
import { StatusIndicator } from "./StatusIndicator";

export default function ScanQrCode() {
  const { state, handleScanAnother } = useScanQrCode();
  const { visit, loading, error, isAuthenticated, checkingAuth, scannerReady } = state;

  if (checkingAuth) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <StatusIndicator isLoading={true} error={null} loadingMessage="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg">
                <Camera className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan QR Code</h1>
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <LogIn className="h-16 w-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
              Authentication Required
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-6">
              You must be logged in to scan QR codes
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              <LogIn className="h-5 w-5" />
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg">
              <Camera className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scan QR Code</h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            Scan a visitor's QR code to check them in.
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-2xl mx-auto">
        {!visit && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4">
            <div id="qr-reader" style={{ width: "100%" }}></div>
            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              {scannerReady ? "Position the QR code within the frame" : "Initializing camera..."}
            </p>
          </div>
        )}

        <StatusIndicator isLoading={loading} error={error && !visit ? error : null} loadingMessage="Verifying visit..." />

        {visit && (
          <div className="mt-8 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-6 border-2 border-green-500">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {error ? "Already Checked In" : "Successfully Checked In!"}
              </h2>
            </div>

            {error && (
              <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {visit.visitors.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {visit.visitors.email}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {visit.visitors.phone}
                  </p>
                  {visit.visitors.company && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {visit.visitors.company}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Purpose</p>
                  <p className="text-gray-900 dark:text-white">{visit.purpose}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Check-in Time</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(visit.check_in_time!).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Host</p>
                  <p className="text-gray-900 dark:text-white">{visit.hosts.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {visit.hosts.email}
                  </p>
                </div>
              </div>

              {visit.valid_until && (
                <div className="flex items-start gap-4">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Valid Until</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(visit.valid_until).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleScanAnother}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Scan Another QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}