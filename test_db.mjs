import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://orvxjlhadgryymqjmcai.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydnhqbGhhZGdyeXltcWptY2FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NjM2NDksImV4cCI6MjA3NzUzOTY0OX0.0Fyat8CiBsJKu9hT0TUGV-uyiZ4bXKPCiC87XskG2kg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: hosts } = await supabase.from('hosts').select('*');
  console.log("ALL HOSTS:", hosts?.map(h => ({ name: h.name, email: h.email, role: h.role })));
}

run();
