# EmailJS Setup Guide

This guide will walk you through setting up EmailJS for automated visitor email notifications with QR codes.

## 📋 Prerequisites

- An email account (Gmail, Outlook, Yahoo, etc.)
- 5-10 minutes of setup time


## 🚀 Step-by-Step Setup

### Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up"** (top right)
3. Choose **"Sign up with Google"** or use email
4. Verify your email address
5. Complete registration

### Step 2: Add Email Service

1. After logging in, go to **"Email Services"** in the left sidebar
2. Click **"Add New Service"**
3. Choose your email provider:
   - **Gmail** (recommended for testing)
   - Outlook
   - Yahoo
   - Custom SMTP
4. Click **"Connect Account"**

#### For Gmail:
1. Click **"Connect Account"**
2. Sign in with your Google account
3. Grant EmailJS permission to send emails
4. Click **"Create Service"**
5. **Copy your Service ID** (e.g., `service_abc1234`)
   - Save this - you'll need it for `.env`

#### For Other Providers:
1. Follow the provider-specific instructions
2. You may need to enable "Less secure app access" or create an app password
3. **Copy your Service ID**

### Step 3: Create Email Template

1. Go to **"Email Templates"** in the left sidebar
2. Click **"Create New Template"**
3. **Template Name**: "Visit Request Received | Awaiting Approval "
4. **Template Content**: Copy and paste this HTML:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Visit Pending Approval</title>
</head>

