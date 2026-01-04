"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"
import { X, Check, Ban, CheckCircle, ClipboardList, LogIn, LogOut, Info } from "lucide-react"
import QRCode from "qrcode"
import emailjs from "@emailjs/browser"
import { toast } from "react-toastify"
import type { Visit, Database } from "../lib/database.types"

type VisitDetailsModalProps = {
  isOpen: boolean
  onClose: () => void
  userRole?: string
  userId?: string
  visit: Visit & { visitors?: Database["public"]["Tables"]["visitors"]["Row"] }
  onStatusChange: () => void
}

export function VisitDetailsModal({
  isOpen,
  onClose,
  userRole,
  userId,
  visit,
  onStatusChange,
}: VisitDetailsModalProps) {
  const [loading, setLoading] = useState(false)

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true)

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
        .select("*, visitor:visitors(*)")
        .single()

      if (error) throw error

      if (newStatus === "approved" && data) {
        try {
          const qrData = JSON.stringify({
            visitId: visit.id,
            name: data.visitor?.name,
            email: data.visitor?.email,
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
                to_name: data.visitor?.name,
                to_email: data.visitor?.email,
                qr_code: qrUrl,
                visit_id: data.id,
                visit_purpose: data.purpose,
                approved_at: data.approved_at ? new Date(data.approved_at).toLocaleString() : "N/A",
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
      case "checked-in":
        return "text-blue-600 bg-blue-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  const canPerformAction = () => {
    if (userRole === "admin" || userRole === "guard") {
      return true
    }
    return false
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col m-4 border border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b dark:border-slate-800 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-600 animate-pulse"></span>
            Visit Details
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
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {visit.visitor_name || visit.visitors?.name || "Unknown Visitor"}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {visit.visitors?.email || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ClipboardList className="h-5 w-5 text-gray-500" />
              <p className="text-gray-700 dark:text-slate-300">Purpose: {visit.purpose}</p>
            </div>
            <div className="flex items-center gap-4">
              <Clock className="h-5 w-5 text-gray-500" />
              <p className="text-gray-700 dark:text-slate-300">Requested: {formatDateTime(visit.created_at)}</p>
            </div>
            {visit.approved_at && (
              <div className="flex items-center gap-4">
                <CheckCircle className="h-5 w-5 text-gray-500" />
                <p className="text-gray-700 dark:text-slate-300">Approved: {formatDateTime(visit.approved_at)}</p>
              </div>
            )}
            {visit.check_in_time && (
              <div className="flex items-center gap-4">
                <LogIn className="h-5 w-5 text-gray-500" />
                <p className="text-gray-700 dark:text-slate-300">Check-in: {formatDateTime(visit.check_in_time)}</p>
              </div>
            )}
            {visit.check_out_time && (
              <div className="flex items-center gap-4">
                <LogOut className="h-5 w-5 text-gray-500" />
                <p className="text-gray-700 dark:text-slate-300">Check-out: {formatDateTime(visit.check_out_time)}</p>
              </div>
            )}
            <div className="flex items-center gap-4">
              <Info className="h-5 w-5 text-gray-500" />
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(visit.status)}`}>
                {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {canPerformAction() && (
          <div className="border-t dark:border-slate-800 p-6 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900">
            {visit.status === "pending" && (
              <>
                <button
                  onClick={() => handleStatusUpdate("approved")}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {loading ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => handleStatusUpdate("denied")}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  {loading ? "Denying..." : "Deny"}
                </button>
              </>
            )}
            {visit.status === "checked-in" && (
              <button
                onClick={() => handleStatusUpdate("completed")}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? "Completing..." : "Complete Visit"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
