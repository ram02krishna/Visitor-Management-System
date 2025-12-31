--  ENUM Creation (duplicate safe)
DO $$ BEGIN
  CREATE TYPE visit_status AS ENUM ('pending', 'approved', 'denied', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'guard', 'host');
EXCEPTION WHEN duplicate_object THEN null; END $$;

--  TABLES
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) UNIQUE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  department_id uuid REFERENCES departments(id),
  role user_role NOT NULL DEFAULT 'host',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(email, phone)
);

CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid REFERENCES visitors(id),
  host_id uuid REFERENCES hosts(id),
  purpose text NOT NULL,
  status visit_status DEFAULT 'pending',
  approved_at timestamptz,
  check_in_time timestamptz,
  check_out_time timestamptz,
  valid_until timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

--  Add entity_id column if it doesn't exist (for compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visits' AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE visits ADD COLUMN entity_id uuid;
  END IF;
END $$;

--  Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

--  Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Departments readable" ON departments;
DROP POLICY IF EXISTS "departments_select_all" ON departments;
DROP POLICY IF EXISTS "departments_admin_all" ON departments;

DROP POLICY IF EXISTS "Users can insert themselves as hosts" ON hosts;
DROP POLICY IF EXISTS "Users can view only their own host record" ON hosts;
DROP POLICY IF EXISTS "Hosts read access for self, admin, and guard" ON hosts;
DROP POLICY IF EXISTS "Admins have full access on hosts" ON hosts;
DROP POLICY IF EXISTS "Guards can view all host records" ON hosts;
DROP POLICY IF EXISTS "hosts_insert_self" ON hosts;
DROP POLICY IF EXISTS "hosts_select_own_or_privileged" ON hosts;
DROP POLICY IF EXISTS "hosts_update_admin_only" ON hosts;
DROP POLICY IF EXISTS "hosts_delete_admin_only" ON hosts;

DROP POLICY IF EXISTS "Visitors insert allowed" ON visitors;
DROP POLICY IF EXISTS "Visitors read allowed" ON visitors;
DROP POLICY IF EXISTS "Visitors update by guard/admin" ON visitors;
DROP POLICY IF EXISTS "visitors_insert_authenticated" ON visitors;
DROP POLICY IF EXISTS "visitors_insert_public" ON visitors;
DROP POLICY IF EXISTS "visitors_select_authenticated" ON visitors;
DROP POLICY IF EXISTS "visitors_update_privileged" ON visitors;
DROP POLICY IF EXISTS "visitors_update_public" ON visitors;
DROP POLICY IF EXISTS "visitors_update_public_or_privileged" ON visitors;
DROP POLICY IF EXISTS "visitors_delete_admin_only" ON visitors;

DROP POLICY IF EXISTS "Visits insert allowed" ON visits;
DROP POLICY IF EXISTS "Visits read allowed" ON visits;
DROP POLICY IF EXISTS "Hosts can see their own visits" ON visits;
DROP POLICY IF EXISTS "Admins and guards can see all visits" ON visits;
DROP POLICY IF EXISTS "Visits update by guard/admin/host" ON visits;
DROP POLICY IF EXISTS "visits_insert_authenticated" ON visits;
DROP POLICY IF EXISTS "visits_insert_public" ON visits;
DROP POLICY IF EXISTS "visits_select_own_or_privileged" ON visits;
DROP POLICY IF EXISTS "visits_update_host_or_privileged" ON visits;
DROP POLICY IF EXISTS "visits_delete_admin_only" ON visits;

--  Drop and recreate helper functions (fix SECURITY DEFINER issue)
DROP FUNCTION IF EXISTS is_admin(uuid);
DROP FUNCTION IF EXISTS is_guard(uuid);

CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM hosts WHERE auth_id = user_id AND role = 'admin' AND active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_guard(user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM hosts WHERE auth_id = user_id AND role = 'guard' AND active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- DEPARTMENTS Policies
CREATE POLICY "departments_select_all"
  ON departments FOR SELECT
  USING (true);

CREATE POLICY "departments_admin_all"
  ON departments FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- HOSTS Policies
CREATE POLICY "hosts_insert_self"
  ON hosts FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "hosts_select_own_or_privileged"
  ON hosts FOR SELECT
  USING (
    auth.uid() = auth_id OR
    is_admin(auth.uid()) OR
    is_guard(auth.uid())
  );

CREATE POLICY "hosts_update_admin_only"
  ON hosts FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "hosts_delete_admin_only"
  ON hosts FOR DELETE
  USING (is_admin(auth.uid()));

-- VISITORS Policies
-- Allow public inserts for request-visit functionality (unauthenticated users)
CREATE POLICY "visitors_insert_public"
  ON visitors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "visitors_select_authenticated"
  ON visitors FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow public updates for request-visit functionality (updating existing visitor info)
-- Also allow privileged users (admin/guard) to update
CREATE POLICY "visitors_update_public_or_privileged"
  ON visitors FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "visitors_delete_admin_only"
  ON visitors FOR DELETE
  USING (is_admin(auth.uid()));

-- VISITS Policies
-- Allow public inserts for request-visit functionality (unauthenticated users)
CREATE POLICY "visits_insert_public"
  ON visits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "visits_select_own_or_privileged"
  ON visits FOR SELECT
  USING (
    -- Host can see their own visits
    EXISTS (SELECT 1 FROM hosts WHERE hosts.id = visits.host_id AND hosts.auth_id = auth.uid())
    OR
    -- Admins can see all
    is_admin(auth.uid())
    OR
    -- Guards can see all
    is_guard(auth.uid())
  );

CREATE POLICY "visits_update_host_or_privileged"
  ON visits FOR UPDATE
  USING (
    -- Host can update their own visits
    EXISTS (SELECT 1 FROM hosts WHERE hosts.id = visits.host_id AND hosts.auth_id = auth.uid())
    OR
    -- Admins can update all
    is_admin(auth.uid())
    OR
    -- Guards can update all
    is_guard(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM hosts WHERE hosts.id = visits.host_id AND hosts.auth_id = auth.uid())
    OR
    is_admin(auth.uid())
    OR
    is_guard(auth.uid())
  );

CREATE POLICY "visits_delete_admin_only"
  ON visits FOR DELETE
  USING (is_admin(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_host_id ON visits(host_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_entity_id ON visits(entity_id);
CREATE INDEX IF NOT EXISTS idx_hosts_email ON hosts(email);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_hosts_auth_id ON hosts(auth_id);
CREATE INDEX IF NOT EXISTS idx_hosts_role ON hosts(role);
CREATE INDEX IF NOT EXISTS idx_hosts_active ON hosts(active);

-- Updated_at automation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
DROP TRIGGER IF EXISTS update_hosts_updated_at ON hosts;
DROP TRIGGER IF EXISTS update_visitors_updated_at ON visitors;
DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;

CREATE TRIGGER update_departments_updated_at 
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hosts_updated_at 
  BEFORE UPDATE ON hosts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at 
  BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at 
  BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Default Departments
INSERT INTO departments (name) VALUES
  ('Administration'), 
  ('Faculty'), 
  ('Security'),
  ('IT Department'), 
  ('Facilities')
ON CONFLICT (name) DO NOTHING;