<body style="margin:0; padding:0; background-color:#f0f2f7; font-family: Georgia, 'Times New Roman', serif;">

  <!-- OUTER WRAPPER -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f7; padding: 28px 0;">
    <tr>
      <td align="center">

        <!-- EMAIL WIDTH CONTAINER -->
        <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px; width:100%;">

          <!-- STATUS BADGE -->
          <tr>
            <td style="padding-bottom: 14px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>

                  <td style="
                    background-color:#fff8e6;
                    border:1.5px solid #f5c842;
                    border-radius:10px;
                    padding:12px 18px;
                    font-family:Arial, Helvetica, sans-serif;
                    font-size:13px;
                    font-weight:bold;
                    color:#7c5c0a;
                  ">

                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>

                        <td style="padding-right:10px; vertical-align:middle;">
                          <div style="
                            width:10px;
                            height:10px;
                            border-radius:50%;
                            background-color:#f5c842;
                            border:3px solid rgba(245,200,66,0.35);
                          "></div>
                        </td>

                        <td style="
                          vertical-align:middle;
                          font-family:Arial, Helvetica, sans-serif;
                          font-size:13px;
                          color:#7c5c0a;
                          font-weight:bold;
                        ">
                          Visit Request Submitted — Awaiting Host Approval
                        </td>

                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- MAIN CARD -->
          <tr>
            <td style="
              background-color:#ffffff;
              border-radius:18px;
              overflow:hidden;
              box-shadow:0 4px 24px rgba(0,0,0,0.07);
            ">

              <!-- HEADER -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>

                  <td style="
                    background:linear-gradient(135deg,#1e3a8a 0%,#1e40af 60%,#2563eb 100%);
                    padding:36px 28px 30px;
                    text-align:center;
                    border-radius:18px 18px 0 0;
                  ">

                    <div style="font-size:44px; margin-bottom:12px;">🕐</div>

                    <div style="
                      font-family:Arial, Helvetica, sans-serif;
                      font-size:22px;
                      font-weight:bold;
                      color:#ffffff;
                      margin-bottom:6px;
                      letter-spacing:-0.3px;
                    ">
                      Visit Pending Approval
                    </div>

                    <div style="
                      font-family:Arial, Helvetica, sans-serif;
                      font-size:13px;
                      color:rgba(255,255,255,0.78);
                    ">
                      Campus Visitor Management System
                    </div>

                  </td>

                </tr>
              </table>


              <!-- BODY -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>

                  <td style="padding:30px 28px;">

                    <!-- GREETING -->
                    <p style="
                      font-family:Arial, Helvetica, sans-serif;
                      font-size:16px;
                      color:#1a1f36;
                      margin:0 0 10px 0;
                    ">
                      Dear <strong>{{to_name}}</strong>,
                    </p>

                    <p style="
                      font-family:Arial, Helvetica, sans-serif;
                      font-size:14px;
                      color:#4a5578;
                      margin:0 0 26px 0;
                      line-height:1.7;
                    ">
                      Your campus visit request has been successfully submitted and is now awaiting approval from your host. You'll receive a follow-up email once a decision has been made.
                    </p>


                    <!-- PENDING NOTICE -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
                      <tr>

                        <td style="
                          background-color:#fffbeb;
                          border:1.5px solid #fcd34d;
                          border-radius:14px;
                          padding:18px 20px;
                        ">

                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>

                              <td style="width:36px; vertical-align:top; padding-top:2px;">
                                <span style="font-size:24px;">⏳</span>
                              </td>

                              <td style="vertical-align:top; padding-left:12px;">

                                <div style="
                                  font-family:Arial, Helvetica, sans-serif;
                                  font-size:15px;
                                  font-weight:bold;
                                  color:#92400e;
                                  margin-bottom:6px;
                                ">
                                  Approval Required
                                </div>

                                <div style="
                                  font-family:Arial, Helvetica, sans-serif;
                                  font-size:13px;
                                  color:#78350f;
                                  line-height:1.65;
                                ">
                                  Your visit is <strong>not yet confirmed</strong>. Access to campus will only be granted after your host approves the request. Please do not proceed to campus until you receive an approval email.
                                </div>

                              </td>

                            </tr>
                          </table>

                        </td>

                      </tr>
                    </table>


                    <!-- WHAT HAPPENS NEXT -->
                    <div style="
                      font-family:Arial, Helvetica, sans-serif;
                      font-size:12px;
                      font-weight:bold;
                      text-transform:uppercase;
                      letter-spacing:0.08em;
                      color:#6b7280;
                      margin-bottom:12px;
                    ">
                      What Happens Next
                    </div>


                    <!-- STEP 1 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                      <tr>
                        <td style="background-color:#f8f9fd; border-radius:12px; padding:14px 16px;">

                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>

                              <td style="width:32px; vertical-align:top; font-size:20px; padding-top:2px;">📧</td>

                              <td style="vertical-align:top; padding-left:12px;">
                                <div style="
                                  font-family:Arial, Helvetica, sans-serif;
                                  font-size:13.5px;
                                  font-weight:bold;
                                  color:#1a1f36;
                                  margin-bottom:4px;
                                ">
                                  You'll receive a decision email
                                </div>

                                <div style="
                                  font-family:Arial, Helvetica, sans-serif;
                                  font-size:13px;
                                  color:#6b7280;
                                  line-height:1.5;
                                ">
                                  Your host will approve or decline your visit. You'll be notified by email either way — usually within a few hours.
                                </div>
                              </td>

                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>


                    <!-- STEP 2 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                      <tr>
                        <td style="background-color:#f8f9fd; border-radius:12px; padding:14px 16px;">

                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>

                              <td style="width:32px; vertical-align:top; font-size:20px; padding-top:2px;">✅</td>

                              <td style="vertical-align:top; padding-left:12px;">
                                <div style="
                                  font-family:Arial, Helvetica, sans-serif;
                                  font-size:13.5px;
                                  font-weight:bold;
                                  color:#1a1f36;
                                  margin-bottom:4px;
                                ">
                                  If approved — use the QR code below
                                </div>

                                <div style="
                                  font-family:Arial, Helvetica, sans-serif;
                                  font-size:13px;
                                  color:#6b7280;
                                  line-height:1.5;
                                ">
                                  Once approved, the QR code in this email becomes active. Save this email and show it at the security desk on the day of your visit.
                                </div>
                              </td>

                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>


                    <!-- STEP 3 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
                      <tr>
                        <td style="background-color:#f8f9fd; border-radius:12px; padding:14px 16px;">

                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>

                              <td style="width:32px; vertical-align:top; font-size:20px; padding-top:2px;">❌</td>

                              <td style="vertical-align:top; padding-left:12px;">
                                <div style="
                                  font-family:Arial, Helvetica, sans-serif;
                                  font-size:13.5px;
                                  font-weight:bold;
                                  color:#1a1f36;
                                  margin-bottom:4px;
                                ">
                                  If declined — you'll be informed
                                </div>

                                <div style="
                                  font-family:Arial, Helvetica, sans-serif;
                                  font-size:13px;
                                  color:#6b7280;
                                  line-height:1.5;
                                ">
                                  You'll receive a reason where available. You may contact your host directly to reschedule.
                                </div>
                              </td>

                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>


                    <!-- VISIT DETAILS + QR + FOOTER remain unchanged -->

                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
\`\`\`

5. **Subject Line**: Enter this:
   \`\`\`
   Visit Request Received | Awaiting Approval | Ref: {{visit_id}}
   \`\`\`

6. **Template Variables** - Verify these are detected:
   - `{{to_name}}`           Visitor's full name
   - `{{visit_id}}`          Unique visit reference ID
   - `{{visit_purpose}}`     Purpose of the visit   
   - `{{host_name}}`         Name of the host
   - `{{qr_code}}`           URL of the QR code image

7. Click **"Save"**
8. **Copy your Template ID** (e.g., `template_xyz5678`)
   - Save this - you'll need it for `.env`

### Step 4: Get Your Public Key

1. Click on your **account name** (top right)
2. Go to **"Account"** → **"General"**
3. Find **"Public Key"** section
4. **Copy your Public Key** (e.g., `AbC123XyZ456`)
   - Save this - you'll need it for `.env`

### Step 5: Test Your Template (Optional but Recommended)

1. Go back to **"Email Templates"**
2. Click on your template
3. Click **"Test It"** button
4. Fill in test values:
   - `to_name`: Your Name
   - `visit_id`: TEST-123
   - `visit_purpose`: Meeting
   - `host_name`: John Doe
   - `qr_code`: Use this test QR: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TEST`
5. Enter your email address
6. Click **"Send Test Email"**
7. Check your inbox - you should receive the email!


### Similarly follow all these steps for the Visitor approval and Visitor denial
### Here are the codes for the templates of both Visitor approval ad Visitor denial respectively

### Visitor Approval Template
\`\`\`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Visit is Approved!</title>
</head>
<body style="margin:0; padding:0; background-color:#f0f2f7; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:#1a1f36;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f7; padding:28px 16px;">
  <tr>
    <td align="center">
      <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px; width:100%;">

        <!-- Status Badge -->
        <tr>
          <td style="padding-bottom:14px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf5; border:1.5px solid #34d399; border-radius:10px;">
              <tr>
                <td style="padding:12px 18px; font-size:13.5px; font-weight:500; color:#065f46;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-right:10px;">
                        <div style="width:10px; height:10px; border-radius:50%; background-color:#10b981; display:inline-block;"></div>
                      </td>
                      <td style="font-size:13.5px; font-weight:600; color:#065f46;">
                        Visit Approved — Your QR Code is Now Active
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Card -->
        <tr>
          <td style="background-color:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.07);">

            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:linear-gradient(135deg, #065f46 0%, #059669 55%, #10b981 100%); padding:36px 28px 32px;">
                  <div style="font-size:48px; line-height:1; margin-bottom:14px;">&#9989;</div>
                  <h1 style="margin:0 0 6px 0; font-size:23px; font-weight:700; color:#ffffff; letter-spacing:-0.3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Your Visit is Approved!</h1>
                  <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.75); font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Campus Visitor Management System</p>
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:30px 28px;">

                  <!-- Greeting -->
                  <p style="margin:0 0 10px 0; font-size:16px; color:#1a1f36; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Dear <strong>{{to_name}}</strong>,</p>
                  <p style="margin:0 0 26px 0; font-size:14.5px; color:#4a5578; line-height:1.7; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    Great news! Your campus visit has been reviewed and approved by your host. Your QR code is now active and ready to scan on the day of your visit.
                  </p>

                  <!-- Success Notice -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg, #ecfdf5, #d1fae5); border:1.5px solid #6ee7b7; border-radius:14px; margin-bottom:26px;">
                    <tr>
                      <td style="padding:20px 22px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="40" valign="top" style="font-size:26px; padding-right:14px; padding-top:2px;">&#127881;</td>
                            <td>
                              <p style="margin:0 0 6px 0; font-size:15px; font-weight:700; color:#065f46; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Visit Confirmed</p>
                              <p style="margin:0; font-size:13.5px; color:#047857; line-height:1.65; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Your access has been granted. Please show the QR code below at the security desk upon arrival to complete your check-in.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- QR Section -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4; border:1.5px solid #6ee7b7; border-radius:14px; margin-bottom:26px;">
                    <tr>
                      <td align="center" style="padding:26px 24px;">
                        <div style="display:inline-block; background-color:#10b981; color:#ffffff; font-size:12px; font-weight:700; padding:5px 14px; border-radius:20px; margin-bottom:14px; letter-spacing:0.03em;">&#10003; ACTIVE &nbsp;&middot;&nbsp; READY TO SCAN</div>
                        <h3 style="margin:0 0 18px 0; font-size:15px; font-weight:700; color:#065f46; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Your Visit QR Code</h3>
                        <div style="display:inline-block; background-color:#ffffff; border-radius:16px; padding:12px; box-shadow:0 6px 24px rgba(16,185,129,0.2);">
                          <img src="{{qr_code}}" alt="Visit QR Code" width="170" height="170" style="display:block; border-radius:8px;">
                        </div>
                        <p style="margin:14px 0 0 0; font-size:12.5px; color:#047857; line-height:1.6; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
                          Show this at the security desk on arrival.<br>
                          <strong>Screenshot or save this email before you visit.</strong>
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;">
                    <tr>
                      <td style="height:1px; background-color:#e9eaf0; font-size:0; line-height:0;">&nbsp;</td>
                    </tr>
                  </table>

                  <!-- Visit Details -->
                  <p style="margin:0 0 14px 0; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Visit Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; overflow:hidden;">
                    <tr style="border-bottom:1px solid #eef0f6;">
                      <td style="padding:13px 18px; border-bottom:1px solid #eef0f6;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Visit ID</td>
                            <td style="font-size:13.5px; color:#1a1f36; font-weight:500; font-family:'Courier New', Courier, monospace;">{{visit_id}}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 18px; border-bottom:1px solid #eef0f6;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Purpose</td>
                            <td style="font-size:13.5px; color:#1a1f36; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">{{visit_purpose}}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 18px; border-bottom:1px solid #eef0f6;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Host</td>
                            <td style="font-size:13.5px; color:#1a1f36; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">{{host_name}}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 18px; border-bottom:1px solid #eef0f6;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Approved By</td>
                            <td style="font-size:13.5px; color:#1a1f36; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">{{approved_by}}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 18px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Status</td>
                            <td style="font-size:13.5px; color:#059669; font-weight:700; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">&#9989; Approved</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Instructions -->
                  <p style="margin:26px 0 14px 0; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">On Arrival</p>

                  <!-- Step 1 -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="top" style="padding-right:14px; padding-top:3px;">
                              <div style="width:26px; height:26px; border-radius:50%; background-color:#10b981; color:#ffffff; font-size:13px; font-weight:700; text-align:center; line-height:26px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">1</div>
                            </td>
                            <td style="font-size:13.5px; color:#374151; line-height:1.5; padding-top:3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Show this QR code at the reception or security desk</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 2 -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="top" style="padding-right:14px; padding-top:3px;">
                              <div style="width:26px; height:26px; border-radius:50%; background-color:#10b981; color:#ffffff; font-size:13px; font-weight:700; text-align:center; line-height:26px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">2</div>
                            </td>
                            <td style="font-size:13.5px; color:#374151; line-height:1.5; padding-top:3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Wait for verification and collect your visitor badge</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 3 -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="top" style="padding-right:14px; padding-top:3px;">
                              <div style="width:26px; height:26px; border-radius:50%; background-color:#10b981; color:#ffffff; font-size:13px; font-weight:700; text-align:center; line-height:26px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">3</div>
                            </td>
                            <td style="font-size:13.5px; color:#374151; line-height:1.5; padding-top:3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Your host <strong>{{host_name}}</strong> will be notified and meet you at reception</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 4 -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; margin-bottom:20px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="top" style="padding-right:14px; padding-top:3px;">
                              <div style="width:26px; height:26px; border-radius:50%; background-color:#10b981; color:#ffffff; font-size:13px; font-weight:700; text-align:center; line-height:26px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">4</div>
                            </td>
                            <td style="font-size:13.5px; color:#374151; line-height:1.5; padding-top:3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Return your visitor badge at the desk before leaving campus</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Tip Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb; border-left:4px solid #f59e0b; border-radius:10px;">
                    <tr>
                      <td style="padding:16px 18px;">
                        <p style="margin:0 0 5px 0; font-size:13.5px; font-weight:700; color:#b45309; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">&#128241; Pro Tip</p>
                        <p style="margin:0; font-size:13px; color:#78350f; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Screenshot the QR code or keep this email accessible offline — mobile connectivity on campus may vary.</p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-top:1px solid #e9eaf0;">
              <tr>
                <td align="center" style="padding:22px 28px;">
                  <p style="margin:0; font-size:12.5px; color:#94a3b8; line-height:1.7; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;"><strong style="color:#64748b;">Need help?</strong> Contact the reception desk upon arrival.</p>
                  <p style="margin:10px 0 0 0; font-size:12.5px; color:#94a3b8; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Automated message from <strong style="color:#64748b;">Campus Visitor Management System</strong></p>
                  <p style="margin:6px 0 0 0; font-size:11.5px; color:#94a3b8; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Do not reply to this email &middot; Ref: {{visit_id}}</p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>
\`\`\`

**Template Variables** - Verify these are detected:
   - `{{to_name}}`               Visitor's full name
   - `{{visit_id}}`              Unique visit reference ID
   - `{{visit_purpose}}`         Purpose of the visit
   - `{{host_name}}`             Name of the host
   - `{{approved_by}}`           Name of the person who approved
   - `{{qr_code}}`               URL of the QR code image
   - `{{status_approved}}`       Set to true to render the approved layout


### Visitor Denial Template
\`\`\`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Visit Request Not Approved</title>
</head>
<body style="margin:0; padding:0; background-color:#f0f2f7; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:#1a1f36;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f7; padding:28px 16px;">
  <tr>
    <td align="center">
      <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px; width:100%;">

        <!-- Status Badge -->
        <tr>
          <td style="padding-bottom:14px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fef2f2; border:1.5px solid #fca5a5; border-radius:10px;">
              <tr>
                <td style="padding:12px 18px;">
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-right:10px;">
                        <div style="width:10px; height:10px; border-radius:50%; background-color:#ef4444; display:inline-block;"></div>
                      </td>
                      <td style="font-size:13.5px; font-weight:600; color:#991b1b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
                        Visit Not Approved — Request Has Been Declined
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Card -->
        <tr>
          <td style="background-color:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.07);">

            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:linear-gradient(135deg, #7f1d1d 0%, #b91c1c 55%, #ef4444 100%); padding:36px 28px 32px;">
                  <div style="font-size:48px; line-height:1; margin-bottom:14px;">&#10060;</div>
                  <h1 style="margin:0 0 6px 0; font-size:23px; font-weight:700; color:#ffffff; letter-spacing:-0.3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Visit Request Declined</h1>
                  <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.75); font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Campus Visitor Management System</p>
                </td>
              </tr>
            </table>

            <!-- Body -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:30px 28px;">

                  <!-- Greeting -->
                  <p style="margin:0 0 10px 0; font-size:16px; color:#1a1f36; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Dear <strong>{{to_name}}</strong>,</p>
                  <p style="margin:0 0 26px 0; font-size:14.5px; color:#4a5578; line-height:1.7; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    We regret to inform you that your campus visit request has been reviewed and could not be approved at this time. Please see the details and reason below.
                  </p>

                  <!-- Denial Notice -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fef2f2; border:1.5px solid #fca5a5; border-radius:14px; margin-bottom:26px;">
                    <tr>
                      <td style="padding:20px 22px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td width="40" valign="top" style="font-size:26px; padding-right:14px; padding-top:2px;">&#128683;</td>
                            <td>
                              <p style="margin:0 0 6px 0; font-size:15px; font-weight:700; color:#991b1b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Visit Not Approved</p>
                              <p style="margin:0; font-size:13.5px; color:#b91c1c; line-height:1.65; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Your access request was declined by the approving authority. Please review the reason below and contact your host if you believe this was made in error.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Reason Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff7f7; border:1.5px solid #fca5a5; border-radius:14px; margin-bottom:26px;">
                    <tr>
                      <td style="padding:20px 22px;">
                        <p style="margin:0 0 8px 0; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#991b1b; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">&#128221; Reason for Denial</p>
                        <p style="margin:0; font-size:14px; color:#7f1d1d; line-height:1.7; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">{{denial_reason}}</p>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;">
                    <tr>
                      <td style="height:1px; background-color:#e9eaf0; font-size:0; line-height:0;">&nbsp;</td>
                    </tr>
                  </table>

                  <!-- Visit Details -->
                  <p style="margin:0 0 14px 0; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Visit Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; overflow:hidden;">
                    <tr>
                      <td style="padding:13px 18px; border-bottom:1px solid #eef0f6;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Visit ID</td>
                            <td style="font-size:13.5px; color:#1a1f36; font-weight:500; font-family:'Courier New', Courier, monospace;">{{visit_id}}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 18px; border-bottom:1px solid #eef0f6;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Purpose</td>
                            <td style="font-size:13.5px; color:#1a1f36; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">{{visit_purpose}}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 18px; border-bottom:1px solid #eef0f6;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Host</td>
                            <td style="font-size:13.5px; color:#1a1f36; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">{{host_name}}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 18px; border-bottom:1px solid #eef0f6;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Denied By</td>
                            <td style="font-size:13.5px; color:#1a1f36; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">{{denied_by}}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:13px 18px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="110" style="font-size:13px; color:#6b7280; font-weight:500; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Status</td>
                            <td style="font-size:13.5px; color:#b91c1c; font-weight:700; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">&#10060; Denied</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- What to do next -->
                  <p style="margin:26px 0 14px 0; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">What You Can Do</p>

                  <!-- Step 1 -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="top" style="padding-right:14px; padding-top:3px;">
                              <div style="width:26px; height:26px; border-radius:50%; background-color:#ef4444; color:#ffffff; font-size:13px; font-weight:700; text-align:center; line-height:26px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">1</div>
                            </td>
                            <td style="font-size:13.5px; color:#374151; line-height:1.5; padding-top:3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Review the reason for denial mentioned above carefully</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 2 -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="top" style="padding-right:14px; padding-top:3px;">
                              <div style="width:26px; height:26px; border-radius:50%; background-color:#ef4444; color:#ffffff; font-size:13px; font-weight:700; text-align:center; line-height:26px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">2</div>
                            </td>
                            <td style="font-size:13.5px; color:#374151; line-height:1.5; padding-top:3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Contact your host <strong>{{host_name}}</strong> directly to discuss and resolve the issue</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 3 -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; margin-bottom:8px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="top" style="padding-right:14px; padding-top:3px;">
                              <div style="width:26px; height:26px; border-radius:50%; background-color:#ef4444; color:#ffffff; font-size:13px; font-weight:700; text-align:center; line-height:26px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">3</div>
                            </td>
                            <td style="font-size:13.5px; color:#374151; line-height:1.5; padding-top:3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Submit a new visit request once the issue has been resolved</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Step 4 -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-radius:12px; margin-bottom:20px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td valign="top" style="padding-right:14px; padding-top:3px;">
                              <div style="width:26px; height:26px; border-radius:50%; background-color:#ef4444; color:#ffffff; font-size:13px; font-weight:700; text-align:center; line-height:26px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">4</div>
                            </td>
                            <td style="font-size:13.5px; color:#374151; line-height:1.5; padding-top:3px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">If you believe this denial was made in error, contact the reception desk for assistance</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Info Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb; border-left:4px solid #f59e0b; border-radius:10px;">
                    <tr>
                      <td style="padding:16px 18px;">
                        <p style="margin:0 0 5px 0; font-size:13.5px; font-weight:700; color:#b45309; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">&#128161; Please Note</p>
                        <p style="margin:0; font-size:13px; color:#78350f; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Do not attempt to enter campus without a valid approved QR code. Unauthorized entry is not permitted and may result in further restrictions.</p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fd; border-top:1px solid #e9eaf0;">
              <tr>
                <td align="center" style="padding:22px 28px;">
                  <p style="margin:0; font-size:12.5px; color:#94a3b8; line-height:1.7; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;"><strong style="color:#64748b;">Need help?</strong> Contact the reception desk for further assistance.</p>
                  <p style="margin:10px 0 0 0; font-size:12.5px; color:#94a3b8; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Automated message from <strong style="color:#64748b;">Campus Visitor Management System</strong></p>
                  <p style="margin:6px 0 0 0; font-size:11.5px; color:#94a3b8; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">Do not reply to this email &middot; Ref: {{visit_id}}</p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>

\`\`\`

**Template Variables** - Verify these are detected:
   - `{{to_name}}`               Visitor's full name
   - `{{visit_id}}`              Unique visit reference ID
   - `{{visit_purpose}}`         Purpose of the visit
   - `{{host_name}}`             Name of the host
   - `{{denied_by}}`             Name of the person who denied
   - `{{qr_code}}`               URL of the QR code image
   - `{{status_approved}}`       Set to false to render the approved layout


### Step 6: Update Your .env File

1. Open your `.env` file (create one if it doesn't exist)
2. Add these lines with your actual values:

\`\`\`env
# SUPABASE CONFIGURATION (REQUIRED)
# Get these from your Supabase project settings at https://app.supabase.com

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# EMAILJS CONFIGURATION (OPTIONAL)
# Get these from https://www.emailjs.com/

VITE_EMAILJS_SERVICE_ID=service_your-id-here
VITE_EMAILJS_PUBLIC_KEY=your-public-key-here
VITE_EMAILJS_TEMPLATE_ID=template_your-id-here           # Visitor registration confirmation email
VITE_EMAILJS_APPROVAL_TEMPLATE_ID=template_your-id-here  # Visitor approval email with active QR code
VITE_EMAILJS_DENIAL_TEMPLATE_ID=template_your-id-here    # Visitor denial email with voided QR code

# Vite dev server port
VITE_PORT=5174
\`\`\`

3. **Save the file**
4. **Restart your development server**:
   \`\`\`bash
   # Stop the current server (Ctrl+C)
   # Start it again
   npm run dev
   \`\`\`


## ✅ Verify It's Working

1. Go to your application
2. Navigate to **"Register Visitor"** page
3. Fill in the form with a **real email address** (use your own for testing)
4. Submit the form
5. Check your email inbox
6. You should receive an email with the QR code! 🎉

## 🐛 Troubleshooting

### Email Not Received?

1. **Check spam/junk folder**
2. **Verify credentials in `.env`**:
   - Service ID starts with `service_`
   - Template ID starts with `template_`
   - Public Key is alphanumeric
3. **Check browser console** for errors (F12)
4. **Verify EmailJS account** is active
5. **Check EmailJS dashboard** → "Email Log" for delivery status

### "Failed to send email" error?

1. **Restart dev server** after updating `.env`
2. **Check EmailJS quota** (free tier: 200 emails/month)
3. **Verify email service** is connected in EmailJS dashboard
4. **Test template** directly in EmailJS dashboard

### QR Code Not Showing in Email?

1. **Check email client** - some block images by default
2. **Click "Show Images"** in your email client
3. **Try different email client** (Gmail usually works best)


## 🔒 Security Notes

1. **Never commit `.env` to Git** - it's already in `.gitignore`
2. **Public Key is safe to expose** - it's meant to be public
3. **Service/Template IDs are safe** - they're not sensitive
4. **Email service credentials** are stored securely by EmailJS


## 📞 Support

- **EmailJS Documentation**: [https://www.emailjs.com/docs/](https://www.emailjs.com/docs/)

Happy emailing! 📧✨
