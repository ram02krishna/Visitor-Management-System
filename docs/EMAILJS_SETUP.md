# EmailJS Setup Guide

This guide will walk you through setting up EmailJS for automated visitor email notifications with QR codes. The system uses three distinct templates to keep visitors informed throughout their visit lifecycle.

## 📋 Prerequisites

- An email account (Gmail, Outlook, Yahoo, etc.)
- 5-10 minutes of setup time


## 🚀 Step-by-Step Setup

### Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up"** and complete registration.

### Step 2: Add Email Service

1. Go to **"Email Services"** -> **"Add New Service"**.
2. Connect your provider (e.g., Gmail).
3. **Copy your Service ID** (e.g., `service_abc123`). You'll need this for `VITE_EMAILJS_SERVICE_ID`.

### Step 3: Create The Three Required Templates

You need to create three templates in the **"Email Templates"** section.

---

#### 1. Visit Request Received (Registration Confirmation)
*Used when a visitor first submits a request.*

- **Template Name**: `Visit Request Received`
- **Subject**: `Visit Request Received | Ref: {{visit_id}}`
- **Template Variables**:
  - `{{to_name}}`: Visitor Name
  - `{{visit_id}}`: Unique ID
  - `{{visit_purpose}}`: Purpose
  - `{{host_name}}`: Host Name
  - `{{host_email}}`: Host Email
  - `{{pass_type}}`: Single/Multi Day
  - `{{qr_code}}`: The generated QR image

---

#### 2. Visit Approved Template
*Used when a host or admin approves a pending request.*

- **Template Name**: `Visit Approved`
- **Subject**: `Your Visit is Approved! | Ref: {{visit_id}}`
- **Template Variables**:
  - `{{to_name}}`: Visitor Name
  - `{{visit_id}}`: Unique ID
  - `{{visit_purpose}}`: Purpose
  - `{{host_name}}`: Host Name
  - `{{approved_by}}`: Name of Approver
  - `{{qr_code}}`: The active QR image
  - `{{status_approved}}`: Boolean (true)

---

#### 3. Visit Denied Template
*Used when a request is declined.*

- **Template Name**: `Visit Denied`
- **Subject**: `Visit Request Not Approved | Ref: {{visit_id}}`
- **Template Variables**:
  - `{{to_name}}`: Visitor Name
  - `{{visit_id}}`: Unique ID
  - `{{visit_purpose}}`: Purpose
  - `{{host_name}}`: Host Name
  - `{{denied_by}}`: Name of Denier
  - `{{status_approved}}`: Boolean (false)

---

### Step 4: Get Your Public Key

1. Go to **"Account"** → **"General"**.
2. Copy your **Public Key** (e.g., `AbC123XyZ456`). This goes into `VITE_EMAILJS_PUBLIC_KEY`.

### Step 5: Update Your .env File

Ensure your `.env` file contains all the following keys:

```env
# EMAILJS CONFIGURATION
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxx

# Template for initial registration
VITE_EMAILJS_TEMPLATE_ID=template_confirm_id

# Template for approval
VITE_EMAILJS_APPROVAL_TEMPLATE_ID=template_approve_id

# Template for denial
VITE_EMAILJS_DENIAL_TEMPLATE_ID=template_deny_id
```

## ✅ Verification

1. **Test Registration**: Submit a visit request. You should receive the "Request Received" email.
2. **Test Approval**: Log in as a Host/Admin, go to Dashboard/Logs, and Approve the visit. You should receive the "Approved" email with the QR code.
3. **Test Denial**: Submit another request and Deny it. You should receive the "Denied" email.

## 🐛 Troubleshooting

- **QR Code not appearing?** Ensure your template has `<img src="{{qr_code}}" ... />` in the HTML view (not just the text editor).
- **Emails going to Spam?** This is common with new EmailJS accounts. Mark as "Not Spam" to train your provider.
- **Quota?** The free tier allows 200 emails per month. Check your dashboard for usage.

---
*Happy Setup! If you encounter issues, refer to the [official EmailJS docs](https://www.emailjs.com/docs/).*
