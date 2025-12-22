# Visitor Management System

This is a modern, real-time Visitor Management System designed to streamline the process of managing visitors in a corporate or campus environment. It provides a secure, efficient, and user-friendly way to track and manage visitor information, ensuring a smooth experience for both visitors and hosts.

## Table of Contents

*   [About the Project](#about-the-project)
*   [Key Features](#key-features)
*   [Technologies Used](#technologies-used)
*   [Project Structure](#project-structure)
*   [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation and Setup](#installation-and-setup)
*   [How to Use the Application](#how-to-use-the-application)
    *   [First-time Signup and Login](#first-time-signup-and-login)
    *   [User Roles](#user-roles)
    *   [Logging in as an Admin or Guard](#logging-in-as-an-admin-or-guard)
    *   [Public Request Visit (No Login Required)](#public-request-visit-no-login-required)
    *   [Registering a New Visitor (Authenticated Hosts)](#registering-a-new-visitor-authenticated-hosts)
*   [Database Schema & Security](#database-schema--security)
*   [Documentation](#documentation)

## About the Project

A modern digital visitor management system replacing paper-based processes. Features real-time updates, role-based access control, and automated notifications for managing visitors in corporate or campus environments.

## Key Features

*   **Real-time Updates:** The dashboard and visit logs are updated in real-time using Supabase's real-time capabilities.
*   **User Roles:** The application has three user roles: `admin`, `guard`, and `host`, each with different permissions and functionalities.
*   **Visitor Registration:** Hosts can register new visitors and request visits.
*   **Public Request Visit:** Anonymous users can request visits without authentication through a public form.
*   **Visit Approval:** Admins and guards can approve or deny visit requests.
*   **Dashboard:** A comprehensive dashboard that displays statistics about visits.
*   **User Management:** Admins can add, edit, and delete users.
*   **Public Display:** A public page that shows the real-time status of all visits.
*   **QR Code Generation:** Automatic QR code generation for approved visits with email notifications.

## Technologies Used

*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
*   **Supabase:** An open-source Firebase alternative for building secure and scalable applications.
*   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom user interfaces.
*   **Vite:** A fast build tool and development server for modern web projects.

## Project Structure

```
DBMS_Project/
├── docs/              # Documentation
├── public/            # Static assets
├── src/
│   ├── components/    # React components
│   ├── lib/          # Utilities and configurations
│   └── store/        # State management
├── Supabase/         # Database schema
└── ...               # Configuration files
```

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [npm](https://www.npmjs.com/)
*   A [Supabase](https://supabase.com/) account. If you don't have one, you can create one for free.

### Installation and Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ByteOps02/DBMS_Project.git
    cd DBMS_Project
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables (`.env` file):**

    Create a `.env` file in the root directory with your Supabase credentials:
    ```
    VITE_SUPABASE_URL="your-supabase-url"
    VITE_SUPABASE_ANON_KEY="your-anon-key"
    VITE_EMAILJS_SERVICE_ID="optional-service-id"
    VITE_EMAILJS_TEMPLATE_ID="optional-template-id"
    VITE_EMAILJS_PUBLIC_KEY="optional-public-key"
    ```
    Get your URL and Key from Supabase project settings (Settings > API). See [EMAILJS_SETUP.md](./docs/EMAILJS_SETUP.md) for email configuration.

4.  **Set up the database:**

    - Open Supabase SQL Editor
    - Copy the contents of `Supabase/visitor_management_schema.sql`
    - Paste and run the SQL to create all tables, policies, and triggers

5.  **Run the application:**

    ```bash
    npm run dev
    ```

    This will start the development server, and you can access the application in your browser at the URL provided in the terminal (usually `https://localhost:5173`).

## How to Use the Application

### First-time Signup and Login

1. Open the app in your browser (`https://localhost:5173`)
2. Click **Sign up**, fill in your details, and select a department
3. Sign in with your email and password (default role: **host**)

### User Roles

*   **Admin:** The superuser of the system. Admins have comprehensive control, including managing all users, viewing all visit logs, and approving/denying visits.
*   **Guard:** The security personnel of the system. Guards can view all visit logs and have the authority to approve, deny, or mark visits as complete.
*   **Host:** An employee or resident who can host visitors. Hosts can request visits for their visitors and view the status of their requested visits.

### Logging in as an Admin or Guard

To change a user's role:
1. Go to Supabase > Table Editor > `hosts` table
2. Find the user and change their `role` from "host" to "admin" or "guard"
3. Save and log in with the updated role

### Public Request Visit (No Login Required)

Anyone can submit a visit request without logging in:
1. Navigate to **Request Visit** page
2. Fill in visitor details (name, email, phone, purpose, check-in/out times)
3. Submit - request is created as "pending" and requires admin/guard approval
4. Email confirmation with QR code sent (if EmailJS configured)

### Registering a New Visitor (Authenticated Hosts)

Hosts can register visitors via the "Register Visitor" page:
- **Full name, email, phone, company** (company optional)
- **Photo** (optional)
- **Purpose of visit**
- **Host email** (must be an existing user)
- **Entity email** (optional - additional department)
- **Check-in/Check-out times** and **Valid until**
- **Notes** (optional)

## Database Schema & Security

The application uses **Row-Level Security (RLS)** policies to ensure data security:
- Anonymous users can create visit requests
- Authenticated users see their own data
- Admins/guards have full access

See `Supabase/visitor_management_schema.sql` for complete schema details including tables, policies, and triggers.

## Documentation

Additional documentation is available in the `docs/` folder:
*   **[EMAILJS_SETUP.md](./docs/EMAILJS_SETUP.md)** - Detailed EmailJS configuration guide
