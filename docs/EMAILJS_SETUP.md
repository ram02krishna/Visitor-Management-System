# EmailJS Setup Guide

This guide will walk you through setting up EmailJS for automated visitor email notifications with QR codes.

---

## 📋 Prerequisites

- An email account (Gmail, Outlook, Yahoo, etc.)
- 5-10 minutes of setup time

---

## 🚀 Step-by-Step Setup

### Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up"** (top right)
3. Choose **"Sign up with Google"** or use email
4. Verify your email address
5. Complete registration

---

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

---

### Step 3: Create Email Template

1. Go to **"Email Templates"** in the left sidebar
2. Click **"Create New Template"**
3. **Template Name**: "Visitor Registration QR Code"
4. **Template Content**: Copy and paste this HTML:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
        }
        .qr-container {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .qr-code {
            max-width: 250px;
            height: auto;
            border: 3px solid #0ea5e9;
            border-radius: 10px;
            padding: 10px;
            background: white;
        }
        .details {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #0ea5e9;
        }
        .detail-row {
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #0ea5e9;
            display: inline-block;
            width: 140px;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
            background: #f9fafb;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎫 Your Visit is Confirmed!</h1>
        <p>Campus Visitor Management System</p>
    </div>
    
    <div class="content">
        <p>Dear <strong>{{to_name}}</strong>,</p>
        
        <p>Your visit has been successfully registered! Please use the QR code below for a quick and contactless check-in.</p>
        
        <div class="qr-container">
            <h3 style="color: #0ea5e9; margin-top: 0;">Your Visit QR Code</h3>
            <img src="{{qr_code}}" alt="Visit QR Code" class="qr-code">
            <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">
                Save this QR code or show it on your phone during check-in
            </p>
        </div>
        
        <div class="details">
            <h3 style="color: #0ea5e9; margin-top: 0;">Visit Details</h3>
            
            <div class="detail-row">
                <span class="label">Visit ID:</span>
                <span>{{visit_id}}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Purpose:</span>
                <span>{{visit_purpose}}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Host:</span>
                <span>{{host_name}}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Valid Until:</span>
                <span>{{valid_until}}</span>
            </div>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>📱 Pro Tip:</strong> Save this email or take a screenshot of the QR code for easy access during your visit.
        </div>
        
        <p style="margin-top: 30px;">
            <strong>What to do on arrival:</strong>
        </p>
        <ol style="line-height: 2;">
            <li>Show your QR code at the reception/security desk</li>
            <li>Wait for verification</li>
            <li>Receive your visitor badge</li>
            <li>Proceed to meet your host</li>
        </ol>
    </div>
    
    <div class="footer">
        <p>If you have any questions, please contact the reception desk.</p>
        <p style="font-size: 12px; color: #9ca3af;">
            This is an automated message from the Campus Visitor Management System.
        </p>
    </div>
</body>
</html>
\`\`\`

5. **Subject Line**: Enter this:
   \`\`\`
   Your Visit Confirmation & QR Code - {{visit_purpose}}
   \`\`\`

6. **Template Variables** - Verify these are detected:
   - `{{to_name}}`
   - `{{qr_code}}`
   - `{{visit_id}}`
   - `{{visit_purpose}}`
   - `{{host_name}}`
   - `{{valid_until}}`

7. Click **"Save"**
8. **Copy your Template ID** (e.g., `template_xyz5678`)
   - Save this - you'll need it for `.env`

---

### Step 4: Get Your Public Key

1. Click on your **account name** (top right)
2. Go to **"Account"** → **"General"**
3. Find **"Public Key"** section
4. **Copy your Public Key** (e.g., `AbC123XyZ456`)
   - Save this - you'll need it for `.env`

---

### Step 5: Test Your Template (Optional but Recommended)

1. Go back to **"Email Templates"**
2. Click on your template
3. Click **"Test It"** button
4. Fill in test values:
   - `to_name`: Your Name
   - `qr_code`: Use this test QR: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TEST`
   - `visit_id`: TEST-123
   - `visit_purpose`: Meeting
   - `host_name`: John Doe
   - `valid_until`: 2025-12-31 5:00 PM
5. Enter your email address
6. Click **"Send Test Email"**
7. Check your inbox - you should receive the email!

---

### Step 6: Update Your .env File

1. Open your `.env` file (create one if it doesn't exist)
2. Add these lines with your actual values:

\`\`\`env
# Supabase Configuration (you should already have these)
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID="service_abc1234"      # Replace with your Service ID
VITE_EMAILJS_TEMPLATE_ID="template_xyz5678"    # Replace with your Template ID
VITE_EMAILJS_PUBLIC_KEY="AbC123XyZ456"         # Replace with your Public Key
\`\`\`

3. **Save the file**
4. **Restart your development server**:
   \`\`\`bash
   # Stop the current server (Ctrl+C)
   # Start it again
   npm run dev
   \`\`\`

---

## ✅ Verify It's Working

1. Go to your application
2. Navigate to **"Register Visitor"** page
3. Fill in the form with a **real email address** (use your own for testing)
4. Submit the form
5. Check your email inbox
6. You should receive an email with the QR code! 🎉

---

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

---

## 💰 EmailJS Pricing

### Free Tier (Perfect for Testing/Small Projects)
- ✅ 200 emails per month
- ✅ 2 email templates
- ✅ All features included
- ✅ No credit card required

### Paid Plans (If You Need More)
- **Personal**: $7/month - 1,000 emails
- **Professional**: $15/month - 10,000 emails
- **Enterprise**: Custom pricing

---

## 🔒 Security Notes

1. **Never commit `.env` to Git** - it's already in `.gitignore`
2. **Public Key is safe to expose** - it's meant to be public
3. **Service/Template IDs are safe** - they're not sensitive
4. **Email service credentials** are stored securely by EmailJS

---

## 📧 Email Template Customization

Want to customize the email? Edit the template in EmailJS dashboard:

- **Change colors**: Modify the CSS in `<style>` section
- **Add logo**: Insert `<img>` tag in header
- **Modify content**: Edit the HTML structure
- **Change subject**: Update subject line in template settings

---

## 🎯 Next Steps

After setup:
1. ✅ Test with your own email
2. ✅ Test with a colleague's email
3. ✅ Customize the template to match your branding
4. ✅ Monitor email delivery in EmailJS dashboard
5. ✅ Consider upgrading if you need more than 200 emails/month

---

## 📞 Support

- **EmailJS Documentation**: [https://www.emailjs.com/docs/](https://www.emailjs.com/docs/)
- **EmailJS Support**: support@emailjs.com
- **Project Issues**: Check IMPROVEMENTS.md and QUICKSTART.md

---

**Setup Time**: ~10 minutes  
**Difficulty**: Easy ⭐⭐☆☆☆  
**Cost**: Free (for up to 200 emails/month)

Happy emailing! 📧✨
