# Visitor Management System

This is a modern, real-time Visitor Management System designed to streamline the process of managing visitors in a corporate or campus environment. It provides a secure, efficient, and user-friendly way to track and manage visitor information, ensuring a smooth experience for both visitors and hosts.

## Features

-   **Real-time Updates:** The dashboard and visit logs are updated in real-time using Supabase's real-time capabilities.
-   **User Roles:** The application has three user roles: `admin`, `guard`, and `host`, each with different permissions and functionalities.
-   **Visitor Registration:** Hosts can register new visitors and request visits.
-   **Public Request Visit:** Anonymous users can request visits without authentication through a public form.
-   **Visit Approval:** Admins and guards can approve or deny visit requests.
-   **Dashboard:** A comprehensive dashboard that displays statistics about visits.
-   **User Management:** Admins can add, edit, and delete users.
-   **Public Display:** A public page that shows the real-time status of all visits.
-   **QR Code Generation:** Automatic QR code generation for approved visits with email notifications.

## Tech Stack

| Category          | Technology                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Frontend**      | [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Styling**       | [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [shadcn/ui](https://ui.shadcn.com/) |
| **Backend**       | [Supabase](https://supabase.io/) (PostgreSQL, Authentication, Real-time Database)                       |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/)                                                               |
| **Form Management** | [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)                               |
| **Routing**       | [React Router](https://reactrouter.com/)                                                               |
| **Linting**       | [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)                                         |

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [pnpm](https://pnpm.io/)
-   A [Supabase](https://supabase.com/) account.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/ByteOps02/DBMS_Project.git
    cd DBMS_Project
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Set up environment variables (`.env` file):
    Create a `.env` file in the root directory with your Supabase credentials:
    ```
    VITE_SUPABASE_URL="your-supabase-url"
    VITE_SUPABASE_ANON_KEY="your-anon-key"
    VITE_EMAILJS_SERVICE_ID="optional-service-id"
    VITE_EMAILJS_TEMPLATE_ID="optional-template-id"
    VITE_EMAILJS_PUBLIC_KEY="optional-public-key"
    ```
4.  Set up the database:
    -   Go to the Supabase SQL Editor.
    -   Copy the content of `Supabase/visitor_management_schema.sql`.
    -   Paste and run the SQL to create the tables, policies, and triggers.
5.  Run the application:
    ```bash
    pnpm run dev
    ```

## Project Structure

```
DBMS_Project/
├── docs/              # Documentation
├── public/            # Static assets
├── src/
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utilities and configurations
│   └── store/         # State management
├── Supabase/          # Database schema
└── ...                # Configuration files
```

## Usage

1.  **Sign up** with your email and password. Your default role will be `host`.
2.  To get `admin` or `guard` access, you need to change the role in the `hosts` table in your Supabase database.
3.  As a `host`, you can pre-register visitors and create visit requests.
4.  As an `admin` or `guard`, you can approve or deny visit requests.
5.  The public display page shows the real-time status of all visits.

## Database

The database is hosted on Supabase and uses PostgreSQL. The schema is defined in `Supabase/visitor_management_schema.sql`.

### Row-Level Security (RLS)

The application uses RLS to ensure data privacy.
-   Anonymous users can only create visit requests.
-   Authenticated users can only access their own data.
-   `admin` and `guard` roles have elevated privileges to manage all visits and users.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.

## Contact

-   GitHub: [ByteOps02](https://github.com/ByteOps02)
