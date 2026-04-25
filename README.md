## Overview
This project is a full-stack web application that helps organizations manage visitor access and tracking. It features real-time updates, role-based access control, automated QR code generation, and email notifications for approved visits. Built with React, TypeScript, and Supabase, it delivers a seamless experience across desktop and mobile devices with PWA support.

## Features

### Core Functionality
- **Real-time Updates:** Dashboard and visit logs updated instantly using Supabase real-time capabilities.
- **User Roles:** Four distinct roles with specific permissions:
  - **Visitor:** Register own visits, view visit history, track approval status, and manage personal profile.
  - **Host:** Register visitors, create visit requests, view visit logs, manage own visitors.
  - **Guard:** Approve/deny visit requests, scan QR codes for check-in/out at specific gates, monitor ongoing visits.
  - **Admin:** Full system access, user management (role assignment), analytics, bulk operations.
- **Advanced Visit Tracking:** Support for both **Single-Day** and **Multi-Day** passes with precise **Valid From** and **Valid Until** enforcement.
- **Visitor Registration:** Hosts can pre-register visitors with detailed information (name, email, phone, photo, ID proof).
- **Public Visit Request:** Anonymous users can request visits without authentication via public form.
- **Visit Approval Workflow:** Multi-stage process: `pending` → `approved`/`denied` → `checked-in` → `completed`.
- **QR Code System:** Automatic high-density QR code generation for approved visits with instant email delivery.
- **Email Notifications:** Automated emails via EmailJS with customizable templates for registration, approval, and denial.

### Security & Compliance
- **QR Scanner:** Integrated HTML5 scanner for security guards to verify visitor identity and validity in real-time.
- **Gate-Specific Logging:** Guards can select specific campus gates (Main, North, South, etc.) for check-in and check-out logs.
- **Blacklist Management:** Guard/Admin can block suspicious visitors with mandatory reason logging, preventing future registrations.
- **Identity Verification:** Mandatory photo and ID proof uploads during registration for enhanced campus security.

### Administrative Features
- **User Management:** Comprehensive panel to manage system users, including the ability to update roles (Admin/Guard/Host/Visitor).
- **Bulk Visitor Upload:** CSV import for batch visitor registrations with real-time validation.
- **Visit Logs:** Advanced filtering, search, and role-based data access.
- **Public Display:** Real-time lobby display screen for live campus traffic monitoring.

### Technical & UX Highlights
- **Performance Optimized:** Component-level memoization and optimized data fetching patterns (React.memo, custom hooks).
- **Mobile-First Experience:** 
  - **Slidable Bottom Navigation:** Horizontally slidable navbar for easy access to all features on mobile.
  - **PWA Support:** Installable, offline support, and auto-updating service workers.
- **Dark Mode:** Full native theme switching with persistent user preferences.
- **Role-Based Access Control (RBAC):** Database-level RLS (Row Level Security) and frontend guards ensuring data integrity.

## Authentication & Security Architecture

### Supabase Authentication
The system leverages **Supabase Auth** for robust, enterprise-grade user management. 
- **JWT-Based Sessions:** Authentication is handled using JSON Web Tokens (JWT). Upon login/signup, Supabase issues a JWT that is securely stored in `localStorage` and automatically refreshed by the Supabase client.
- **Stateless & Scalable:** By utilizing Supabase's built-in auth service, the application maintains a stateless architecture. There is no custom authentication middleware; instead, security is enforced at the database level.
- **Identity Management:** Supports traditional Email/Password login and Signup, as well as Google OAuth integration.
- **Row-Level Security (RLS):** Data access is strictly controlled via PostgreSQL RLS policies. The Supabase JWT is passed with every request, allowing the database to verify the user's identity and role before granting access to any data.

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI framework with type safety |
| **Build Tool** | Vite | Fast development and production builds |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | Radix UI + shadcn/ui | Accessible, unstyled component library |
| **Backend/Database** | Supabase | PostgreSQL database, Auth, Real-time subscriptions |
| **State Management** | Zustand | Lightweight state management (Auth store) |
| **Form Handling** | React Hook Form + Zod | Form management with schema validation |
| **Routing** | React Router v6 | Client-side routing with nested routes |
| **Email Service** | EmailJS | Email delivery with custom templates |
| **QR Code** | qrcode + react-qr-code | QR code generation and display |
| **QR Scanning** | html5-qrcode | Browser-based QR code scanning |
| **CSV Processing** | PapaParse | Parse and process CSV files |
| **Date Utilities** | date-fns | Date manipulation and formatting |
| **UI Notifications** | react-hot-toast | Sleek toast notifications system |
| **Icons** | Lucide React | Consistent icon library |
| **PWA** | vite-plugin-pwa | Progressive Web App support |

## Project Structure

```
Visitor-Management-System/
├── supabase/
│   └── migrations/                       # Database schema and RLS policies
│
├── src/
│   ├── App.tsx                           # Main application component with routing
│   ├── components/                       # UI Components (Dashboard, Logs, Scanner, etc.)
│   ├── hooks/                            # Custom hooks (Visit Registration, Stats)
│   ├── lib/                              # Supabase config, IST Date utils, Logger
│   ├── store/                            # Global state (Auth/Zustand)
│   └── index.css                         # Tailwind & Global Styles
│
└── Configuration Files                   # Vite, TS, Tailwind, PWA configs
```

## Installation & Setup

1. **Clone & Install:**
   ```bash
   git clone https://github.com/ram02krishna/Visitor-Management-System.git
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file with your Supabase and EmailJS credentials:
   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_EMAILJS_SERVICE_ID=...
   VITE_EMAILJS_PUBLIC_KEY=...
   VITE_EMAILJS_TEMPLATE_ID=...
   ```

3. **Database Setup:**
   Apply the SQL schema provided in `supabase/migrations/full_visitor_management_schema.sql` to your Supabase project.

4. **Run:**
   ```bash
   npm run dev
   ```

## Author

**ram02krishna**
- GitHub: [@ram02krishna](https://github.com/ram02krishna)
- Repository: [Visitor-Management-System](https://github.com/ram02krishna/Visitor-Management-System)
