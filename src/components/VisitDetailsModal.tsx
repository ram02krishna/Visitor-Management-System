"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"
import { X, Check, Ban, CheckCircle } from "lucide-react"
import QRCode from "qrcode"
import emailjs from "@emailjs/browser"
import { toast } from "react-toastify"

export type Visit = {
  id: string
  visitor_name: string
  host_name: string
  purpose: string
  status: string
  check_in_time?: string
  check_out_time?: string
  created_at: string
  approved_at?: string
  scheduled_time?: string
  visitors?: { name: string; email: string }
  hosts?: { name: string }
  entity_id?: string
}

type VisitDetailsModalProps = {
  status: string
  isOpen: boolean
  onClose: () => void
  userRole?: string
  userId?: string
  visits: Visit[]
  onStatusChange: () => void
  limit: number
  offset: number
  setOffset: (offset: number) => void
  totalVisits: number
}

export function VisitDetailsModal({
  status,
  isOpen,
  onClose,
  userRole,
  userId,
  visits,
  onStatusChange,
  limit,
  offset,
  setOffset,
  totalVisits,
}: VisitDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [currentVisit, setCurrentVisit] = useState<Visit | null>(null)
  const [actionType, setActionType] = useState<"approve" | "deny" | "complete" | null>(null)

  const handleStatusUpdate = async (visit: Visit, newStatus: string) => {
    setLoading(true)
    setCurrentVisit(visit)
    setActionType(
      newStatus === "approved"
        ? "approve"
        : newStatus === "denied"
          ? "deny"
          : newStatus === "completed"
            ? "complete"
            : null,
    )

    try {
      const updates = {
        status: newStatus,
        ...(newStatus === "approved" && {
          approved_at: new Date().toISOString(),
        }),
        ...(newStatus === "completed" && {
          check_out_time: new Date().toISOString(),
        }),
      }

      const { data, error } = await supabase
        .from("visits")
        .update(updates)
        .eq("id", visit.id)
        .select("*, visitors(*)")
        .single()

      if (error) throw error

      if (newStatus === "approved" && data) {
        try {
          const qrData = JSON.stringify({
            visitId: visit.id,
            name: data.visitors?.name,
            email: data.visitors?.email,
            purpose: data.purpose,
          })

          const qrUrl = await QRCode.toDataURL(qrData)

          const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
          const emailTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
          const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

          if (emailServiceId && emailTemplateId && emailPublicKey) {
            await emailjs.send(
              emailServiceId,
              emailTemplateId,
              {
                to_name: data.visitors?.name,
                to_email: data.visitors?.email,
                qr_code: qrUrl,
                visit_id: data.id,
                visit_purpose: data.purpose,
                approved_at: new Date(data.approved_at).toLocaleString(),
              },
              emailPublicKey,
            )
          }
        } catch (emailError) {
          console.error("Failed to send QR code email:", emailError)
        }
      }

      onStatusChange()
      toast.success(`Visit ${newStatus} successfully!`)
    } catch (error) {
      console.error("Error updating visit status:", error)
      toast.error("Failed to update visit status")
    } finally {
      setLoading(false)
      setCurrentVisit(null)
      setActionType(null)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending"
      case "approved":
        return "Approved"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      case "denied":
        return "Denied"
      case "cancelled_denied":
        return "Cancelled/Denied"
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50"
      case "approved":
        return "text-green-600 bg-green-50"
      case "completed":
        return "text-indigo-600 bg-indigo-50"
      case "cancelled":
        return "text-red-600 bg-red-50"
      case "denied":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  const canPerformAction = (visit: Visit) => {
    if (userRole === "admin" || userRole === "guard") {
      return true
    }
    return false
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col m-4 border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b dark:border-slate-800 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
            {getStatusLabel(status)} Visits
            {status !== "cancelled" && status !== "denied" && status !== "cancelled_denied" && " - Today"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-white transition-all"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {visits.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400 dark:text-slate-600" />
              </div>
              <p className="text-lg font-medium text-gray-500 dark:text-slate-400">
                No {getStatusLabel(status).toLowerCase()} visits found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Visitor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Approved
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Check-In
                    </th>
                    {status === "completed" && (
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                        Check-Out
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                  {visits.map((visit) => (
                    <tr
                      key={visit.id}
                      className="hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold">
                            {(visit.visitor_name || visit.visitors?.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {visit.visitor_name || visit.visitors?.name || "Unknown Visitor"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-300 max-w-xs truncate">
                        {visit.purpose}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(visit.status)}`}
                        >
                          {getStatusLabel(visit.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
                        {formatDateTime(visit.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {visit.approved_at ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {formatDateTime(visit.approved_at)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {visit.check_in_time ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {formatDateTime(visit.check_in_time)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">Not Yet</span>
                        )}
                      </td>
                      {status === "completed" && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {visit.check_out_time ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                              {formatDateTime(visit.check_out_time)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">N/A</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {canPerformAction(visit) && (
                          <div className="flex gap-2">
                            {visit.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(visit, "approved")}
                                  disabled={loading && currentVisit?.id === visit.id && actionType === "approve"}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all"
                                >
                                  {loading && currentVisit?.id === visit.id && actionType === "approve" ? (
                                    <span className="animate-spin">↻</span>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(visit, "denied")}
                                  disabled={loading && currentVisit?.id === visit.id && actionType === "deny"}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all"
                                >
                                  {loading && currentVisit?.id === visit.id && actionType === "deny" ? (
                                    <span className="animate-spin">↻</span>
                                  ) : (
                                    <>
                                      <Ban className="w-3 h-3 mr-1" />
                                      Deny
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                            {visit.status === "approved" && visit.check_in_time && (
                              <button
                                onClick={() => handleStatusUpdate(visit, "completed")}
                                disabled={loading && currentVisit?.id === visit.id && actionType === "complete"}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                              >
                                {loading && currentVisit?.id === visit.id && actionType === "complete" ? (
                                  <span className="animate-spin">↻</span>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Complete
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t dark:border-slate-800 p-6 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              Showing {offset + 1} to {Math.min(offset + limit, totalVisits)} of {totalVisits} results
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setOffset(offset - limit)}
              disabled={offset === 0}
              className="px-5 py-2.5 font-semibold bg-white hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border border-gray-300 dark:border-slate-700 shadow-sm transition-all duration-150 hover:shadow-md disabled:hover:shadow-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= totalVisits}
              className="px-5 py-2.5 font-semibold bg-white hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border border-gray-300 dark:border-slate-700 shadow-sm transition-all duration-150 hover:shadow-md disabled:hover:shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
