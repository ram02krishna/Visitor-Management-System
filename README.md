# Visitor Management System

A modern, real-time Visitor Management System designed to streamline the process of managing visitors in a corporate or campus environment. It provides a secure, efficient, and user-friendly way to track and manage visitor information, ensuring a smooth experience for both visitors and hosts.

## 🎯 Overview

This project is a full-stack web application that helps organizations manage visitor access and tracking. It features real-time updates, role-based access control, automated QR code generation, and email notifications for approved visits.

## ✨ Features

### Core Functionality
- **Real-time Updates:** Dashboard and visit logs updated instantly using Supabase real-time capabilities
- **User Roles:** Three distinct roles with specific permissions:
  - **Host:** Register visitors, create visit requests, view visit logs
  - **Guard:** Approve/deny visit requests, manage QR code check-ins
  - **Admin:** Full system access, user management, analytics
- **Visitor Registration:** Hosts can pre-register visitors with detailed information
- **Public Visit Request:** Anonymous users can request visits without authentication
- **Visit Approval Workflow:** Multi-stage approval process for visit requests
- **QR Code Generation:** Automatic QR codes for approved visits with email delivery
- **Email Notifications:** Automated emails via EmailJS with QR codes attached

### Administrative Features
- **Dashboard Analytics:** Real-time statistics on visits, users, and trends
- **User Management:** Add, edit, delete users with role assignment
- **Bulk Visitor Upload:** CSV import for multiple visitor registrations
- **Data Export:** Export visit logs and visitor data in CSV/JSON formats
- **Visit Logs:** Comprehensive filtering and search capabilities
- **Public Display:** Real-time visitor status display for lobby screens

