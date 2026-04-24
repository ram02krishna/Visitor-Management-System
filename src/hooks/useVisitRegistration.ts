import type React from "react";
import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/auth";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import log from "../lib/logger";

export type UnifiedVisitFormData = {
  name: string;
  email: string;
  phone: string;
  purpose: string;
  visitDate: string;
  validUntil?: string;
  hostEmail: string;
  photo?: FileList;
  idProof?: FileList;
  notes?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  additionalGuests?: number;
  passType: "single_day" | "multi_day";
};

export function useVisitRegistration(formMethods: UseFormReturn<UnifiedVisitFormData>) {
  const { user } = useAuthStore();
  const { setValue, watch, reset } = formMethods;

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewIdProof, setPreviewIdProof] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);

  const userRole = user?.role;
  const isVisitor = userRole === "visitor";
  const isGuardOrAdmin = userRole === "guard" || userRole === "admin";

  const passType = watch("passType");
  const visitorEmail = watch("email");

  useEffect(() => {
    if (qrImageUrl) {
      const el = document.getElementById("generated-pass");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [qrImageUrl]);

  useEffect(() => {
    if (user) {
      if (isVisitor) {
        setValue("name", user.name || "");
        setValue("email", user.email || "");
        setValue("hostEmail", "");
      } else {
        setValue("hostEmail", user.email || "");
      }
    }
  }, [user, isVisitor, setValue]);

  // Check blacklist whenever email changes
  useEffect(() => {
    if (visitorEmail && visitorEmail.includes("@")) {
      const checkBlacklist = async () => {
        const { data } = await supabase
          .from("visitors")
          .select("is_blacklisted, blacklist_reason")
          .eq("email", visitorEmail.trim())
          .maybeSingle();

        if (data?.is_blacklisted) {
          setIsBlacklisted(true);
          setErrorMessage(
            `BLOCKED: This visitor is on the campus blacklist. Reason: ${data.blacklist_reason || "Not specified"}`
          );
        } else {
          setIsBlacklisted(false);
          if (errorMessage.includes("watchlist") || errorMessage.includes("blocked")) setErrorMessage("");
        }
      };
      checkBlacklist();
    }
  }, [visitorEmail, errorMessage, isGuardOrAdmin]);

  
  const handleFilePreview = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadToStorage = async (file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);

    if (uploadError) {
      log.error(`[UnifiedVisit] ${bucket} upload error:`, uploadError);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  };

  const onSubmit = async (formData: UnifiedVisitFormData) => {
    if (isBlacklisted) {
      toast.error("You are blocked and cannot register your visit. Please contact admin or support staff.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setQrImageUrl(null);

    try {
      log.info("[UnifiedVisit] Starting advanced registration for role:", userRole);

      const effectiveHostEmail = isVisitor ? formData.hostEmail : user?.email;
      let approverId = null;
      let approverName = "Campus Administration";

      if (effectiveHostEmail && effectiveHostEmail.trim() !== "") {
        const { data: approver, error: approverError } = await supabase
          .from("hosts")
          .select("id, name")
          .ilike("email", effectiveHostEmail.trim())
          .maybeSingle();

        if (approverError) throw approverError;
        if (!approver) throw new Error(`Approver not found with email: ${effectiveHostEmail}`);
        approverId = approver.id;
        approverName = approver.name;
      }

      // Handle File Uploads
      let photoUrl = null;
      if (formData.photo?.[0]) {
        photoUrl = await uploadToStorage(formData.photo[0], "identification-images");
      }

      let idProofUrl = null;
      if (formData.idProof?.[0]) {
        idProofUrl = await uploadToStorage(formData.idProof[0], "visitor-documents");
      }

      // Create or Update Visitor
      let visitorId;
      const { data: existingVisitor } = await supabase
        .from("visitors")
        .select("id, is_blacklisted")
        .ilike("email", formData.email.trim())
        .limit(1)
        .maybeSingle();

      if (existingVisitor?.is_blacklisted) {
        throw new Error("This user is completely blocked and cannot register any visits.");
      }

      const visitorPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "N/A",
        photo_url: photoUrl || undefined,
        id_proof_url: idProofUrl || undefined,
        updated_at: new Date().toISOString(),
      };

      if (existingVisitor) {
        visitorId = existingVisitor.id;
        await supabase.from("visitors").update(visitorPayload).eq("id", visitorId);
      } else {
        const { data: newVisitor, error: createError } = await supabase
          .from("visitors")
          .insert(visitorPayload)
          .select("id")
          .single();
        if (createError) throw createError;
        visitorId = newVisitor.id;
      }

      // Create Visit
      const visitId = uuidv4();
      const visitDate = formData.visitDate ? new Date(formData.visitDate) : new Date();
      const validUntil = formData.validUntil ? new Date(formData.validUntil) : new Date(visitDate);
      if (formData.passType === "single_day") validUntil.setHours(23, 59, 59);

      const { error: visitError } = await supabase.from("visits").insert({
        id: visitId,
        visitor_id: visitorId,
        host_id: approverId,
        purpose: formData.purpose,
        status: "pending",
        scheduled_time: visitDate.toISOString(),
        valid_until: validUntil.toISOString(),
        valid_from: visitDate.toISOString(),
        expected_out_time: validUntil.toISOString(),
        notes: formData.notes || null,
        vehicle_number: formData.vehicleNumber || null,
        vehicle_type: formData.vehicleType || null,
        additional_guests: Number(formData.additionalGuests) || 0,
        pass_type: formData.passType,
      });

      if (visitError) throw visitError;

      // Enrich QR Data with more details as requested - Shortened keys for better scannability
      const qrData = JSON.stringify({
        vId: visitId,
        n: formData.name,
        e: formData.email,
        p: formData.purpose,
        t: formData.passType,
        d: visitDate.toISOString().split("T")[0],
        u: validUntil.toISOString().split("T")[0],
        v: formData.vehicleNumber || "None",
      });
      const qrUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: "M",
        margin: 3,
        scale: 10,
      });
      setQrImageUrl(qrUrl);

      // Email Notification
      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const emailTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (emailServiceId && emailTemplateId && emailPublicKey) {
        try {
          const emailjs = (await import("@emailjs/browser")).default;
          await emailjs.send(
            emailServiceId,
            emailTemplateId,
            {
              to_name: formData.name,
              to_email: formData.email,
              email: formData.email,
              qr_code: qrUrl,
              visit_id: visitId,
              visit_purpose: formData.purpose,
              host_name: approverName,
              host_email: effectiveHostEmail || "Campus Admin",
              pass_type: formData.passType.replace("_", " "),
            },
            emailPublicKey
          );
        } catch (e) {
          log.error("[UnifiedVisit] Email failed:", e);
        }
      }

      toast.success("Visitor successfully Registered");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to process registration.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    setPreviewPhoto(null);
    setPreviewIdProof(null);
    setQrImageUrl(null);
  };

  return {
    loading,
    errorMessage,
    previewPhoto,
    previewIdProof,
    qrImageUrl,
    isBlacklisted,
    isVisitor,
    isGuardOrAdmin,
    handleFilePreview,
    onSubmit,
    handleReset,
    setPreviewPhoto,
    setPreviewIdProof,
    userRole,
    passType,
  };
}
