"use client"

import React from "react"
import { Camera, UserCheck, QrCode } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import QRCode from "qrcode"
import emailjs from "@emailjs/browser"
import { supabase } from "../lib/supabase"

interface RegisterVisitorData {
  name: string
  email: string
  phone: string
  purpose: string
  hostEmail: string
  photo: FileList | null
}

export function RegisterVisitor() {
  const [formData, setFormData] = React.useState<RegisterVisitorData>({
    name: "",
    email: "",
    phone: "",
    purpose: "",
    hostEmail: "",
    photo: null,
  })
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState("")
  const [qrImageUrl, setQrImageUrl] = React.useState<string | null>(null) // State to store QR code image URL

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.target
    if (type === "file" && files) {
      setFormData((prev) => ({ ...prev, photo: files }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[RegisterVisitor] Form submission started")
    console.log("[RegisterVisitor] Form data:", {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      purpose: formData.purpose,
      hostEmail: formData.hostEmail,
      hasPhoto: formData.photo ? formData.photo.length > 0 : false,
    })

    setLoading(true)
    setError("")
    setSuccess(false)
    setQrImageUrl(null)

    try {
      let hostId = null
      let hostName = null

      // 1. Find the host if email is provided
      if (formData.hostEmail) {
        console.log("[RegisterVisitor] Looking up host with email:", formData.hostEmail)
        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("id, name")
          .eq("email", formData.hostEmail)
          .single()

        if (hostError || !hostData) {
          console.error("[RegisterVisitor] Host lookup failed:", hostError)
          throw new Error(`Host not found with email: ${formData.hostEmail}`)
        }
        hostId = hostData.id
        hostName = hostData.name
        console.log("[RegisterVisitor] Host found:", { hostId, hostName })
      }

      // 2. Find or create the visitor
      let visitorId: string
      let photoUrl: string | null = null

      console.log("[RegisterVisitor] Checking for existing visitor with email:", formData.email)
      const { data: existingVisitor, error: visitorLookupError } = await supabase
        .from("visitors")
        .select("id, photo_url")
        .eq("email", formData.email)
        .single()

      if (visitorLookupError && visitorLookupError.code !== "PGRST116") {
        console.error("[RegisterVisitor] Visitor lookup error:", visitorLookupError)
        throw visitorLookupError
      }

      if (existingVisitor) {
        console.log("[RegisterVisitor] Existing visitor found:", existingVisitor.id)
        visitorId = existingVisitor.id
        photoUrl = existingVisitor.photo_url
      } else {
        console.log("[RegisterVisitor] Creating new visitor...")
        if (formData.photo && formData.photo.length > 0) {
          console.log("[RegisterVisitor] Uploading visitor photo...")
          const file = formData.photo[0]
          const fileExt = file.name.split(".").pop()
          const fileName = `${uuidv4()}.${fileExt}`
          const filePath = `visitor_photos/${fileName}`

          const { error: uploadError } = await supabase.storage.from("visitor-photos").upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

          if (uploadError) {
            console.warn("[RegisterVisitor] Photo upload error:", uploadError)
          } else {
            photoUrl = supabase.storage.from("visitor-photos").getPublicUrl(filePath).data?.publicUrl || null
            console.log("[RegisterVisitor] Photo uploaded successfully")
          }
        }

        const { data: newVisitor, error: newVisitorError } = await supabase
          .from("visitors")
          .insert({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            photo_url: photoUrl,
          })
          .select("id")
          .single()

        if (newVisitorError) {
          console.error("[RegisterVisitor] New visitor creation error:", newVisitorError)
          throw newVisitorError
        }
        visitorId = newVisitor.id
        console.log("[RegisterVisitor] New visitor created:", visitorId)
      }

      if (existingVisitor && formData.photo && formData.photo.length > 0) {
        const file = formData.photo[0]
        const fileExt = file.name.split(".").pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const filePath = `visitor_photos/${fileName}`

        const { error: uploadError } = await supabase.storage.from("visitor-photos").upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

        if (uploadError) {
          console.warn("Error uploading new photo for existing visitor:", uploadError)
        } else {
          const newPhotoUrl = supabase.storage.from("visitor-photos").getPublicUrl(filePath).data?.publicUrl || null
          const { error: updatePhotoError } = await supabase
            .from("visitors")
            .update({ photo_url: newPhotoUrl })
            .eq("id", visitorId)
          if (updatePhotoError) console.error("Error updating visitor photo URL:", updatePhotoError)
          photoUrl = newPhotoUrl
        }
      }

      const validUntilDate = new Date()
      validUntilDate.setHours(23, 59, 59, 999)

      // 3. Create the visit record
      const visitId = uuidv4()
      console.log("[RegisterVisitor] Creating visit record with ID:", visitId)
      const visitDataToInsert = {
        id: visitId,
        visitor_id: visitorId,
        host_id: hostId,
        purpose: formData.purpose,
        status: "approved", // Guard registers visitor directly, so status is 'approved'
        valid_until: validUntilDate.toISOString(),
      }
      const { error: visitError } = await supabase.from("visits").insert(visitDataToInsert)

      if (visitError) {
        console.error("[RegisterVisitor] Visit creation error:", visitError)
        throw visitError
      }
      console.log("[RegisterVisitor] Visit record created successfully")

      // 4. Generate QR code
      console.log("[RegisterVisitor] Generating QR code...")
      const qrGeneratedUrl = await QRCode.toDataURL(
        JSON.stringify({
          visitId,
          name: formData.name,
          email: formData.email,
          purpose: formData.purpose,
          validUntil: validUntilDate.toISOString(),
          hostName: hostName,
        }),
      )
      setQrImageUrl(qrGeneratedUrl)
      console.log("[RegisterVisitor] QR code generated successfully")

      // 5. Send email with QR code
      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
      const emailTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

      if (!emailServiceId || !emailTemplateId || !emailPublicKey) {
        console.warn("[RegisterVisitor] EmailJS credentials not configured. Skipping email notification.")
      } else {
        console.log("[RegisterVisitor] Sending email to:", formData.email)
        const emailResult = await emailjs.send(
          emailServiceId,
          emailTemplateId,
          {
            to_name: formData.name,
            to_email: formData.email,
            qr_code: qrGeneratedUrl,
            visit_id: visitId,
            visit_purpose: formData.purpose,
            host_name: hostName,
            valid_until: validUntilDate.toLocaleString(),
          },
          emailPublicKey,
        )

        console.log("[RegisterVisitor] Email send result:", emailResult)
        if (emailResult.status !== 200) {
          console.warn("[RegisterVisitor] Email sending failed with status:", emailResult.status)
        } else {
          console.log("[RegisterVisitor] Email sent successfully")
        }
      }

      console.log("[RegisterVisitor] Registration completed successfully")
      setSuccess(true)
      setFormData({
        name: "",
        email: "",
        phone: "",
        purpose: "",
        hostEmail: "",
        photo: null,
      })
    } catch (err: unknown) {
      console.error("[RegisterVisitor] Registration error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to register visitor. Please try again."
      console.error("[RegisterVisitor] Error message:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
      console.log("[RegisterVisitor] Form submission completed")
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
              <UserCheck className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Register New Visitor</h1>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
            Please fill in the visitor's details and take their photo for security purposes.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-900 shadow sm:rounded-lg">
          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
            {success && (
              <div className="rounded-md bg-green-50 p-4 mb-4 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Visitor registration successful! An email with QR code has been sent to the visitor.
                    </p>
                  </div>
                </div>

                {qrImageUrl && (
                  <div className="mt-4 flex justify-center">
                    <div className="p-4 bg-white dark:bg-slate-800 border-2 border-green-200 dark:border-green-800 rounded-xl shadow-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <QrCode className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <p className="text-sm font-semibold text-green-800 dark:text-green-200">Visitor QR Code</p>
                      </div>
                      <img
                        src={qrImageUrl || "/placeholder.svg"}
                        alt="Visitor QR Code"
                        className="w-40 h-40 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 001.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Full name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone number
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Purpose of visit
                </label>
                <input
                  type="text"
                  name="purpose"
                  id="purpose"
                  required
                  value={formData.purpose}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="hostEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Host email (optional)
                </label>
                <input
                  type="email"
                  name="hostEmail"
                  id="hostEmail"
                  value={formData.hostEmail}
                  onChange={handleChange}
                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Enter the email of the host associated with this visit (optional)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Visitor Photo</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-slate-600">
                <div className="space-y-1 text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-slate-400">
                    <label
                      htmlFor="photo"
                      className="relative cursor-pointer bg-white dark:bg-slate-900 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                    >
                      <span>Take photo</span>
                      <input
                        id="photo"
                        name="photo"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleChange}
                      />
                    </label>
                    {formData.photo && formData.photo.length > 0 && (
                      <span className="ml-2 text-gray-900 dark:text-slate-100">{formData.photo[0].name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <UserCheck className="h-4 w-4" strokeWidth={2.5} />
                {loading ? "Registering..." : "Register Visitor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
