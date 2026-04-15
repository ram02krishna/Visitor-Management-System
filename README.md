# IIIT Nagpur Visitor Management System

The official modern, real-time Visitor Management System of Indian Institute of Information Technology, Nagpur (IIITN). Designed to streamline the process of managing visitors in a campus environment. It provides a secure, efficient, and user-friendly way to track and manage visitor information, ensuring a smooth experience for both visitors and staff.

## Overview

This project is a full-stack web application that helps organizations manage visitor access and tracking. It features real-time updates, role-based access control, automated QR code generation, and email notifications for approved visits. Built with React, TypeScript, and Supabase, it delivers a seamless experience across desktop and mobile devices with PWA support.

## Features

### Core Functionality
- **Real-time Updates:** Dashboard and visit logs updated instantly using Supabase real-time capabilities
- **User Roles:** Three distinct roles with specific permissions:
  - **Host:** Register visitors, create visit requests, view visit logs, manage own visitors
  - **Guard:** Approve/deny visit requests, manage QR code check-ins, scan visitor credentials
  - **Admin:** Full system access, user management, analytics, bulk operations
- **Visitor Registration:** Hosts can pre-register visitors with detailed information (name, email, phone)
- **Public Visit Request:** Anonymous users can request visits without authentication via public form
- **Visit Approval Workflow:** Multi-stage approval process (pending → approved/denied → checked-in → completed)
- **QR Code Generation:** Automatic QR codes for approved visits with email delivery
- **Email Notifications:** Automated emails via EmailJS with customizable templates and QR code attachments

### Administrative Features
- **User Management:** Create, edit, delete users with role assignment and department management
- **Bulk Visitor Upload:** CSV import for batch visitor registrations with validation
- **Visit Logs:** Comprehensive filtering, search, and sorting capabilities with role-based view
- **Public Display:** Real-time visitor status display for lobby screens (check-in/check-out updates)

### Technical Features
- **QR Code Scanning:** Built-in HTML5 QR code scanner for check-in/check-out
- **Ongoing Visits Tracking:** Monitor active visitor sessions in real-time
- **Public Analytics Display:** Public-facing visitor status information
- **Role-Based Access Control:** Component-level access control with RoleBasedGuard
- **Error Handling:** Comprehensive error boundaries and structured error logging
- **Dark Mode Support:** Full theme switching capability with persistent preferences
- **Progressive Web App (PWA):** Offline support, installable, auto-updating
- **Responsive Design:** Mobile-first design with adaptive layouts
- **Data Validation:** Zod-based form validation for all inputs
- **Secure Authentication:** Supabase Auth with session persistence

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
| **UI Notifications** | Sonner + react-hot-toast + react-toastify | Toast notifications system |
| **Icons** | Lucide React | Consistent icon library |
| **Code Quality** | ESLint + Prettier | Linting and code formatting |
| **Type Checking** | TypeScript | Static type checking |
| **Testing** | Vitest + React Testing Library | Unit and component testing |
| **PWA** | vite-plugin-pwa | Progressive Web App support |
| **HTTPS Dev** | vite-plugin-mkcert | Self-signed certificates for local HTTPS |

## Project Structure