### Technical Features
- **QR Code Scanning:** Built-in QR code scanner for check-in/check-out
- **Ongoing Visits Tracking:** Monitor active visitor sessions
- **Public Analytics Display:** Public-facing visitor status information
- **Role-Based Guard:** Component-level access control
- **Error Handling:** Comprehensive error boundaries and error logging
- **Dark Mode Support:** Full theme switching capability

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | [React 18](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **UI Framework** | [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Component Library** | [shadcn/ui](https://ui.shadcn.com/) |
| **Backend/Database** | [Supabase](https://supabase.io/) (PostgreSQL + Real-time + Auth) |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Form Handling** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Routing** | [React Router v6](https://reactrouter.com/) |
| **Email Service** | [EmailJS](https://www.emailjs.com/) |
| **QR Code** | [qrcode](https://github.com/davidshimjs/qrcodejs) + [react-qr-code](https://github.com/rosskhanas/react-qr-code) |
| **QR Scanning** | [html5-qrcode](https://github.com/mebjas/html5-qrcode) |
| **Charts** | [Recharts](https://recharts.org/) |
| **CSV Processing** | [PapaParse](https://www.papaparse.com/) |
| **Date Utilities** | [date-fns](https://date-fns.org/) |
| **Notifications** | [react-hot-toast](https://react-hot-toast.com/), [Sonner](https://sonner.emilkowal.ski/), [react-toastify](https://fkhadra.github.io/react-toastify/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Code Quality** | [ESLint](https://eslint.org/), [Prettier](https://prettier.io/) |
| **Testing** | [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/react) |
| **PWA** | [vite-plugin-pwa](https://vite-plugin-pwa.netlify.app/) |

## 📦 Project Structure

```
DBMS_Project/
├── components/                      # Reusable UI components (shadcn/ui)
│   ├── ui/                         # UI components (button, card, dialog, etc.)
│   └── theme-provider.tsx          # Theme provider component
├── src/
│   ├── App.tsx                     # Main app component with routing
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Global styles
│   ├── vite-env.d.ts              # Vite environment types
│   ├── registerSW.ts              # Service worker registration (PWA)
│   ├── components/                 # Feature components
│   │   ├── Layout.tsx             # Main layout wrapper
│   │   ├── Login.tsx              # Login page
│   │   ├── Signup.tsx             # Registration page
│   │   ├── Dashboard.tsx          # Admin/Guard dashboard
│   │   ├── VisitorRegistration.tsx    # Visitor registration form
│   │   ├── VisitLogs.tsx          # Visit history and logs
│   │   ├── VisitorApproval.tsx    # Approval queue
│   │   ├── UserManagement.tsx     # User admin panel
│   │   ├── BulkVisitorUpload.tsx  # CSV bulk upload
│   │   ├── ExportData.tsx         # Data export functionality
│   │   ├── ScanQrCode.tsx         # QR code scanner
│   │   ├── OngoingVisits.tsx      # Active visit tracking
│   │   ├── PublicDisplay.tsx      # Lobby display screen
│   │   ├── AnalyticsDashboard.tsx # Analytics page
│   │   ├── VisitDetailsModal.tsx  # Visit details modal
│   │   ├── ErrorBoundary.tsx      # Error handling
│   │   ├── RoleBasedGuard.tsx     # Role access control
│   │   └── dashboards/            # Dashboard-specific components
│   ├── hooks/                      # Custom React hooks
│   │   ├── useVisitStats.ts       # Visit statistics hook
│   │   ├── useHostStats.ts        # Host statistics hook
│   │   ├── useGuardStats.ts       # Guard statistics hook
│   │   ├── useScanQrCode.ts       # QR code scanning logic
│   │   ├── use-debounce.ts        # Debounce utility hook
│   │   ├── use-mobile.ts          # Mobile detection hook
│   │   └── use-toast.ts           # Toast notification hook
│   ├── lib/                        # Utilities and configurations
│   │   ├── supabase.ts            # Supabase client initialization
│   │   ├── utils.ts               # Utility functions
│   │   ├── database.types.ts      # TypeScript database types
│   │   └── logger.ts              # Logging utility
│   ├── store/                      # Zustand state management
│   │   └── auth.ts                # Authentication store
│   └── tests/                      # Test files
├── docs/
│   ├── EMAILJS_SETUP.md           # EmailJS configuration guide
├── Supabase/
│   └── visitor_management_schema.sql    # Database schema
├── public/                         # Static assets
│   └── manifest.webmanifest       # PWA manifest
├── styles/
│   └── globals.css                # Additional global styles
├── vite.config.ts                 # Vite configuration
├── vitest.config.ts               # Vitest configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
├── tsconfig.json                  # TypeScript configuration
├── eslint.config.js               # ESLint configuration
├── components.json                # shadcn/ui components config
├── index.html                     # HTML entry point
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) version 18 or later
- [pnpm](https://pnpm.io/) package manager (or npm/yarn)
- A [Supabase](https://supabase.com/) account (free tier available)
- (Optional) EmailJS account for email notifications

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ByteOps02/DBMS_Project.git
   cd DBMS_Project
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```
   Or with npm:
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
   VITE_EMAILJS_TEMPLATE_ID=your-emailjs-template-id
   VITE_EMAILJS_PUBLIC_KEY=your-emailjs-public-key
   ```

4. **Set up Supabase Database:**
   - Log in to your [Supabase Dashboard](https://app.supabase.com)
   - Open the SQL Editor
   - Copy the entire content from `Supabase/visitor_management_schema.sql`
   - Paste and execute the SQL to create all tables, policies, and triggers
   - Ensure your timezone is set correctly (IST by default in schema)

5. **Configure EmailJS (Optional but recommended):**
   - Follow the detailed guide in [docs/EMAILJS_SETUP.md](docs/EMAILJS_SETUP.md)
   - This enables automated email notifications with QR codes

6. **Start the development server:**
   ```bash
   pnpm run dev
   ```
   The application will be available at `http://localhost:5174`

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start development server with hot reload |
| `pnpm run build` | Build for production |
| `pnpm run preview` | Preview production build locally |
| `pnpm run lint` | Run ESLint to check code quality |
| `pnpm run lint:fix` | Automatically fix ESLint issues |
| `pnpm run format` | Format code with Prettier |
| `pnpm run format:check` | Check if code is properly formatted |
| `pnpm run type-check` | Check TypeScript types without emitting |
| `pnpm run validate` | Run type-check, lint, and format-check together |
| `pnpm run clean` | Remove build artifacts and cache |

## 📖 Usage Guide

### For Visitors
1. Access the public visit request form
2. Fill in your details (name, email, phone, company, purpose)
3. Select the host/department you're visiting
4. Submit the request
5. Wait for approval (you'll receive an email with a QR code)
6. Present QR code at the entrance for check-in

### For Hosts
1. Sign up with your email and password (default role: `host`)
2. Pre-register visitors with their information
3. Create visit requests for anticipated visitors
4. View visit logs and active visits on your dashboard
5. Track visitor check-in/check-out times

### For Guards
1. Access the approval queue to review pending visit requests
2. Approve or deny requests
3. Use QR code scanner to check visitors in/out
4. Monitor ongoing visits in real-time
5. View analytics and visit statistics

### For Admins
1. Access the complete admin dashboard
2. Manage user accounts and roles
3. View system-wide analytics
4. Export data in CSV/JSON formats
5. Upload bulk visitor lists via CSV
6. Configure system settings and policies

## 🗄️ Database Architecture

### Tables
- **hosts:** User accounts (admins, guards, hosts)
- **visitors:** Visitor information and details
- **visits:** Visit records with status tracking
- **departments:** Organization departments/entities
- **audit_logs:** Activity logging for compliance

### Row-Level Security (RLS)
- Anonymous users: Can only create visit requests
- Authenticated hosts: Can view/manage their own visits and pre-registrations
- Authenticated guards/admins: Can manage all visits and user approvals
- All users: Limited to their role-specific actions

See [Supabase/visitor_management_schema.sql](Supabase/visitor_management_schema.sql) for complete schema details.

## 🔐 Security Features

- **Role-Based Access Control (RBAC):** Three-tier user hierarchy
- **Row-Level Security (RLS):** Database-level access policies
- **Email Verification:** Email-based authentication via Supabase
- **Password Security:** Secure password hashing
- **QR Code Validation:** Time-limited QR codes for visits
- **Audit Logging:** Activity tracking for compliance
- **CORS Protection:** Configured Supabase CORS rules
- **HTTPS/TLS:** All communications encrypted

## 🌙 Theme Support

The application includes full dark mode support with:
- System theme detection
- Manual theme switching via `ThemeSwitcher` component
- Tailwind CSS dark mode classes
- Persistent theme preference storage

## 📱 Progressive Web App (PWA)

This application is configured as a PWA with:
- Offline support via Service Worker
- App installation capability
- Responsive design for all devices
- Fast loading times

## 🧪 Testing

Run tests with:
```bash
pnpm run test
```

Tests are located alongside components with `.test.ts` or `.test.tsx` extensions.

## 📊 Environment Details

- **Node Version:** 18+
- **TypeScript:** Latest stable
- **React:** 18.3.1
- **Vite:** Latest
- **Tailwind CSS:** Latest with forms plugin
- **Supabase:** PostgreSQL database

## 🐛 Troubleshooting

### Database Connection Issues
- Verify Supabase URL and keys in `.env`
- Check network connectivity
- Ensure SQL schema has been executed

### Email Notifications Not Working
- Verify EmailJS configuration in `.env`
- Check EmailJS service limits and quota
- Review email template configuration

### QR Code Scanning Problems
- Ensure camera permissions are granted
- Test with different browsers (Chrome/Edge recommended)
- Check lighting conditions

### Authentication Issues
- Clear browser cache and cookies
- Verify Supabase authentication settings
- Check user role in Supabase `hosts` table

## 📚 Documentation

- [EmailJS Setup Guide](docs/EMAILJS_SETUP.md) - Email notification configuration
- [Security Policy](SECURITY.md) - Security guidelines and procedures
- [Supabase Schema](Supabase/visitor_management_schema.sql) - Database schema documentation

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code:
- Passes all linting checks (`pnpm run lint`)
- Is properly formatted (`pnpm run format`)
- Has no TypeScript errors (`pnpm run type-check`)

## 👤 Author

**ByteOps02**
- GitHub: [@ByteOps02](https://github.com/ByteOps02)
- Repository: [DBMS_Project](https://github.com/ByteOps02/DBMS_Project)

## 💬 Contact & Support

For issues, questions, or suggestions:
- Open an [Issue](https://github.com/ByteOps02/DBMS_Project/issues)
- Submit a [Pull Request](https://github.com/ByteOps02/DBMS_Project/pulls)
- Visit the [Discussions](https://github.com/ByteOps02/DBMS_Project/discussions) tab

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Supabase](https://supabase.io/) for backend infrastructure
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- All contributors and maintainers

---