```
Visitor-Management-System/
├── components/                           # Reusable shadcn/ui components
│   ├── ui/                               # Radix UI-based components (60+ components)
│   │   ├── button.tsx, card.tsx, dialog.tsx, form.tsx, input.tsx
│   │   ├── table.tsx, tabs.tsx, select.tsx, checkbox.tsx
│   │   └── Other UI elements (badge, avatar, breadcrumb, tooltip, etc.)
│   └── theme-provider.tsx                # Dark mode and theme management
│
├── src/
│   ├── App.tsx                           # Main application component with routing
│   ├── main.tsx                          # Application entry point
│   ├── index.css                         # Global CSS styles
│   ├── vite-env.d.ts                     # Vite environment type definitions
│   ├── registerSW.ts                     # Service worker registration for PWA
│   │
│   ├── components/                       # Feature-specific React components
│   │   ├── Layout.tsx                    # Main layout wrapper with sidebar/navbar
│   │   ├── Home.tsx                      # Landing/home page
│   │   ├── Login.tsx                     # User login with email/password
│   │   ├── Signup.tsx                    # New user registration
│   │   ├── Dashboard.tsx                 # Role-based dashboard (Admin/Guard/Host)
│   │   ├── StatsGrid.tsx & StatItem.tsx  # Statistics display components
│   │   ├── VisitorRegistration.tsx       # Register new visitors (Host feature)
│   │   ├── PreRegisterVisitor.tsx        # Pre-registration form
│   │   ├── BulkVisitorUpload.tsx         # CSV bulk import for multiple visitors
│   │   ├── VisitLogs.tsx                 # Complete visit history and records
│   │   ├── FilteredVisits.tsx            # Advanced filtering component
│   │   ├── OngoingVisitsCard.tsx         # Display currently active visits
│   │   ├── ScanQrCode.tsx                # QR code scanner for check-in/out
│   │   ├── RequestVisit.tsx              # Public visit request form
│   │   ├── PublicDisplay.tsx             # Real-time lobby display screen
│   │   ├── UserManagement.tsx            # Admin panel for user management
│   │   ├── BackButton.tsx                # Navigation back button component
│   │   ├── StatusIndicator.tsx           # Visit status badge component
│   │   ├── ThemeSwitcher.tsx             # Dark/light mode toggle
│   │   ├── RoleBasedGuard.tsx            # Role-based access control HOC
│   │   └── ErrorBoundary.tsx             # Error boundary for error handling
│   │
│   ├── hooks/                            # Custom React hooks
│   │   ├── useVisitStats.ts              # Fetch and manage visit statistics
│   │   ├── use-debounce.ts               # Debounce utility for inputs
│   │   ├── use-mobile.ts                 # Mobile device detection
│   │   └── use-toast.ts                  # Toast notification hook
│   │
│   ├── lib/                              # Utility functions and configurations
│   │   ├── supabase.ts                   # Supabase client initialization
│   │   ├── database.types.ts             # TypeScript types for DB tables/enums
│   │   ├── logger.ts                     # Structured logging utility
│   │   ├── utils.ts                      # Common helper functions
│   │   ├── validators.ts                 # Zod schemas for form validation
│   │   └── navigation.ts                 # Navigation path constants
│   │
│   ├── store/                            # Global state management
│   │   └── auth.ts                       # Authentication state (Zustand)
│   │
│   └── styles/
│       └── globals.css                   # Global stylesheet
│
├── docs/                                 # Documentation
│   └── EMAILJS_SETUP.md                  # EmailJS configuration guide
│
├── Configuration Files
│   ├── package.json                      # Dependencies and npm scripts
│   ├── tsconfig.json                     # TypeScript configuration
│   ├── vite.config.ts                    # Vite build configuration
│   ├── tailwind.config.js                # Tailwind CSS configuration
│   ├── postcss.config.js                 # PostCSS configuration
│   ├── eslint.config.js                  # ESLint rules
│   ├── components.json                   # shadcn/ui configuration
│   ├── vercel.json                       # Vercel deployment config
│   └── index.html                        # HTML entry point
```

### Database Schema (Supabase PostgreSQL)

**Tables:**
- **hosts** - User accounts (Admin, Guard, Host)
  - id, auth_id, name, email, department_id, role, active, created_at, updated_at
- **visitors** - Visitor information
  - id, name, email, phone, photo_url, created_at, updated_at
- **visits** - Visit records and tracking
  - id, visitor_id, host_id, purpose, status, check_in_time, check_out_time, valid_until, notes, created_at, updated_at
- **departments** - Organization departments
  - id, name, created_at, updated_at

**Enums:**
- **user_role**: admin, guard, host
- **visit_status**: pending, approved, denied, completed, cancelled, checked-in

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ram02krishna/Visitor-Management-System.git
   cd Visitor-Management-System
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration (Required)
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anonymous-key

   # EmailJS Configuration (Optional)
   VITE_EMAILJS_SERVICE_ID=your-emailjs-service-id
   VITE_EMAILJS_PUBLIC_KEY=your-emailjs-public-key
   VITE_EMAILJS_TEMPLATE_ID=your-emailjs-template-id
   ```

4. **Set up Supabase Database:**
   - Create a new Supabase project
   - Navigate to the SQL Editor
   - Create tables for: `hosts`, `visitors`, `visits`, and `departments`
   - Enable Row-Level Security (RLS) policies
   - Set up authentication

5. **Configure EmailJS (Optional):**
   - Follow the setup guide in [docs/EMAILJS_SETUP.md](docs/EMAILJS_SETUP.md)

6. **Start development server:**
   ```bash
   npm run dev
   ```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Automatically fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run type-check` | Check TypeScript types |
| `npm run validate` | Run all validation checks |
| `npm run validate:fix` | Fix all validation issues |
| `npm run clean` | Remove build artifacts |
| `npm run security:audit` | Check for vulnerable packages |



### For Visitors
1. Fill out public visit request form
2. Provide your details and select host/purpose
3. Wait for approval (email notification with QR code)
4. Present QR code at entrance for check-in

### For Hosts
1. Sign up with email and password
2. Pre-register visitors
3. Create visit requests
4. View visit logs and check-in/out times
5. Manage visitor records

### For Guards
1. Review pending visit requests
2. Approve or deny requests
3. Scan QR codes for check-in/out
4. Monitor ongoing visits
5. View analytics

### For Admins
1. Access complete admin dashboard
2. Manage user accounts and roles
3. View system-wide analytics
4. Bulk upload visitors via CSV
5. Export data

## Security Features

- **Role-Based Access Control (RBAC):** Three-tier user hierarchy
- **Row-Level Security (RLS):** Database-enforced policies
- **Email Authentication:** Supabase Auth
- **Password Hashing:** Industry-standard encryption
- **Time-Limited QR Codes:** Validity date enforcement
- **Audit Logging:** Activity tracking
- **HTTPS/TLS:** All communications encrypted
- **Session Management:** Auto-refresh tokens

## UI/UX Components

- **60+ UI Components:** Buttons, cards, dialogs, tables, forms, etc.
- **Dark Mode:** Full theme switching support
- **Responsive:** Mobile-first design
- **Accessible:** WCAG 2.1 AA compliant
- **Tailwind CSS:** Utility-first styling

## Progressive Web App (PWA)

- **Offline Support:** Works without internet
- **Installable:** Add to home screen
- **Auto-Update:** Service worker handles updates
- **Fast:** Optimized caching strategies
- **Responsive:** Works on all devices

## Theme Support

- **System Detection:** Automatically detects OS theme preference
- **Manual Toggle:** ThemeSwitcher component for user control
- **Persistent:** Remembers user preference
- **Dark Mode Classes:** Tailwind dark mode support

## Testing

```bash
npm run test           # Run tests
npm run test:watch    # Watch mode
npm run test:ui       # UI mode
```

## Troubleshooting

### Supabase Connection Failed
- Verify `.env` variables
- Check project is active
- Test network connectivity

### Emails Not Sending
- Verify EmailJS credentials
- Check service quota
- Review template configuration

### QR Scanner Issues
- Grant camera permissions
- Test in Chrome/Edge
- Check lighting

### Build Errors
- Clear `node_modules`: `npm install`
- Run `npm run clean`
- Check `npm run type-check`

## Author

**ram02krishna**
- GitHub: [@ram02krishna](https://github.com/ram02krishna)
- Repository: [Visitor-Management-System](https://github.com/ram02krishna/Visitor-Management-System)